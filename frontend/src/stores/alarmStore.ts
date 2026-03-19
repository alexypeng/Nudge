import { create } from "zustand";
import { api, AlarmCreate, AlarmOut, AlarmUpdate } from "@/src/api/client";
import { useAuthStore } from "./authStore";

interface AlarmState {
    alarms: AlarmOut[];

    fetch: () => Promise<void>;
    create: (data: AlarmCreate) => Promise<void>;
    update: (id: string, data: AlarmUpdate) => Promise<void>;
    delete: (id: string) => Promise<void>;
}

export const useAlarmStore = create<AlarmState>((set, get) => ({
    alarms: [],

    fetch: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const alarms = await api.listAlarms(token);
        set({ alarms });
    },
    create: async (data) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const alarm = await api.createAlarm(token, data);
        set((state) => ({ alarms: [...state.alarms, alarm] }));
    },
    update: async (id, data) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const updated = await api.updateAlarm(token, id, data);
        set((state) => ({
            alarms: state.alarms.map((a) => (a.id === id ? updated : a)),
        }));
    },
    delete: async (id) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        await api.deleteAlarm(token, id);
        set((state) => ({
            alarms: state.alarms.filter((a) => a.id !== id),
        }));
    },
}));
