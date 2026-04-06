from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router
from users.auth import TokenAuth
from users.models import Friendship, User
from users.schemas import UserOut

from .enums import Actions
from .models import Alarm, AlarmEvent, Group, ManualRing
from .schemas import (
    AddMemberRequest,
    AlarmCreate,
    AlarmEventOut,
    AlarmOut,
    AlarmUpdate,
    GroupCreate,
    GroupOut,
    GroupUpdate,
    LeaderboardEntry,
    ManualRingOut,
)
from .utils import send_group_push, send_wake_up_push

router = Router()

# ==========================================
# Group CRUD
# ==========================================


@router.post("/group/", response=GroupOut, auth=TokenAuth())
def create_group(request, payload: GroupCreate):
    group = Group.objects.create(name=payload.name)
    group.members.add(request.auth)
    return group


@router.get("/group/", response=list[GroupOut], auth=TokenAuth())
def list_groups(request):
    return list(Group.objects.filter(members=request.auth))


@router.put(
    "/group/{group_id}/",
    response={200: GroupOut, 403: None, 404: None},
    auth=TokenAuth(),
)
def update_group(request, group_id: str, payload: GroupUpdate):
    group = get_object_or_404(Group, id=group_id)

    if request.auth not in group.members.all():
        return 403, None

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(group, field, value)

    group.save()
    return 200, group


@router.get(
    "/group/{group_id}/members/",
    response={200: list[UserOut], 403: None},
    auth=TokenAuth(),
)
def list_group_members(request, group_id: str):
    group = get_object_or_404(Group, id=group_id)

    if request.auth not in group.members.all():
        return 403, None

    return 200, list(group.members.all())


@router.post(
    "/group/{group_id}/join/", response={200: GroupOut, 403: None}, auth=TokenAuth()
)
def join_group(request, group_id: str):
    group = get_object_or_404(Group, id=group_id)

    group.members.add(request.auth)

    return 200, group


@router.post(
    "/group/{group_id}/leave/", response={204: None, 403: None}, auth=TokenAuth()
)
def leave_group(request, group_id: str):
    with transaction.atomic():
        group = get_object_or_404(Group.objects.select_for_update(), id=group_id)

        if request.auth not in group.members.all():
            return 403, None

        group.members.remove(request.auth)

        Alarm.objects.filter(user=request.auth, group=group).delete()

        if group.members.count() == 0:
            group.delete()

    return 204, None


@router.post(
    "/group/{group_id}/add-member/",
    response={200: GroupOut, 403: dict, 404: dict},
    auth=TokenAuth(),
)
def add_member_to_group(request, group_id: str, payload: AddMemberRequest):
    group = get_object_or_404(Group, id=group_id)

    if not group.members.filter(id=request.auth.id).exists():
        return 403, {"error": "You are not a member of this group"}

    target = User.objects.filter(id=payload.user_id).first()
    if not target:
        return 404, {"error": "User not found"}

    # Verify they are friends
    is_friend = Friendship.objects.filter(
        Q(from_user=request.auth, to_user=target)
        | Q(from_user=target, to_user=request.auth),
        status=Friendship.Status.ACCEPTED,
    ).exists()

    if not is_friend:
        return 403, {"error": "You can only add friends to groups"}

    group.members.add(target)

    send_group_push(
        users=[target],
        action=Actions.GROUP_MEMBER_ADDED,
        data={"group_id": str(group.id), "group_name": group.name},
    )

    return 200, group


@router.get(
    "/group/{group_id}/alarms/",
    response={200: list[AlarmOut], 403: None},
    auth=TokenAuth(),
)
def list_group_alarms(request, group_id: str):
    group = get_object_or_404(Group, id=group_id)

    if request.auth not in group.members.all():
        return 403, None

    return 200, list(Alarm.objects.filter(group=group))


