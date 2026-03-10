from typing import Optional
from ninja import Schema
from pydantic import field_validator, model_validator
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
    repeats: str
    is_one_time: bool
    user_id: uuid.UUID
    group_id: uuid.UUID
    is_active: bool
    next_trigger_utc: Optional[datetime] = None


class AlarmCreate(Schema):
    name: str
    time: Time
    repeats: str = ""
    is_one_time: bool
    group_id: uuid.UUID

    @classmethod
    @field_validator("repeats")
    def validate_repeats(cls, v):
        if not v:
            return v

        valid_days = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
        days = [day.strip() for day in v.split(",")]

        for day in days:
            if day not in valid_days:
                raise ValueError(
                    f"Invalid day: '{day}'. Must be comma-separated list of Mon, Tue, Wed, Thu, Fri, Sat, Sun."
                )
        return v

    @model_validator(mode="after")
    def validate_repeating_alarm_has_days(self):
        if not self.is_one_time and not self.repeats:
            raise ValueError("Repeating alarms must specify at least one day in the 'repeats' field.")
        return self


class AlarmUpdate(Schema):
    name: Optional[str] = None
    time: Optional[Time] = None
    repeats: Optional[str] = None
    is_one_time: Optional[bool] = None
    is_active: Optional[bool] = None

    @classmethod
    @field_validator("repeats")
    def validate_repeats(cls, v):
        if v is None or v == "":
            return v

        valid_days = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
        days = [day.strip() for day in v.split(",")]

        for day in days:
            if day not in valid_days:
                raise ValueError(
                    f"Invalid day: '{day}'. Must be comma-separated list of Mon, Tue, Wed, Thu, Fri, Sat, Sun."
                )
        return v

    @model_validator(mode="after")
    def validate_repeating_alarm_has_days(self):
        if not self.is_one_time and not self.repeats:
            raise ValueError("Repeating alarms must specify at least one day in the 'repeats' field.")
        return self


class AlarmEventOut(Schema):
    id: uuid.UUID
    alarm_id: uuid.UUID
    user_id: uuid.UUID
    status: str
    created_at: datetime
    silenced_at: Optional[datetime] = None
    checked_in_at: Optional[datetime] = None


class ManualRingOut(Schema):
    id: uuid.UUID
    alarm_id: uuid.UUID
    ringer_id: Optional[uuid.UUID] = None
    created_at: datetime
