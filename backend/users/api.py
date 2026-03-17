from ninja import Router
from .auth import TokenAuth
from .models import User, AuthToken, UserDevice
from .schemas import UserOut, UserCreate, UserLogin, TokenOut, UserUpdate, DeviceCreate
from django.contrib.auth import authenticate
from ninja.errors import HttpError
import uuid
from django.db import transaction


router = Router()


@router.post("/register/", response=UserOut)
def create_user(request, payload: UserCreate):
    user = User.objects.create_user(
        username=payload.username,
        display_name=payload.display_name,
        timezone=payload.timezone,
        email=payload.email,
        password=payload.password,
    )
    return user


@router.get("/me/", response=UserOut, auth=TokenAuth())
def list_user(request):
    return request.auth


@router.delete("/delete/", response={204: None}, auth=TokenAuth())
def delete_user(request):
    user = request.auth

    user.delete()
    return 204, None


@router.put("/update/", response=UserOut, auth=TokenAuth())
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
