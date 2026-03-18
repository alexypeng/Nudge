import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, UserOut, RegisterIn, LoginIn } from "../api/client";

const TOKEN_KEY = "ringsync_token";

interface AuthState {
    user: UserOut | null;
    token: string | null;
    isLoaded: boolean;

    login: (data: LoginIn) => Promise<void>;
    register: (data: RegisterIn) => Promise<void>;
    logout: () => void;
    loadToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isLoaded: false,

    login: async (data) => {
        const { token } = await api.login(data);
        await AsyncStorage.setItem(TOKEN_KEY, token);
        const user = await api.getMe(token);
        set({ token, user });
    },
    register: async (data) => {
        await api.register(data);
        await get().login({ email: data.email, password: data.password });
    },
    logout: () => {
        AsyncStorage.removeItem(TOKEN_KEY);
        set({ token: null, user: null });
    },
    loadToken: async () => {
        try {
            const token = await AsyncStorage.getItem(TOKEN_KEY);
            if (token) {
                const user = await api.getMe(token);
                set({ token, user });
            }
        } catch {
            await AsyncStorage.removeItem(TOKEN_KEY);
        } finally {
            set({ isLoaded: true });
        }
    },
}));
