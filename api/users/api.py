from ninja import Router
from .models import User, AuthToken
from .schemas import UserOut, UserCreate, UserLogin, TokenOut
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


@router.get("/users/", response=list[UserOut])
def list_users(request):
    return list(User.objects.all())


@router.post("/login/", response=TokenOut)
def login_user(request, payload: UserLogin):
    user = authenticate(username=payload.username, password=payload.password)

    if user is not None:
        token = str(uuid.uuid4())
        AuthToken.objects.create(id=token, user=user)
        return {"token": token}
    else:
        raise HttpError(401, "Invalid username or password")
