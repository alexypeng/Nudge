import enum


class Actions(enum.Enum):
    RINGING = "alarm_ringing"
    CHECKED_IN = "alarm_checked_in"
    EXPIRED = "alarm_expired"
    MANUAL_RING = "manual_ring"
