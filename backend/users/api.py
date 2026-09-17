import logging
import secrets
import uuid

from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import F, Q
from ninja import Router
from ninja.errors import HttpError
from ninja.throttling import AnonRateThrottle

from alarms.enums import Actions
from alarms.utils import send_group_push

from .auth import TokenAuth
from .models import (
    MAX_RESET_CODE_ATTEMPTS,
    AuthToken,
    Friendship,
    PasswordResetCode,
    User,
    UserDevice,
)
from .schemas import (
    DeviceCreate,
    FriendOut,
    FriendRequestCreate,
    FriendRequestOut,
    LogoutRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    TokenOut,
    UserCreate,
    UserLogin,
    UserOut,
    UserSearchOut,
    UserUpdate,
)

logger = logging.getLogger(__name__)

router = Router()

INVALID_RESET = "Invalid or expired code."


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


@router.post("/login/", response=TokenOut, throttle=[AnonRateThrottle("20/m")])
def login_user(request, payload: UserLogin):
    user = authenticate(username=payload.email, password=payload.password)

    if user is not None:
        token = str(uuid.uuid4())
        AuthToken.objects.create(id=token, user=user)
        return {"token": token}
    else:
        raise HttpError(401, "Invalid email or password")


@router.post("/logout/", response={204: None}, auth=TokenAuth())
def logout_user(request, payload: LogoutRequest):
    # Ends only this session; other devices stay logged in.
    request.auth_token.delete()
    if payload.push_token:
        UserDevice.objects.filter(user=request.auth, push_token=payload.push_token).update(is_active=False)
    return 204, None


@router.post("/forgot-password/", response={200: dict}, throttle=[AnonRateThrottle("5/h")])
def forgot_password(request, payload: PasswordResetRequest):
    user = User.objects.filter(email=payload.email).first()
    if user:
        PasswordResetCode.objects.filter(user=user, used=False).update(used=True)
        code = f"{secrets.randbelow(1_000_000):06d}"
        PasswordResetCode.objects.create(user=user, code=code)
        try:
            send_mail(
                subject="Your Nudge reset code",
                message=f"Your password reset code is: {code}\n\nThis code expires in 10 minutes.",
                from_email=None,
                recipient_list=[user.email],
            )
        except Exception:
            # Still return the generic response so this endpoint can't reveal which emails exist.
            logger.exception("Failed to send password reset email")
    return 200, {"message": "If that email is registered, a reset code has been sent."}


@router.post("/reset-password/", response={200: dict, 400: dict}, throttle=[AnonRateThrottle("10/m")])
def reset_password(request, payload: PasswordResetConfirm):
    with transaction.atomic():
        code_obj = (
            PasswordResetCode.objects.select_for_update()
            .select_related("user")
            .filter(user__email=payload.email, used=False)
            .order_by("-created_at")
            .first()
        )

        if not code_obj or code_obj.is_expired() or code_obj.attempts >= MAX_RESET_CODE_ATTEMPTS:
            return 400, {"error": INVALID_RESET}

        if not secrets.compare_digest(code_obj.code, payload.code):
            # Count the miss; after MAX_RESET_CODE_ATTEMPTS the code is dead and a new one is needed.
            PasswordResetCode.objects.filter(pk=code_obj.pk).update(attempts=F("attempts") + 1)
            return 400, {"error": INVALID_RESET}

        user = code_obj.user
        user.set_password(payload.new_password)
        user.save(update_fields=["password"])
        user.authtoken_set.all().delete()
        code_obj.used = True
        code_obj.save(update_fields=["used"])

    return 200, {"message": "Password reset successfully."}


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

        send_group_push(users=[to_user], action=Actions.FRIEND_REQUEST_RECEIVED,
            data={"friendship_id": str(friendship.id)})

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
def accept_friend_request(request, friendship_id: uuid.UUID):
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
def decline_friend_request(request, friendship_id: uuid.UUID):
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
def remove_friend(request, friendship_id: uuid.UUID):
    friendship = Friendship.objects.filter(id=friendship_id).first()
    if not friendship:
        return 404, {"error": "Friendship not found"}

    if request.auth not in (friendship.from_user, friendship.to_user):
        return 403, {"error": "Not your friendship"}

    friendship.delete()
    return 204, None
