import { API_URL } from "@/constants/Config";

// Users
export interface UserOut {
    id: string;
    username: string;
    display_name: string;
    timezone: string;
    email: string;
}

export interface RegisterIn {
    username: string;
    display_name: string;
    timezone: string;
    email: string;
    password: string;
}

export interface LoginIn {
    email: string;
    password: string;
}

export interface TokenOut {
    token: string;
}

export interface UserUpdate {
    email?: string;
    display_name?: string;
    password?: string;
    timezone?: string;
}

// Devices
export interface DeviceCreate {
    push_token: string;
    device_type: "ios" | "android";
}

//  Groups
export interface GroupOut {
    id: string;
    name: string;
    icon: string;
}

export interface GroupCreate {
    name: string;
    icon?: string;
}

export interface GroupUpdate {
    name?: string;
    icon?: string;
}

// Alarms
export interface AlarmOut {
    id: string;
    name: string;
    time: string;
    repeats: string;
    is_one_time: boolean;
    user_id: string;
    group_id: string;
    is_active: boolean;
    next_trigger_utc: string | null;
    sound_filename: string;
}

export interface AlarmCreate {
    name: string;
    time: string;
    repeats: string;
    is_one_time: boolean;
    group_id: string;
    sound_filename?: string;
}

export interface AlarmUpdate {
    name?: string;
    time?: string;
    repeats?: string;
    is_one_time?: boolean;
    is_active?: boolean;
}

// Friends
export interface UserSearchOut {
    id: string;
    display_name: string;
}

export interface FriendOut {
    friendship_id: string;
    user: UserSearchOut;
}

export interface FriendRequestOut {
    id: string;
    from_user: UserSearchOut;
    created_at: string;
}

// Events
export type AlarmEventStatus =
    | "RINGING"
    | "SILENCED"
    | "CHECKED_IN"
    | "EXPIRED";

export interface AlarmEventOut {
    id: string;
    alarm_id: string;
    user_id: string;
    status: AlarmEventStatus;
    created_at: string;
    silenced_at: string | null;
    checked_in_at: string | null;
}

export interface RingOut {
    message: string;
    event_id: string;
}

export interface ManualRingOut {
    id: string;
    alarm_id: string;
    ringer_id: string | null;
    created_at: string;
}

async function request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    token?: string,
    body?: unknown,
): Promise<T> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
            const error = await response.json();
            message = error.detail ?? error.message ?? JSON.stringify(error);
        } catch {}
        throw new Error(message);
    }

    if (response.status === 204) return undefined as T;

    return (await response.json()) as T;
}

export const api = {
    register: (data: RegisterIn) =>
        request<UserOut>("POST", "/api/users/user/", undefined, data),
    login: (data: LoginIn) =>
        request<TokenOut>("POST", "/api/users/login/", undefined, data),
    getMe: (token: string) =>
        request<UserOut>("GET", "/api/users/user/", token),
    updateMe: (token: string, data: UserUpdate) =>
        request<UserOut>("PUT", "/api/users/user/", token, data),

    registerDevice: (token: string, data: DeviceCreate) =>
        request<void>("POST", "/api/users/devices/", token, data),

    createGroup: (token: string, data: GroupCreate) =>
        request<GroupOut>("POST", "/api/alarms/group/", token, data),
    listGroups: (token: string) =>
        request<GroupOut[]>("GET", "/api/alarms/group/", token),
    updateGroup: (token: string, groupId: string, data: GroupUpdate) =>
        request<GroupOut>("PUT", `/api/alarms/group/${groupId}/`, token, data),
    listGroupMembers: (token: string, groupId: string) =>
        request<UserOut[]>("GET", `/api/alarms/group/${groupId}/members/`, token),
    joinGroup: (token: string, groupId: string) =>
        request<GroupOut>("POST", `/api/alarms/group/${groupId}/join/`, token),
    leaveGroup: (token: string, groupId: string) =>
        request<void>("POST", `/api/alarms/group/${groupId}/leave/`, token),

    createAlarm: (token: string, data: AlarmCreate) =>
        request<AlarmOut>("POST", "/api/alarms/alarm/", token, data),
    listAlarms: (token: string, groupId?: string) =>
        request<AlarmOut[]>(
            "GET",
            `/api/alarms/alarm/${groupId ? `?group_id=${groupId}` : ""}`,
            token,
        ),
    updateAlarm: (token: string, alarmId: string, data: AlarmUpdate) =>
        request<AlarmOut>("PUT", `/api/alarms/alarm/${alarmId}/`, token, data),
    deleteAlarm: (token: string, alarmId: string) =>
        request<void>("DELETE", `/api/alarms/alarm/${alarmId}/`, token),

    ringAlarm: (token: string, alarmId: string) =>
        request<{ message: string; event_id: string }>(
            "POST",
            `/api/alarms/alarm/${alarmId}/ring/`,
            token,
        ),
    silenceAlarm: (token: string, alarmId: string) =>
        request<{ message: string }>(
            "POST",
            `/api/alarms/alarm/${alarmId}/silence/`,
            token,
        ),
    checkIn: (token: string, alarmId: string) =>
        request<{ message: string }>(
            "POST",
            `/api/alarms/alarm/${alarmId}/check_in/`,
            token,
        ),
    triggerAlarm: (token: string, alarmId: string) =>
        request<{
            id: string;
            alarm_id: string;
            ringer_id: string | null;
            created_at: string;
        }>("POST", `/api/alarms/alarm/${alarmId}/trigger/`, token),
    getLatestEvent: (token: string, alarmId: string) =>
        request<AlarmEventOut | undefined>(
            "GET",
            `/api/alarms/alarm/${alarmId}/event/`,
            token,
        ),

    // Friends
    searchUsers: (token: string, query: string) =>
        request<UserSearchOut[]>("GET", `/api/users/search/?q=${encodeURIComponent(query)}`, token),
    listFriends: (token: string) =>
        request<FriendOut[]>("GET", "/api/users/friends/", token),
    listPendingRequests: (token: string) =>
        request<FriendRequestOut[]>("GET", "/api/users/friends/pending/", token),
    sendFriendRequest: (token: string, toUserId: string) =>
        request<FriendRequestOut>("POST", "/api/users/friends/request/", token, { to_user_id: toUserId }),
    acceptFriendRequest: (token: string, friendshipId: string) =>
        request<FriendOut>("POST", `/api/users/friends/${friendshipId}/accept/`, token),
    declineFriendRequest: (token: string, friendshipId: string) =>
        request<void>("POST", `/api/users/friends/${friendshipId}/decline/`, token),
    removeFriend: (token: string, friendshipId: string) =>
        request<void>("DELETE", `/api/users/friends/${friendshipId}/`, token),
    addMemberToGroup: (token: string, groupId: string, userId: string) =>
        request<GroupOut>("POST", `/api/alarms/group/${groupId}/add-member/`, token, { user_id: userId }),
};
