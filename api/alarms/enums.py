import enum


class ClientAction(enum.Enum):
    MANUAL_RING = "manual_ring"
    SILENCE = "silence"
    CHECK_IN = "check_in"


class ServerAction(enum.Enum):
    RING = "ring"
    EXPIRED = "expired"
    SILENCED = "alarm_silenced"
    REQUIRE_CHECK_IN = "require_check_in"
    CHECKED_IN = "checked_in"
    ERROR = "error"


class CheckInResult(enum.Enum):
    SUCCESS = "success"
    EXPIRED = "expired"
    NOT_FOUND = "not_found"
    ALREADY_COMPLETED = "already_completed"


class SilenceResult(enum.Enum):
    SUCCESS = "success"
    NOT_FOUND = "not_found"
    ALREADY_SILENCED = "already_silenced"
    CHECKED_IN = "checked_in"
