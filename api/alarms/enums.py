import enum


class ServerAction(enum.Enum):
    RING = "ring"
    EXPIRED = "expired"
    SILENCED = "alarm_silenced"
    REQUIRE_CHECK_IN = "require_check_in"
    CHECKED_IN = "checked_in"
    ERROR = "error"
