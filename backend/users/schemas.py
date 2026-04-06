from ninja import Schema
from pydantic import field_validator
import uuid
import re
from typing import Optional
from datetime import datetime


class UserOut(Schema):
    id: uuid.UUID
    username: str
    display_name: str
    timezone: str
    email: str


class UserCreate(Schema):
    username: str
    display_name: str
    timezone: str = "UTC"
    email: str
    password: str

    @classmethod
    @field_validator("username")
    def validate_username(cls, v):
        v = v.strip().lower()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters.")
        if " " in v:
            raise ValueError("Username cannot contain spaces.")
        if not re.match(r"^[a-z0-9._]+$", v):
            raise ValueError("Username can only contain letters, numbers, dots, and underscores.")
        return v


class UserUpdate(Schema):
    email: Optional[str] = None
    display_name: Optional[str] = None
    password: Optional[str] = None
    timezone: Optional[str] = None


class UserLogin(Schema):
    email: str
    password: str


class TokenOut(Schema):
    token: str


class DeviceCreate(Schema):
    push_token: str
    device_type: str


class UserSearchOut(Schema):
    id: uuid.UUID
    username: str
    display_name: str


class FriendRequestCreate(Schema):
    to_user_id: uuid.UUID


class FriendOut(Schema):
    friendship_id: uuid.UUID
    user: UserSearchOut


class FriendRequestOut(Schema):
    id: uuid.UUID
    from_user: UserSearchOut
    created_at: datetime


class PasswordResetRequest(Schema):
    email: str


class PasswordResetConfirm(Schema):
    email: str
    code: str
    new_password: str
