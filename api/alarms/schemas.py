from ninja import Schema
import uuid
from datetime import time


class GroupOut(Schema):
    id: uuid.UUID
    name: str


class GroupCreate(Schema):
    name: str


class AlarmOut(Schema):
    id: uuid.UUID
    name: str
    time: time
    repeats: str | None = None
    is_one_time: bool
    user_id: uuid.UUID
    group_id: uuid.UUID
    is_active: bool


class AlarmCreate(Schema):
    name: str
    time: time
    repeats: str | None = None
    is_one_time: bool
    group_id: uuid.UUID
