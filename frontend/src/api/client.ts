import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/constants/Config";

// Users
interface UserOut {
    id: string;
    username: string;
    display_name: string;
    timezone: string;
    email: string;
}

interface RegisterIn {
    username: string;
    display_name: string;
    timezone: string;
    email: string;
    password: string;
}

interface LoginIn {
    email: string;
    password: string;
}

interface TokenOut {
    token: string;
}

interface UserUpdate {
    email?: string;
    display_name?: string;
    password?: string;
    timezone?: string;
}

// Devices
interface DeviceCreate {
    push_token: string;
    device_type: "ios" | "android";
}

//  Groups
interface GroupOut {
    id: string;
    name: string;
}

interface GroupCreate {
    name: string;
}

// Alarms
interface AlarmOut {
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
interface AlarmCreate {
    name: string;
    time: string;
    repeats: string;
    is_one_time: boolean;
    group_id: string;
    sound_filename?: string;
}
interface AlarmUpdate {
    name?: string;
    time?: string;
    repeats?: string;
    is_one_time?: boolean;
    is_active?: boolean;
}

// Events
type AlarmEventStatus = "RINGING" | "SILENCED" | "CHECKED_IN" | "EXPIRED";
interface RingOut {
    message: string;
    event_id: string;
}
interface ManualRingOut {
    id: string;
    alarm_id: string;
    ringer_id: string | null;
    created_at: string;
}

async function request<T>(
    path: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    body?: object,
    auth?: boolean,
): Promise<T> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (auth) {
        const token = await AsyncStorage.getItem("auth_token");
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(API_URL + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) return undefined as T;

    if (!response.ok) {
        const error = await response.json();
        throw error;
    }

    return await response.json();
}

export const login = (data: LoginIn) =>
    request<TokenOut>("/api/users/login/", "POST", data, false);

export const register = (data: RegisterIn) =>
    request<UserOut>("/api/users/users/", "POST", data, false);
