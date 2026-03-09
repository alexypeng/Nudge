from django.utils import timezone
from ninja import Router
from .models import Group, Alarm, AlarmEvent
from .schemas import AlarmEventOut, GroupOut, GroupCreate, GroupUpdate, AlarmOut, AlarmCreate, AlarmUpdate
from users.auth import TokenAuth
from django.shortcuts import get_object_or_404
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


router = Router()


@router.post("/groups/", response=GroupOut, auth=TokenAuth())
def create_group(request, payload: GroupCreate):
    group = Group.objects.create(name=payload.name, owner=request.auth)
    group.members.add(request.auth)
    return group


@router.get("/groups/", response=list[GroupOut], auth=TokenAuth())
def list_groups(request):
    return list(Group.objects.filter(members=request.auth))


@router.delete("/groups/{group_id}/", response={204: None}, auth=TokenAuth())
def delete_group(request, group_id: str):
    group = get_object_or_404(Group, id=group_id)

    if request.auth != group.owner:
        return 403, None

    group.delete()

    return 204, None


@router.put("/groups/{group_id}/", response=GroupOut, auth=TokenAuth())
def update_group(request, group_id: str, payload: GroupUpdate):
    group = get_object_or_404(Group, id=group_id)

    if request.auth not in group.members.all():
        return 403, None

    for field, value in payload.dict(exclude_unset=True).items():
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
    return 204, None


@router.post("/alarms/", response=AlarmOut, auth=TokenAuth())
def create_alarm(request, payload: AlarmCreate):
    clean_time = payload.time.replace(second=0, microsecond=0, tzinfo=None)
    alarm = Alarm.objects.create(
        name=payload.name,
        time=clean_time,
        repeats=payload.repeats,
        is_one_time=payload.is_one_time,
        user_id=request.auth.id,
        group_id=payload.group_id,
    )
    return alarm


@router.get("/alarms/", response=list[AlarmOut])
def list_alarms(request):
    return list(Alarm.objects.all())


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

    for field, value in payload.dict(exclude_unset=True).items():
        if field == "time":
            value = value.replace(second=0, microsecond=0, tzinfo=None)

        setattr(alarm, field, value)

    alarm.save()
    return alarm


@router.post("/alarms/{alarm_id}/ring/", response={200: AlarmEventOut, 403: dict}, auth=TokenAuth())
def trigger_alarm(request, alarm_id: str):
    alarm = get_object_or_404(Alarm, id=alarm_id)

    if not alarm.group.members.filter(id=request.auth.id).exists():
        return 403, {"error": "You are not in this alarm's group"}

    event = AlarmEvent.objects.create(
        alarm=alarm,
        user=alarm.user,
        triggered_by=request.auth,
    )

    channel_layer = get_channel_layer()

    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"user_{alarm.user.id}",
            {"type": "ring.alarm", "event_id": str(event.id), "ringer_name": request.auth.display_name},
        )

    return 200, event


@router.post(
    "/events/{event_id}/silence/", response={200: AlarmEventOut, 403: dict, 404: None, 409: dict}, auth=TokenAuth()
)
def silence_alarm(request, event_id: str):
    event = get_object_or_404(AlarmEvent, id=event_id)

    if event.user != request.auth:
        return 403, {"error": "You do not have access to this alarm"}

    if event.status != AlarmEvent.Status.RINGING:
        return 409, {"error": "Alarm is not currently ringing"}

    event.status = AlarmEvent.Status.SILENCED
    event.silenced_at = timezone.now()
    event.save(update_fields=["status", "silenced_at"])

    channel_layer = get_channel_layer()

    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"user_{event.user.id}",
            {"type": "start.timeout", "event_id": event_id, "group_name": f"user_{event.user.id}"},
        )

    return 200, event


@router.post(
    "/events/{event_id}/check_in/", response={200: AlarmEventOut, 404: None, 403: dict, 409: dict}, auth=TokenAuth()
)
def check_in_alarm(request, event_id: str):
    event = get_object_or_404(AlarmEvent, id=event_id)

    if event.user != request.auth:
        return 403, {"error": "You do not have access to this event!"}

    if event.status != AlarmEvent.Status.RINGING and event.status != AlarmEvent.Status.SILENCED:
        return 409, {"error": "You cannot check in for this alarm right now!"}

    event.status = AlarmEvent.Status.CHECKED_IN
    event.checked_in_at = timezone.now()

    event.save(update_fields=["status", "checked_in_at"])

    return 200, event
