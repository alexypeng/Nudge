import { create } from "zustand";
import { api, UserOut, UserUpdate, RegisterIn, LoginIn } from "@/src/api/client";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import { registerForPushNotifications } from "../services/notificationService";
import { cancelAllAlarms } from "../services/alarmScheduler";

const TOKEN_KEY = "ringsync_token";

interface AuthState {
    user: UserOut | null;
    token: string | null;
    isLoaded: boolean;
    isLoading: boolean;

    login: (data: LoginIn) => Promise<void>;
    register: (data: RegisterIn) => Promise<void>;
    logout: () => Promise<void>;
    loadToken: () => Promise<void>;
    fetchUser: () => Promise<void>;
    updateUser: (data: UserUpdate) => Promise<void>;
    deleteAccount: () => Promise<void>;
}

// The server rings alarms at the account's time zone, so keep it matching the device (e.g. after travel).
async function syncTimezone(token: string, user: UserOut): Promise<UserOut> {
    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!deviceTimezone || deviceTimezone === user.timezone) return user;
    try {
        return await api.updateMe(token, { timezone: deviceTimezone });
    } catch {
        return user;
    }
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isLoaded: false,
    isLoading: false,

    login: async (data) => {
        set({ isLoading: true });
        try {
            const { token } = await api.login(data);
            await SecureStore.setItemAsync(TOKEN_KEY, token);
            const user = await syncTimezone(token, await api.getMe(token));
            set({ token, user });
            registerForPushNotifications(token).catch(() => {});
        } finally {
            set({ isLoading: false });
        }
    },
    register: async (data) => {
        await api.register(data);
        await get().login({ email: data.email, password: data.password });
    },
    logout: async () => {
        const token = get().token;
        // Log out locally first so the app responds instantly, even offline.
        set({ token: null, user: null });
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        // A logged-out phone shouldn't keep ringing this account's alarms.
        await cancelAllAlarms().catch(() => {});

        if (token) {
            // Best effort: end the session on the server and stop pushes to this device.
            let pushToken: string | undefined;
            try {
                const { status } = await Notifications.getPermissionsAsync();
                if (status === "granted") {
                    // Can hang on devices without Google Play services; don't let it block logout.
                    const device = await Promise.race([
                        Notifications.getDevicePushTokenAsync(),
                        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
                    ]);
                    pushToken = device?.data as string | undefined;
                }
            } catch {}
            await api.logout(token, pushToken).catch(() => {});
        }
    },
    loadToken: async () => {
        try {
            const token = await SecureStore.getItemAsync(TOKEN_KEY);
            if (token) {
                const user = await syncTimezone(token, await api.getMe(token));
                set({ token, user });
                registerForPushNotifications(token).catch(() => {});
            }
        } catch {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        } finally {
            set({ isLoaded: true });
        }
    },
    fetchUser: async () => {
        const token = get().token;
        if (!token) return;

        const user = await api.getMe(token);
        set({ user });
    },
    updateUser: async (data) => {
        const token = get().token;
        if (!token) return;

        await api.updateMe(token, data);
        await get().fetchUser();
    },
    deleteAccount: async () => {
        const token = get().token;
        if (!token) return;

        await api.deleteMe(token);
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        set({ token: null, user: null });
    },
}));
