from typing import Optional
from ninja import Schema
import uuid
from datetime import time as Time
from datetime import datetime


class GroupOut(Schema):
    id: uuid.UUID
    name: str


class GroupCreate(Schema):
    name: str


class GroupUpdate(Schema):
    name: str


class AlarmOut(Schema):
    id: uuid.UUID
    name: str
    time: Time
    repeats: Optional[str] = None
    is_one_time: bool
    user_id: uuid.UUID
    group_id: uuid.UUID
    is_active: bool


class AlarmCreate(Schema):
    name: str
    time: Time
    repeats: Optional[str] = None
    is_one_time: bool
    group_id: uuid.UUID


class AlarmUpdate(Schema):
    name: Optional[str] = None
    time: Optional[Time] = None
    repeats: Optional[str] = None
    is_one_time: Optional[bool] = None
    is_active: Optional[bool] = None


class AlarmEventOut(Schema):
    id: uuid.UUID
    alarm_id: uuid.UUID
    user_id: uuid.UUID
    triggered_by_id: Optional[uuid.UUID] = None
    status: str
    created_at: datetime
    silenced_at: Optional[datetime] = None
    checked_in_at: Optional[datetime] = None
