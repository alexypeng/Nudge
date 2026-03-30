import { create } from "zustand";
import { api, AlarmCreate, AlarmOut, AlarmUpdate } from "@/src/api/client";
import { useAuthStore } from "./authStore";
import { syncAllAlarms, scheduleAlarm, cancelAlarm } from "@/src/services/alarmScheduler";

interface AlarmState {
    alarms: AlarmOut[];
    isLoading: boolean;
    error: string | null;

    fetch: (groupId?: string) => Promise<void>;
    create: (data: AlarmCreate) => Promise<void>;
    update: (id: string, data: AlarmUpdate) => Promise<void>;
    delete: (id: string) => Promise<void>;
}

export const useAlarmStore = create<AlarmState>((set, get) => ({
    alarms: [],
    isLoading: false,
    error: null,

    fetch: async (groupId?: string) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        set({ isLoading: true, error: null });
        try {
            const alarms = await api.listAlarms(token, groupId);
            set({ alarms });
            syncAllAlarms(alarms).catch(() => {});
        } catch (err) {
            set({ error: (err as Error).message });
        } finally {
            set({ isLoading: false });
        }
    },
    create: async (data) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const alarm = await api.createAlarm(token, data);
        set((state) => ({ alarms: [...state.alarms, alarm] }));
        scheduleAlarm(alarm).catch(() => {});
    },
    update: async (id, data) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const updated = await api.updateAlarm(token, id, data);
        set((state) => ({
            alarms: state.alarms.map((a) => (a.id === id ? updated : a)),
        }));
        if (updated.is_active) {
            scheduleAlarm(updated).catch(() => {});
        } else {
            cancelAlarm(id).catch(() => {});
        }
    },
    delete: async (id) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        await api.deleteAlarm(token, id);
        cancelAlarm(id).catch(() => {});
        set((state) => ({
            alarms: state.alarms.filter((a) => a.id !== id),
        }));
    },
}));
