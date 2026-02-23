from ninja import Router
from .models import Group
from .schemas import GroupOut, GroupCreate

router = Router()

@router.post("/groups/", response=GroupOut)
def create_group(request, payload: GroupCreate):
    group = Group.objects.create(name=payload.name)
    return group

@router.get("/groups/", response=list[GroupOut])
def list_groups(request):
    return list(Group.objects.all())

