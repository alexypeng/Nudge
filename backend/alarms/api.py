import logging
import uuid
from datetime import timedelta

from django.db import transaction
from django.db.models import Count, F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError
from users.auth import TokenAuth
from users.models import Friendship, User
from users.schemas import UserOut

from .enums import Actions
from .models import LATE_CHECK_IN_CUTOFF, ON_TIME_WINDOW, Alarm, AlarmEvent, Group, ManualRing
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
from .utils import send_group_push, send_ring_push

logger = logging.getLogger(__name__)

router = Router()

# ==========================================
# Group CRUD
# ==========================================


@router.post("/group/", response=GroupOut, auth=TokenAuth())
def create_group(request, payload: GroupCreate):
    group = Group.objects.create(name=payload.name, icon=payload.icon)
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
def update_group(request, group_id: uuid.UUID, payload: GroupUpdate):
    group = get_object_or_404(Group, id=group_id)

    if request.auth not in group.members.all():
        return 403, None

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(group, field, value)

    group.save()

    other_members = group.members.exclude(id=request.auth.id)
    send_group_push(other_members, Actions.GROUP_UPDATED, data={"group_id": str(group.id)})

    return 200, group


@router.get(
    "/group/{group_id}/members/",
    response={200: list[UserOut], 403: None},
    auth=TokenAuth(),
)
def list_group_members(request, group_id: uuid.UUID):
    group = get_object_or_404(Group, id=group_id)

    if request.auth not in group.members.all():
        return 403, None

    return 200, list(group.members.all())


@router.post(
    "/group/{group_id}/leave/", response={204: None, 403: None}, auth=TokenAuth()
)
def leave_group(request, group_id: uuid.UUID):
    with transaction.atomic():
        group = get_object_or_404(Group.objects.select_for_update(), id=group_id)

        if request.auth not in group.members.all():
            return 403, None

        group.members.remove(request.auth)

        Alarm.objects.filter(user=request.auth, group=group).delete()

        remaining = group.members.all()
        if remaining.exists():
            send_group_push(remaining, Actions.GROUP_MEMBER_LEFT, data={"group_id": str(group.id)})

        if group.members.count() == 0:
            group.delete()

    return 204, None


@router.post(
    "/group/{group_id}/add-member/",
    response={200: GroupOut, 403: dict, 404: dict},
    auth=TokenAuth(),
)
def add_member_to_group(request, group_id: uuid.UUID, payload: AddMemberRequest):
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
def list_group_alarms(request, group_id: uuid.UUID):
    group = get_object_or_404(Group, id=group_id)

    if request.auth not in group.members.all():
        return 403, None

    return 200, list(Alarm.objects.filter(group=group))


@router.get(
    "/group/{group_id}/leaderboard/",
    response={200: list[LeaderboardEntry], 403: None},
    auth=TokenAuth(),
)
def group_leaderboard(request, group_id: uuid.UUID):
    group = get_object_or_404(Group, id=group_id)

    if not group.members.filter(id=request.auth.id).exists():
        return 403, None

    counts = {
        row["user_id"]: row
        for row in AlarmEvent.objects.filter(alarm__group=group)
        .values("user_id")
        .annotate(
            total=Count("id"),
            on_time=Count(
                "id",
                filter=Q(
                    status=AlarmEvent.Status.CHECKED_IN,
                    checked_in_at__lte=F("scheduled_for") + ON_TIME_WINDOW,
                ),
            ),
        )
    }

    entries = []
    for member in group.members.all():
        row = counts.get(member.id, {})
        total = row.get("total", 0)
        on_time = row.get("on_time", 0)

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
        raise HttpError(403, "You cannot assign an alarm to a group you are not a member of.")

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

    group_members = group.members.exclude(id=request.auth.id)
    send_group_push(group_members, Actions.ALARM_CREATED,
        data={"alarm_id": str(alarm.id), "group_id": str(group.id)})

    return alarm


@router.get("/alarm/", response=list[AlarmOut], auth=TokenAuth())
def list_alarms(request, group_id: uuid.UUID | None = None):
    qs = Alarm.objects.filter(user=request.auth)
    if group_id:
        qs = qs.filter(group_id=group_id)
    return list(qs)


@router.delete("/alarm/{alarm_id}/", response={204: None}, auth=TokenAuth())
def delete_alarm(request, alarm_id: uuid.UUID):
    alarm = get_object_or_404(Alarm, id=alarm_id)

    if alarm.user_id != request.auth.id:
        raise HttpError(403, "You can only delete your own alarms.")

    group_members = alarm.group.members.exclude(id=request.auth.id)
    send_group_push(group_members, Actions.ALARM_DELETED,
        data={"alarm_id": str(alarm.id), "group_id": str(alarm.group_id)})

    alarm.delete()

    return 204, None


