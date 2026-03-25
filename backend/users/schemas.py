from ninja import Schema
import uuid
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