@router.get(
    "/group/{group_id}/leaderboard/",
    response={200: list[LeaderboardEntry], 403: None},
    auth=TokenAuth(),
)
def group_leaderboard(request, group_id: str):
    group = get_object_or_404(Group, id=group_id)

    if not group.members.filter(id=request.auth.id).exists():
        return 403, None

    members = group.members.all()
    group_alarm_ids = list(Alarm.objects.filter(group=group).values_list("id", flat=True))

    entries = []
    for member in members:
        events = list(AlarmEvent.objects.filter(
            user=member, alarm_id__in=group_alarm_ids
        ).values("status", "created_at", "checked_in_at"))

        total = len(events)
        on_time = sum(
            1 for e in events
            if e["status"] == AlarmEvent.Status.CHECKED_IN
            and e["checked_in_at"] is not None
            and (e["checked_in_at"] - e["created_at"]) <= timedelta(minutes=5)
        )

        entries.append(LeaderboardEntry(
            user_id=member.id,
            display_name=member.display_name,
            username=member.username,
            total_events=total,
            on_time_checkins=on_time,
            success_rate=round(on_time / total * 100, 1) if total > 0 else 100.0,
        ))

    entries.sort(key=lambda e: (-e.success_rate, -e.on_time_checkins))
    return 200, entries


# ==========================================
# Alarm CRUD
# ==========================================


@router.post("/alarm/", response=AlarmOut, auth=TokenAuth())
def create_alarm(request, payload: AlarmCreate):
    group = get_object_or_404(Group, id=payload.group_id)

    if not group.members.filter(id=request.auth.id).exists():
        return 403, {
            "error": "You cannot assign an alarm to a group you are not a member of."
        }

    clean_time = payload.time.replace(second=0, microsecond=0, tzinfo=None)
    alarm = Alarm.objects.create(
        name=payload.name,
        time=clean_time,
        repeats=payload.repeats,
        is_one_time=payload.is_one_time,
        user_id=request.auth.id,
        group_id=payload.group_id,
        sound_filename=payload.sound_filename,
    )
    return alarm


@router.get("/alarm/", response=list[AlarmOut], auth=TokenAuth())
def list_alarms(request, group_id: str | None = None):
    qs = Alarm.objects.filter(user=request.auth)
    if group_id:
        qs = qs.filter(group_id=group_id)
    return list(qs)


@router.delete("/alarm/{alarm_id}/", response={204: None}, auth=TokenAuth())
def delete_alarm(request, alarm_id: str):
    alarm = get_object_or_404(Alarm, id=alarm_id)

    if alarm.user.id != request.auth.id:
        return 403, None

    alarm.delete()

    return 204, None


@router.put("/alarm/{alarm_id}/", response=AlarmOut, auth=TokenAuth())
def update_alarm(request, alarm_id: str, payload: AlarmUpdate):
    alarm = get_object_or_404(Alarm, id=alarm_id)

    if alarm.user.id != request.auth.id:
        return 403, None

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "time":
            value = value.replace(second=0, microsecond=0, tzinfo=None)

        setattr(alarm, field, value)

    alarm.save()
    return alarm


# ==========================================
# Alarm State Machine Operations
# ==========================================


@router.post(
    "/alarm/{alarm_id}/trigger/",
    response={200: ManualRingOut, 403: dict, 409: dict, 404: None, 429: dict},
    auth=TokenAuth(),
)
def trigger_alarm(request, alarm_id: str):
    with transaction.atomic():
        alarm = get_object_or_404(Alarm.objects.select_for_update(), id=alarm_id)

        if not alarm.group.members.filter(id=request.auth.id).exists():
            return 403, {"error": "You are not in this alarm's group"}

        event = (
            AlarmEvent.objects.filter(alarm=alarm)
            .select_for_update()
            .order_by("-created_at")
            .first()
        )

        if not event:
            return 409, {
                "error": f"{alarm.user.display_name}'s alarm hasn't gone off yet!"
            }
        elif event.status == AlarmEvent.Status.CHECKED_IN:
            return 409, {"error": f"{alarm.user.display_name} already checked in!"}
        if event.status == AlarmEvent.Status.RINGING:
            return 409, {"error": "They are currently being rung! Give them a second."}
        recent_ring = ManualRing.objects.filter(
            alarm=alarm, created_at__gte=timezone.now() - timedelta(seconds=10)
        ).exists()

        if recent_ring:
            return 429, {
                "error": "This user is already being rung! Give them a second."
            }

        manual_ring = ManualRing.objects.create(
            alarm=alarm,
            ringer=request.auth,
        )

    success = send_wake_up_push(user=alarm.user, ringer_name=request.auth.display_name)

    if not success:
        print(
            f"Failed to ring {alarm.user.display_name}. They may be logged out or deleted the app."
        )

    return 200, manual_ring


