from ninja import Schema
import uuid
from typing import Optional


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
    display_name: Optional[str] = None
    password: Optional[str] = None
    timezone: Optional[str] = None


class UserLogin(Schema):
    username: str
    password: str


class TokenOut(Schema):
    token: str


class DeviceCreate(Schema):
    push_token: str
    device_type: str
