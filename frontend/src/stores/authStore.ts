import { create } from "zustand";
import { api, UserOut, UserUpdate, RegisterIn, LoginIn } from "@/src/api/client";
import * as SecureStore from "expo-secure-store";
import { registerForPushNotifications } from "../services/notificationService";

const TOKEN_KEY = "ringsync_token";

interface AuthState {
    user: UserOut | null;
    token: string | null;
    isLoaded: boolean;
    isLoading: boolean;

    login: (data: LoginIn) => Promise<void>;
    register: (data: RegisterIn) => Promise<void>;
    logout: () => void;
    loadToken: () => Promise<void>;
    fetchUser: () => Promise<void>;
    updateUser: (data: UserUpdate) => Promise<void>;
    deleteAccount: () => Promise<void>;
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
            const user = await api.getMe(token);
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
    logout: () => {
        SecureStore.deleteItemAsync(TOKEN_KEY);
        set({ token: null, user: null });
    },
    loadToken: async () => {
        try {
            const token = await SecureStore.getItemAsync(TOKEN_KEY);
            if (token) {
                const user = await api.getMe(token);
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
