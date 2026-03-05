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


@router.get("/users/me/", response=UserOut, auth=TokenAuth())
def list_user(request):
    return request.auth


@router.delete("/users/me/", response={204: None}, auth=TokenAuth())
def delete_user(request):
    user = request.auth

    user.delete()
    return 204, None


@router.put("/users/me/", response=UserOut, auth=TokenAuth())
def update_user(request, payload: UserUpdate):
    user = request.auth

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
