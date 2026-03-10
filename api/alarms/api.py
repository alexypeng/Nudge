from firebase_admin.messaging import send
from django.utils import timezone
from ninja import Router
from .models import Group, Alarm, AlarmEvent, ManualRing
from .schemas import ManualRingOut, GroupOut, GroupCreate, GroupUpdate, AlarmOut, AlarmCreate, AlarmUpdate
from users.auth import TokenAuth
from django.shortcuts import get_object_or_404
from django.db import transaction
from .utils import send_wake_up_push


router = Router()

# ==========================================
# Group CRUD
# ==========================================


@router.post("/groups/", response=GroupOut, auth=TokenAuth())
def create_group(request, payload: GroupCreate):
    group = Group.objects.create(name=payload.name)
    group.members.add(request.auth)
    return group


@router.get("/groups/", response=list[GroupOut], auth=TokenAuth())
def list_groups(request):
    return list(Group.objects.filter(members=request.auth))


@router.put("/groups/{group_id}/", response=GroupOut, auth=TokenAuth())
def update_group(request, group_id: str, payload: GroupUpdate):
    group = get_object_or_404(Group, id=group_id)

    if request.auth not in group.members.all():
        return 403, None

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(group, field, value)

    group.save()
    return group


@router.post("/groups/{group_id}/join/", response={200: GroupOut, 403: None}, auth=TokenAuth())
def join_group(request, group_id: str):
    group = get_object_or_404(Group, id=group_id)

    group.members.add(request.auth)

    return 200, group


@router.post("/groups/{group_id}/leave/", response={204: None, 403: None}, auth=TokenAuth())
def leave_group(request, group_id: str):
    group = get_object_or_404(Group, id=group_id)

    if request.auth not in group.members.all():
        return 403, None

    group.members.remove(request.auth)
    if group.members.count() == 0:
        group.delete()

    return 204, None


# ==========================================
# Alarm CRUD
# ==========================================


@router.post("/alarms/", response=AlarmOut, auth=TokenAuth())
def create_alarm(request, payload: AlarmCreate):
    group = get_object_or_404(Group, id=payload.group_id)

    if not group.members.filter(id=request.auth.id).exists():
        return 403, {"error": "You cannot assign an alarm to a group you are not a member of."}

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


@router.get("/alarms/", response=list[AlarmOut], auth=TokenAuth())
def list_alarms(request):
    return list(Alarm.objects.filter(user=request.auth))


@router.delete("/alarms/{alarm_id}/", response={204: None}, auth=TokenAuth())
def delete_alarm(request, alarm_id: str):
    alarm = get_object_or_404(Alarm, id=alarm_id)

    if alarm.user.id != request.auth.id:
        return 403, None

    alarm.delete()

    return 204, None


@router.put("/alarms/{alarm_id}/", response=AlarmOut, auth=TokenAuth())
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
    "/alarms/{alarm_id}/trigger/", response={200: ManualRingOut, 403: dict, 409: dict, 404: None}, auth=TokenAuth()
)
def trigger_alarm(request, alarm_id: str):
    with transaction.atomic():
        alarm = get_object_or_404(Alarm.objects.select_for_update(), id=alarm_id)

        if not alarm.group.members.filter(id=request.auth.id).exists():
            return 403, {"error": "You are not in this alarm's group"}

        event = AlarmEvent.objects.filter(alarm=alarm).order_by("-created_at").first()

        if not event:
            return 409, {"error": f"{alarm.user.display_name}'s alarm hasn't gone off yet!"}
        elif event.status == AlarmEvent.Status.CHECKED_IN:
            return 409, {"error": f"{alarm.user.display_name} already checked in!"}
        if event.status == AlarmEvent.Status.RINGING:
            return 409, {"error": "They are currently being rung! Give them a second."}
        if event.status == AlarmEvent.Status.SILENCED:
            return 409, {"error": "The user is in their 5-minute grace period."}

        manual_ring = ManualRing.objects.create(
            alarm=alarm,
            ringer=request.auth,
        )

    success = send_wake_up_push(user=alarm.user, ringer_name=request.auth.display_name)

    if not success:
        print(f"Failed to ring {alarm.user.display_name}. They may be logged out or deleted the app.")

    return 200, manual_ring


@router.post("/alarms/{alarm_id}/check_in/", response={200: dict, 404: None, 403: dict, 409: dict}, auth=TokenAuth())
def check_in_alarm(request, alarm_id: str):
    alarm = get_object_or_404(Alarm, id=alarm_id)

    if alarm.user != request.auth:
        return 403, {"error": "You do not have access to this event!"}

    event = AlarmEvent.objects.filter(alarm=alarm).order_by("-created_at").first()

    if not event:
        return 404, None
    if event.status == AlarmEvent.Status.CHECKED_IN:
        return 409, {"error": "Already checked in"}

    event.status = AlarmEvent.Status.CHECKED_IN
    event.checked_in_at = timezone.now()
    event.save(update_fields=["status", "checked_in_at"])

    return 200, {"message": f"Checked in for {event.alarm.name}"}


@router.post("/alarms/{alarm_id}/silence/", response={200: dict, 403: dict, 404: None, 409: dict}, auth=TokenAuth())
def silence_alarm(request, alarm_id: str):
    alarm = get_object_or_404(Alarm, id=alarm_id)

    if alarm.user != request.auth:
        return 403, {"error": "You do not have access to this alarm"}

    event = AlarmEvent.objects.filter(alarm=alarm).order_by("-created_at").first()
    if not event:
        return 404, None

    event.status = AlarmEvent.Status.SILENCED
    event.silenced_at = timezone.now()
    event.save(update_fields=["status", "silenced_at"])

    return 200, {"message": f"Silenced your {event.alarm.name} alarm"}
