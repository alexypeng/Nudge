import { create } from "zustand";
import { api, FriendOut, FriendRequestOut, UserSearchOut } from "../api/client";
import { useAuthStore } from "./authStore";

interface FriendStore {
    friends: FriendOut[];
    pendingRequests: FriendRequestOut[];
    searchResults: UserSearchOut[];
    isSearching: boolean;
    isLoading: boolean;
    error: string | null;

    fetch: () => Promise<void>;
    fetchPending: () => Promise<void>;
    fetchAll: () => Promise<void>;
    searchUsers: (query: string) => Promise<void>;
    sendRequest: (toUserId: string) => Promise<void>;
    acceptRequest: (friendshipId: string) => Promise<void>;
    declineRequest: (friendshipId: string) => Promise<void>;
    removeFriend: (friendshipId: string) => Promise<void>;
    clearSearch: () => void;
}

export const useFriendStore = create<FriendStore>((set, get) => ({
    friends: [],
    pendingRequests: [],
    searchResults: [],
    isSearching: false,
    isLoading: false,
    error: null,

    fetch: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const friends = await api.listFriends(token);
        set({ friends });
    },

    fetchPending: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const pendingRequests = await api.listPendingRequests(token);
        set({ pendingRequests });
    },

    fetchAll: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        set({ isLoading: true, error: null });
        try {
            const [friends, pendingRequests] = await Promise.all([
                api.listFriends(token),
                api.listPendingRequests(token),
            ]);
            set({ friends, pendingRequests });
        } catch (err) {
            set({ error: (err as Error).message });
        } finally {
            set({ isLoading: false });
        }
    },

    searchUsers: async (query: string) => {
        const token = useAuthStore.getState().token;
        if (!token || query.length < 2) {
            set({ searchResults: [], isSearching: false });
            return;
        }

        set({ isSearching: true });
        try {
            const searchResults = await api.searchUsers(token, query);
            set({ searchResults });
        } finally {
            set({ isSearching: false });
        }
    },

    sendRequest: async (toUserId: string) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        await api.sendFriendRequest(token, toUserId);
        // Refresh both lists since auto-accept may have occurred
        await Promise.all([get().fetch(), get().fetchPending()]);
    },

    acceptRequest: async (friendshipId: string) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const friend = await api.acceptFriendRequest(token, friendshipId);
        set((state) => ({
            friends: [...state.friends, friend],
            pendingRequests: state.pendingRequests.filter((r) => r.id !== friendshipId),
        }));
    },

    declineRequest: async (friendshipId: string) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        await api.declineFriendRequest(token, friendshipId);
        set((state) => ({
            pendingRequests: state.pendingRequests.filter((r) => r.id !== friendshipId),
        }));
    },

    removeFriend: async (friendshipId: string) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        await api.removeFriend(token, friendshipId);
        set((state) => ({
            friends: state.friends.filter((f) => f.friendship_id !== friendshipId),
        }));
    },

    clearSearch: () => set({ searchResults: [], isSearching: false }),
}));
