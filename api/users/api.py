from ninja import Router
from django.shortcuts import get_object_or_404
from .auth import TokenAuth
from .models import User, AuthToken
from .schemas import UserOut, UserCreate, UserLogin, TokenOut, UserUpdate
from django.contrib.auth import authenticate
from ninja.errors import HttpError
import uuid


router = Router()


@router.post("/users/", response=UserOut)
def create_user(request, payload: UserCreate):
    user = User.objects.create_user(
        username=payload.username,
        display_name=payload.display_name,
        email=payload.email,
        password=payload.password,
    )
    return user


@router.get("/users/", response=list[UserOut], auth=TokenAuth())
def list_users(request):
    return list(User.objects.all())


@router.delete("/users/{user_id}/", response={204: None}, auth=TokenAuth())
def delete_user(request, user_id: str):
    user = get_object_or_404(User, id=user_id)

    if user != request.auth:
        return 403, None

    user.delete()
    return 204, None


@router.put("/users/{user_id}/", response=UserOut, auth=TokenAuth())
def update_user(request, user_id: str, payload: UserUpdate):
    user = get_object_or_404(User, id=user_id)

    if user != request.auth:
        return 403, None

    for field, value in payload.dict(exclude_unset=True).items():
        if field == "password":
            user.set_password(value)
        else:
            setattr(user, field, value)

    user.save()
    return user


@router.post("/login/", response=TokenOut)
def login_user(request, payload: UserLogin):
    user = authenticate(username=payload.username, password=payload.password)

    if user is not None:
        token = str(uuid.uuid4())
        AuthToken.objects.create(id=token, user=user)
        return {"token": token}
    else:
        raise HttpError(401, "Invalid username or password")