@router.put("/alarm/{alarm_id}/", response=AlarmOut, auth=TokenAuth())
def update_alarm(request, alarm_id: uuid.UUID, payload: AlarmUpdate):
    alarm = get_object_or_404(Alarm, id=alarm_id)

    if alarm.user_id != request.auth.id:
        raise HttpError(403, "You can only edit your own alarms.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "time":
            value = value.replace(second=0, microsecond=0, tzinfo=None)

        setattr(alarm, field, value)

    # Hide the previous ringing/missed status from the UI without rewriting it:
    # a miss before the edit still counts on the leaderboard.
    alarm.schedule_changed_at = timezone.now()
    alarm.save()

    group_members = alarm.group.members.exclude(id=request.auth.id)
    send_group_push(group_members, Actions.ALARM_UPDATED,
        data={"alarm_id": str(alarm.id), "group_id": str(alarm.group_id)})

    return alarm


# ==========================================
# Alarm State Machine Operations
# ==========================================


@router.post(
    "/alarm/{alarm_id}/trigger/",
    response={200: ManualRingOut, 403: dict, 409: dict, 404: None, 429: dict},
    auth=TokenAuth(),
)
def trigger_alarm(request, alarm_id: uuid.UUID):
    with transaction.atomic():
        alarm = get_object_or_404(Alarm.objects.select_for_update(), id=alarm_id)

        if not alarm.group.members.filter(id=request.auth.id).exists():
            return 403, {"error": "You are not in this alarm's group"}

        event = (
            AlarmEvent.objects.filter(alarm=alarm)
            .select_for_update()
            .order_by("-scheduled_for")
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

    success = send_ring_push(user=alarm.user, ringer_name=request.auth.display_name)

    if not success:
        logger.info("Could not ring user %s; no active devices received the push", alarm.user_id)

    return 200, manual_ring


@router.get(
    "/alarm/{alarm_id}/event/",
    response={200: AlarmEventOut, 204: None, 403: dict},
    auth=TokenAuth(),
)
def get_latest_event(request, alarm_id: uuid.UUID):
    alarm = get_object_or_404(Alarm, id=alarm_id)

    is_owner = alarm.user == request.auth
    is_group_member = alarm.group and alarm.group.members.filter(id=request.auth.id).exists()

    if not is_owner and not is_group_member:
        return 403, {"error": "You do not have access to this alarm"}

    event = AlarmEvent.objects.filter(alarm=alarm).order_by("-scheduled_for").first()

    if not event or (alarm.schedule_changed_at and event.scheduled_for < alarm.schedule_changed_at):
        return 204, None

    return 200, event


@router.post(
    "/alarm/{alarm_id}/ring/",
    response={200: dict, 403: dict, 409: dict, 404: None},
    auth=TokenAuth(),
)
def ring_alarm(request, alarm_id: uuid.UUID):
    # Deprecated: the scheduler now records rings at the alarm time. Kept as a no-op so app
    # builds that still call it when an alarm fires keep working. Remove once they're gone.
    alarm = get_object_or_404(Alarm, id=alarm_id)

    if alarm.user != request.auth:
        return 403, {"error": "You do not have access to this alarm."}

    event = AlarmEvent.objects.filter(alarm=alarm).order_by("-scheduled_for").first()

    return 200, {
        "message": "Rings are recorded by the server at the alarm time.",
        "event_id": str(event.id) if event else None,
    }


@router.post(
    "/alarm/{alarm_id}/check_in/",
    response={200: dict, 404: None, 403: dict, 409: dict},
    auth=TokenAuth(),
)
def check_in_alarm(request, alarm_id: uuid.UUID):
    with transaction.atomic():
        alarm = get_object_or_404(Alarm.objects.select_for_update(), id=alarm_id)

        if alarm.user != request.auth:
            return 403, {"error": "You do not have access to this event!"}

        event = (
            AlarmEvent.objects.filter(alarm=alarm)
            .select_for_update()
            .order_by("-scheduled_for")
            .first()
        )

        now = timezone.now()

        if not event:
            return 404, None
        if event.status == AlarmEvent.Status.CHECKED_IN:
            return 409, {"error": "Already checked in"}
        if now - event.scheduled_for > LATE_CHECK_IN_CUTOFF:
            return 409, {"error": "You missed this one. Tomorrow's another shot!"}

        event.status = AlarmEvent.Status.CHECKED_IN
        event.checked_in_at = now
        event.save(update_fields=["status", "checked_in_at"])

    group_members = alarm.group.members.exclude(id=alarm.user.id)
    data_payload = {
        "event_id": str(event.id),
        "alarm_id": str(alarm.id),
    }

    send_group_push(users=group_members, action=Actions.CHECKED_IN, data=data_payload)

    return 200, {"message": f"Checked in for {event.alarm.name}", "on_time": event.is_on_time()}


