import { create } from "zustand";
import { api, GroupCreate, GroupOut, GroupUpdate } from "../api/client";
import { useAuthStore } from "./authStore";

interface GroupStore {
    groups: GroupOut[];

    fetch: () => Promise<void>;
    create: (data: GroupCreate) => Promise<void>;
    update: (id: string, data: GroupUpdate) => Promise<void>;
    join: (id: string) => Promise<void>;
    leave: (id: string) => Promise<void>;
}

export const useGroupStore = create<GroupStore>((set, get) => ({
    groups: [],

    fetch: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const groups = await api.listGroups(token);
        set({ groups });
    },
    create: async (data) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const group = await api.createGroup(token, data);
        set((state) => ({ groups: [...state.groups, group] }));
    },
    update: async (id, data) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const updated = await api.updateGroup(token, id, data);
        set((state) => ({
            groups: state.groups.map((g) => (g.id === id ? updated : g)),
        }));
    },
    join: async (id) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const group = await api.joinGroup(token, id);
        set((state) => ({ groups: [...state.groups, group] }));
    },
    leave: async (id) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        await api.leaveGroup(token, id);
        set((state) => ({ groups: state.groups.filter((g) => g.id !== id) }));
    },
}));
