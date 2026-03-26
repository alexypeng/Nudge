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

const sortGroups = (groups: GroupOut[]) =>
    [...groups].sort((a, b) => a.name.localeCompare(b.name));

export const useGroupStore = create<GroupStore>((set, get) => ({
    groups: [],

    fetch: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const groups = await api.listGroups(token);
        set({ groups: sortGroups(groups) });
    },
    create: async (data) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const group = await api.createGroup(token, data);
        set((state) => ({ groups: sortGroups([...state.groups, group]) }));
    },
    update: async (id, data) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const updated = await api.updateGroup(token, id, data);
        set((state) => ({
            groups: sortGroups(state.groups.map((g) => (g.id === id ? updated : g))),
        }));
    },
    join: async (id) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const group = await api.joinGroup(token, id);
        set((state) => ({ groups: sortGroups([...state.groups, group]) }));
    },
    leave: async (id) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        await api.leaveGroup(token, id);
        set((state) => ({ groups: state.groups.filter((g) => g.id !== id) }));
    },
}));
