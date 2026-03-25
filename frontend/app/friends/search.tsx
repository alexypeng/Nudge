import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from "react-native";
import { useFriendStore } from "@/src/stores/friendStore";
import { Colors } from "@/src/theme/colors";
import { GlassCard } from "@/src/components/GlassCard";
import * as Haptics from "expo-haptics";

export default function SearchFriendsScreen() {
    const [query, setQuery] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const searchResults = useFriendStore((s) => s.searchResults);
    const isSearching = useFriendStore((s) => s.isSearching);
    const friends = useFriendStore((s) => s.friends);
    const pending = useFriendStore((s) => s.pendingRequests);
    const searchUsers = useFriendStore((s) => s.searchUsers);
    const sendRequest = useFriendStore((s) => s.sendRequest);
    const clearSearch = useFriendStore((s) => s.clearSearch);

    const friendIds = new Set(friends.map((f) => f.user.id));
    const pendingIds = new Set(pending.map((r) => r.from_user.id));
    const [sentIds, setSentIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        return () => {
            clearSearch();
        };
    }, []);

    const handleSearch = (text: string) => {
        setQuery(text);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            searchUsers(text);
        }, 300);
    };

    const handleSendRequest = async (userId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await sendRequest(userId);
            setSentIds((prev) => new Set(prev).add(userId));
        } catch {}
    };

    const getStatus = (userId: string) => {
        if (friendIds.has(userId)) return "friends";
        if (pendingIds.has(userId)) return "pending";
        if (sentIds.has(userId)) return "sent";
        return "none";
    };

    return (
        <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pt-8 pb-8"
            style={{ backgroundColor: Colors.background }}
            keyboardShouldPersistTaps="handled"
        >
            {/* Search Input */}
            <TextInput
                className="h-12 px-4"
                style={{
                    backgroundColor: Colors.surface,
                    color: Colors.textPrimary,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    fontSize: 15,
                }}
                placeholder="Search by name..."
                placeholderTextColor={Colors.textDim}
                value={query}
                onChangeText={handleSearch}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
            />

            {/* Results */}
            <View className="mt-4">
                {isSearching && (
                    <Text style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 8 }}>
                        Searching...
                    </Text>
                )}

                {!isSearching && query.length >= 2 && searchResults.length === 0 && (
                    <GlassCard>
                        <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                            No users found
                        </Text>
                    </GlassCard>
                )}

                {searchResults.map((user) => {
                    const status = getStatus(user.id);
                    return (
                        <GlassCard key={user.id} style={{ marginBottom: 8 }}>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1">
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>
                                            {user.display_name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={styles.name} numberOfLines={1}>
                                        {user.display_name}
                                    </Text>
                                </View>

                                {status === "none" ? (
                                    <Pressable
                                        style={styles.addButton}
                                        onPress={() => handleSendRequest(user.id)}
                                    >
                                        <Text style={styles.addText}>Add</Text>
                                    </Pressable>
                                ) : (
                                    <View style={styles.statusPill}>
                                        <Text style={styles.statusText}>
                                            {status === "friends" ? "Friends" : "Pending"}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </GlassCard>
                    );
                })}
            </View>
        </ScrollView>
    );
}

// TODO: migrate to Unistyles
const styles = StyleSheet.create({
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.avatarBlue,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: "900",
        color: Colors.surface,
    },
    name: {
        fontSize: 15,
        fontWeight: "700",
        color: Colors.textPrimary,
        letterSpacing: -0.5,
        flexShrink: 1,
    },
    addButton: {
        backgroundColor: Colors.accent,
        borderRadius: 99,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    addText: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.surface,
    },
    statusPill: {
        backgroundColor: Colors.accentSubtle,
        borderWidth: 1,
        borderColor: "rgba(96,165,250,0.25)",
        borderRadius: 99,
        paddingHorizontal: 9,
        paddingVertical: 3,
    },
    statusText: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.accent,
    },
});
