from ninja import Router
from .models import Group, Alarm
from .schemas import GroupOut, GroupCreate, AlarmOut, AlarmCreate, AlarmUpdate
from users.auth import TokenAuth


router = Router()


@router.post("/groups/", response=GroupOut, auth=TokenAuth())
def create_group(request, payload: GroupCreate):
    group = Group.objects.create(name=payload.name)
    group.members.add(request.auth)
    return group


@router.get("/groups/", response=list[GroupOut], auth=TokenAuth())
def list_groups(request):
    return list(Group.objects.filter(members=request.auth))


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
    alarm = Alarm.objects.get(id=alarm_id)

    if alarm.user.id != request.auth.id:
        return 403, None

    alarm.delete()

    return 204, None


@router.put("/alarms/{alarm_id}/", response=AlarmOut, auth=TokenAuth())
def update_alarm(request, alarm_id: str, payload: AlarmUpdate):
    alarm = Alarm.objects.get(id=alarm_id)

    if alarm.user.id != request.auth.id:
        return 403, None

    for field, value in payload.dict(exclude_unset=True).items():
        if field == "time":
            value = value.replace(tzinfo=None)

        setattr(alarm, field, value)

    alarm.save()
    return alarm
