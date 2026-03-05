from ninja import Router
from .models import Group, Alarm
from .schemas import GroupOut, GroupCreate, GroupUpdate, AlarmOut, AlarmCreate, AlarmUpdate
from users.auth import TokenAuth
from django.shortcuts import get_object_or_404


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


@router.post("/alarms/", response=AlarmOut, auth=TokenAuth())
def create_alarm(request, payload: AlarmCreate):
    clean_time = payload.time.replace(tzinfo=None)
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
            value = value.replace(tzinfo=None)

        setattr(alarm, field, value)

    alarm.save()
    return alarm
