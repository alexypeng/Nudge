import enum


class Actions(enum.Enum):
    RINGING = "alarm_ringing"
    CHECKED_IN = "alarm_checked_in"
    EXPIRED = "alarm_expired"
    MANUAL_RING = "manual_ring"
    GROUP_MEMBER_ADDED = "group_member_added"
    FRIEND_ACCEPTED = "friend_accepted"
    FRIEND_REQUEST_RECEIVED = "friend_request_received"
    ALARM_CREATED = "alarm_created"
    ALARM_UPDATED = "alarm_updated"
    ALARM_DELETED = "alarm_deleted"
    GROUP_MEMBER_JOINED = "group_member_joined"
    GROUP_MEMBER_LEFT = "group_member_left"
    GROUP_UPDATED = "group_updated"
