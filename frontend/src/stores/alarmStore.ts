import { create } from "zustand";
import { api, AlarmCreate, AlarmOut, AlarmUpdate } from "@/src/api/client";

interface AlarmState {
    alarms: AlarmOut[];

    fetch: (token: string) => Promise<void>;
    create: (token: string, data: AlarmCreate) => Promise<void>;
    update: (token: string, id: string, data: AlarmUpdate) => Promise<void>;
    delete: (token: string, id: string) => Promise<void>;
}

export const useAlarmStore = create<AlarmState>((set, get) => ({
    alarms: [],

    fetch: async (token) => {
        const alarms = await api.listAlarms(token);
        set({ alarms });
    },
    create: async (token, data) => {
        const alarm = await api.createAlarm(token, data);
        set((state) => ({ alarms: [...state.alarms, alarm] }));
    },
    update: async (token, id, data) => {
        const updated = await api.updateAlarm(token, id, data);
        set((state) => ({
            alarms: state.alarms.map((a) => (a.id === id ? updated : a)),
        }));
    },
    delete: async (token, id) => {
        await api.deleteAlarm(token, id);
        set((state) => ({
            alarms: state.alarms.filter((a) => a.id !== id),
        }));
    },
}));
