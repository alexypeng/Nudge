from ninja import Router
from .auth import TokenAuth
from .models import User, AuthToken, UserDevice, Friendship
from .schemas import (
    UserOut, UserCreate, UserLogin, TokenOut, UserUpdate, DeviceCreate,
    UserSearchOut, FriendRequestCreate, FriendOut, FriendRequestOut,
)
from django.contrib.auth import authenticate
from ninja.errors import HttpError
import uuid
from django.db import transaction
from django.db.models import Q
from alarms.utils import send_group_push
from alarms.enums import Actions


router = Router()


@router.post("/user/", response=UserOut)
def create_user(request, payload: UserCreate):
    user = User.objects.create_user(
        username=payload.username,
        display_name=payload.display_name,
        timezone=payload.timezone,
        email=payload.email,
        password=payload.password,
    )
    return user


@router.get("/user/", response=UserOut, auth=TokenAuth())
def list_user(request):
    return request.auth


@router.delete("/user/", response={204: None}, auth=TokenAuth())
def delete_user(request):
    user = request.auth

    user.delete()
    return 204, None


@router.put("/user/", response=UserOut, auth=TokenAuth())
def update_user(request, payload: UserUpdate):
    user = request.auth
    updated_fields = []

    with transaction.atomic():
        for field, value in payload.dict(exclude_unset=True).items():
            if field == "password":
                user.set_password(value)
                user.authtoken_set.all().delete()
            else:
                setattr(user, field, value)
            updated_fields.append(field)
        if updated_fields:
            user.save(update_fields=updated_fields)

    return user


@router.post("/login/", response=TokenOut)
def login_user(request, payload: UserLogin):
    user = authenticate(username=payload.email, password=payload.password)

    if user is not None:
        token = str(uuid.uuid4())
        AuthToken.objects.create(id=token, user=user)
        return {"token": token}
    else:
        raise HttpError(401, "Invalid email or password")


@router.post("/devices/", response={200: dict}, auth=TokenAuth())
def register_device(request, payload: DeviceCreate):
    device, created = UserDevice.objects.update_or_create(
        push_token=payload.push_token,
        defaults={"user": request.auth, "device_type": payload.device_type, "is_active": True},
    )

    return 200, {"message": "Device registered successfully", "device_id": str(device.id), "created": created}


# ==========================================
# Friends
# ==========================================


@router.get("/search/", response=list[UserSearchOut], auth=TokenAuth())
def search_users(request, q: str = ""):
    if len(q) < 2:
        return []
    return list(
        User.objects.filter(username__icontains=q)
        .exclude(id=request.auth.id)[:20]
    )


@router.post(
    "/friends/request/",
    response={201: FriendRequestOut, 409: dict},
    auth=TokenAuth(),
)
def send_friend_request(request, payload: FriendRequestCreate):
    if payload.to_user_id == request.auth.id:
        return 409, {"error": "Cannot send a friend request to yourself"}

    to_user = User.objects.filter(id=payload.to_user_id).first()
    if not to_user:
        return 409, {"error": "User not found"}

    with transaction.atomic():
        # Check if already friends or request already sent
        existing = Friendship.objects.filter(
            Q(from_user=request.auth, to_user=to_user)
            | Q(from_user=to_user, to_user=request.auth)
        ).select_for_update().first()

        if existing:
            if existing.status == Friendship.Status.ACCEPTED:
                return 409, {"error": "Already friends"}
            # If the other person already sent us a request, auto-accept
            if existing.from_user == to_user and existing.status == Friendship.Status.PENDING:
                existing.status = Friendship.Status.ACCEPTED
                existing.save(update_fields=["status"])
                send_group_push(
                    users=[to_user],
                    action=Actions.FRIEND_ACCEPTED,
                    data={"friendship_id": str(existing.id)},
                )
                return 201, existing
            return 409, {"error": "Friend request already sent"}

        friendship = Friendship.objects.create(from_user=request.auth, to_user=to_user)

    return 201, friendship


@router.get("/friends/", response=list[FriendOut], auth=TokenAuth())
def list_friends(request):
    friendships = Friendship.objects.filter(
        Q(from_user=request.auth) | Q(to_user=request.auth),
        status=Friendship.Status.ACCEPTED,
    ).select_related("from_user", "to_user")

    return [
        {"friendship_id": f.id, "user": f.get_friend(request.auth)}
        for f in friendships
    ]


@router.get("/friends/pending/", response=list[FriendRequestOut], auth=TokenAuth())
def list_pending_requests(request):
    return list(
        Friendship.objects.filter(
            to_user=request.auth,
            status=Friendship.Status.PENDING,
        ).select_related("from_user")
    )


@router.post(
    "/friends/{friendship_id}/accept/",
    response={200: FriendOut, 403: dict, 404: dict},
    auth=TokenAuth(),
)
def accept_friend_request(request, friendship_id: str):
    friendship = Friendship.objects.filter(id=friendship_id).first()
    if not friendship:
        return 404, {"error": "Request not found"}

    if friendship.to_user != request.auth:
        return 403, {"error": "Not your request to accept"}

    if friendship.status != Friendship.Status.PENDING:
        return 404, {"error": "Request not found"}

    friendship.status = Friendship.Status.ACCEPTED
    friendship.save(update_fields=["status"])

    send_group_push(
        users=[friendship.from_user],
        action=Actions.FRIEND_ACCEPTED,
        data={"friendship_id": str(friendship.id)},
    )

    return 200, {"friendship_id": friendship.id, "user": friendship.from_user}


@router.post(
    "/friends/{friendship_id}/decline/",
    response={204: None, 403: dict, 404: dict},
    auth=TokenAuth(),
)
def decline_friend_request(request, friendship_id: str):
    friendship = Friendship.objects.filter(id=friendship_id).first()
    if not friendship:
        return 404, {"error": "Request not found"}

    if friendship.to_user != request.auth:
        return 403, {"error": "Not your request to decline"}

    if friendship.status != Friendship.Status.PENDING:
        return 404, {"error": "Request not found"}

    friendship.delete()
    return 204, None


@router.delete(
    "/friends/{friendship_id}/",
    response={204: None, 403: dict, 404: dict},
    auth=TokenAuth(),
)
def remove_friend(request, friendship_id: str):
    friendship = Friendship.objects.filter(id=friendship_id).first()
    if not friendship:
        return 404, {"error": "Friendship not found"}

    if request.auth not in (friendship.from_user, friendship.to_user):
        return 403, {"error": "Not your friendship"}

    friendship.delete()
    return 204, None
