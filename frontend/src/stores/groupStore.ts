import { create } from "zustand";
import { api, AlarmOut, GroupCreate, GroupOut, GroupUpdate, UserOut } from "../api/client";
import { useAuthStore } from "./authStore";
import { useAlarmStore } from "./alarmStore";
import { cancelAlarm } from "@/src/services/alarmScheduler";

interface GroupStore {
    groups: GroupOut[];
    /** members keyed by group id */
    members: Record<string, UserOut[]>;
    /** all alarms in a group (all members), keyed by group id */
    groupAlarms: Record<string, AlarmOut[]>;
    /** latest event status per alarm id */
    alarmStatuses: Record<string, string>;
    isLoading: boolean;
    error: string | null;

    fetch: () => Promise<void>;
    fetchGroupDetail: (groupId: string) => Promise<void>;
    create: (data: GroupCreate) => Promise<GroupOut>;
    update: (id: string, data: GroupUpdate) => Promise<void>;
    join: (id: string) => Promise<void>;
    leave: (id: string) => Promise<void>;
}

const sortGroups = (groups: GroupOut[]) =>
    [...groups].sort((a, b) => a.name.localeCompare(b.name));

export const useGroupStore = create<GroupStore>((set) => ({
    groups: [],
    members: {},
    groupAlarms: {},
    alarmStatuses: {},
    isLoading: false,
    error: null,

    fetch: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        set({ isLoading: true, error: null });
        try {
            const groups = await api.listGroups(token);
            set({ groups: sortGroups(groups) });
        } catch (err) {
            set({ error: (err as Error).message });
        } finally {
            set({ isLoading: false });
        }
    },

    fetchGroupDetail: async (groupId: string) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        try {
            const [members, alarms] = await Promise.all([
                api.listGroupMembers(token, groupId),
                api.listGroupAlarms(token, groupId),
            ]);

            const statuses: Record<string, string> = {};
            await Promise.all(
                alarms.map(async (alarm) => {
                    try {
                        const event = await api.getLatestEvent(token, alarm.id);
                        if (event) statuses[alarm.id] = event.status;
                    } catch {}
                }),
            );

            set((state) => ({
                members: { ...state.members, [groupId]: members },
                groupAlarms: { ...state.groupAlarms, [groupId]: alarms },
                alarmStatuses: { ...state.alarmStatuses, ...statuses },
            }));
        } catch {}
    },
    create: async (data) => {
        const token = useAuthStore.getState().token;
        if (!token) throw new Error("Not authenticated");

        const group = await api.createGroup(token, data);
        set((state) => ({ groups: sortGroups([...state.groups, group]) }));
        return group;
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

        const alarmState = useAlarmStore.getState();
        const groupAlarms = alarmState.alarms.filter((a) => a.group_id === id);
        await Promise.all(
            groupAlarms.map((a) => cancelAlarm(a.id).catch(() => {}))
        );
        useAlarmStore.setState({
            alarms: alarmState.alarms.filter((a) => a.group_id !== id),
        });

        set((state) => ({ groups: state.groups.filter((g) => g.id !== id) }));
    },
}));