@router.get(
    "/alarm/{alarm_id}/event/",
    response={200: AlarmEventOut, 204: None, 403: dict},
    auth=TokenAuth(),
)
def get_latest_event(request, alarm_id: str):
    alarm = get_object_or_404(Alarm, id=alarm_id)

    is_owner = alarm.user == request.auth
    is_group_member = alarm.group and alarm.group.members.filter(id=request.auth.id).exists()

    if not is_owner and not is_group_member:
        return 403, {"error": "You do not have access to this alarm"}

    event = AlarmEvent.objects.filter(alarm=alarm).order_by("-created_at").first()

    if not event:
        return 204, None

    return 200, event


@router.post(
    "/alarm/{alarm_id}/check_in/",
    response={200: dict, 404: None, 403: dict, 409: dict},
    auth=TokenAuth(),
)
def check_in_alarm(request, alarm_id: str):
    with transaction.atomic():
        alarm = get_object_or_404(Alarm.objects.select_for_update(), id=alarm_id)

        if alarm.user != request.auth:
            return 403, {"error": "You do not have access to this event!"}

        event = (
            AlarmEvent.objects.filter(alarm=alarm)
            .select_for_update()
            .order_by("-created_at")
            .first()
        )

        if not event:
            return 404, None
        if event.status == AlarmEvent.Status.CHECKED_IN:
            return 409, {"error": "Already checked in"}

        event.status = AlarmEvent.Status.CHECKED_IN
        event.checked_in_at = timezone.now()
        event.save(update_fields=["status", "checked_in_at"])

    group_members = alarm.group.members.exclude(id=alarm.user.id)
    data_payload = {
        "event_id": str(event.id),
        "alarm_id": str(alarm.id),
    }

    success = send_group_push(
        users=group_members, action=Actions.CHECKED_IN, data=data_payload
    )

    return 200, {"message": f"Checked in for {event.alarm.name}"}


@router.post(
    "/alarm/{alarm_id}/ring/",
    response={200: dict, 403: dict, 409: dict, 404: None},
    auth=TokenAuth(),
)
def ring_alarm(request, alarm_id: str):
    with transaction.atomic():
        alarm = get_object_or_404(Alarm.objects.select_for_update(), id=alarm_id)

        if alarm.user != request.auth:
            return 403, {"error": "You do not have access to this alarm."}

        recent_threshold = timezone.now() - timedelta(minutes=2)
        existing_event = AlarmEvent.objects.filter(
            alarm=alarm,
            created_at__gte=recent_threshold,
            status=AlarmEvent.Status.RINGING,
        ).exists()

        if existing_event:
            return 409, {"error": "An active event already exists for this alarm."}

        event = AlarmEvent.objects.create(alarm=alarm, user=alarm.user)

        if alarm.is_one_time:
            alarm.is_active = False
            alarm.save(update_fields=["is_active"])
        else:
            new_trigger = alarm.calculate_next_trigger(
                now_override=timezone.now() + timedelta(minutes=2)
            )
            Alarm.objects.filter(pk=alarm.pk).update(next_trigger_utc=new_trigger)

    group_members = alarm.group.members.exclude(id=alarm.user.id)
    data_payload = {
        "event_id": str(event.id),
        "alarm_id": str(alarm.id),
        "created_at": event.created_at.isoformat(),
    }

    success = send_group_push(group_members, Actions.RINGING, data_payload)

    return 200, {
        "message": "Alarm event created. 5-minute countdown started.",
        "event_id": str(event.id),
    }
