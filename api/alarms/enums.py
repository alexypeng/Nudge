import enum


class ServerAction(enum.Enum):
    RING = "ring"
    EXPIRED = "expired"
    SILENCED = "alarm_silenced"
    REQUIRE_CHECK_IN = "require_check_in"
    CHECKED_IN = "checked_in"
    ERROR = "error"


class ExpireResult(enum.Enum):
    SUCCESS = "success"
    NOT_FOUND = "not_found"
    ALREADY_EXPIRED = "already_expired"
