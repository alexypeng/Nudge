import { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFriendStore } from "@/src/stores/friendStore";
import { useAuthStore } from "@/src/stores/authStore";
import { api, UserOut } from "@/src/api/client";
import { Colors } from "@/src/theme/colors";
import { GlassCard } from "@/src/components/GlassCard";
import { TactileButton } from "@/src/components/TactileButton";
import { ErrorBanner } from "@/src/components/ErrorBanner";
import * as Haptics from "expo-haptics";

export default function AddToGroupScreen() {
    const router = useRouter();
    const { groupId } = useLocalSearchParams<{ groupId: string }>();
    const token = useAuthStore((s) => s.token);
    const friends = useFriendStore((s) => s.friends);
    const fetchFriends = useFriendStore((s) => s.fetch);

    const [members, setMembers] = useState<UserOut[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchFriends();
        if (token && groupId) {
            api.listGroupMembers(token, groupId).then(setMembers).catch((err) => {
                setError((err as Error).message);
            });
        }
    }, []);

    const memberIds = new Set(members.map((m) => m.id));
    const availableFriends = friends.filter((f) => !memberIds.has(f.user.id));

    const toggleSelect = (userId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            return next;
        });
    };

    const handleAdd = async () => {
        if (!token || !groupId || selected.size === 0) return;
        setIsAdding(true);
        setError(null);
        try {
            await Promise.all(
                Array.from(selected).map((userId) =>
                    api.addMemberToGroup(token, groupId, userId)
                )
            );
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
        } catch (err) {
            setError((err as Error).message);
            setIsAdding(false);
        }
    };

    return (
        <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pt-8 pb-8"
            style={{ backgroundColor: Colors.background }}
        >
            <Text style={styles.sectionLabel}>SELECT FRIENDS</Text>

            {availableFriends.length > 0 ? (
                <>
                    <TextInput
                        className="h-12 px-4 mb-4"
                        style={{
                            backgroundColor: Colors.surface,
                            color: Colors.textPrimary,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: Colors.border,
                            fontSize: 15,
                        }}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search friends"
                        placeholderTextColor={Colors.textDim}
                    />
                    <View
                        className="flex-row flex-wrap"
                        style={{ gap: 8 }}
                    >
                        {availableFriends
                            .filter((f) => {
                                if (!search) return true;
                                const q = search.toLowerCase();
                                return (
                                    f.user.display_name
                                        .toLowerCase()
                                        .includes(q) ||
                                    f.user.username
                                        .toLowerCase()
                                        .includes(q)
                                );
                            })
                            .map((friend) => {
                                const active = selected.has(friend.user.id);
                                return (
                                    <Pressable
                                        key={friend.friendship_id}
                                        onPress={() =>
                                            toggleSelect(friend.user.id)
                                        }
                                        style={{
                                            backgroundColor: active
                                                ? Colors.accent
                                                : Colors.surface,
                                            borderWidth: 1.5,
                                            borderColor: active
                                                ? Colors.accent
                                                : Colors.border,
                                            borderRadius: 18,
                                            padding: 16,
                                            width: "31%",
                                            aspectRatio: 1,
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 20,
                                                backgroundColor: active
                                                    ? Colors.surface
                                                    : Colors.avatarBlue,
                                                alignItems: "center",
                                                justifyContent: "center",
                                                marginBottom: 10,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 16,
                                                    fontWeight: "900",
                                                    color: active
                                                        ? Colors.accent
                                                        : Colors.surface,
                                                }}
                                            >
                                                {friend.user.display_name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text
                                            style={{
                                                fontSize: 15,
                                                fontWeight: "900",
                                                color: active
                                                    ? Colors.surface
                                                    : Colors.textPrimary,
                                                letterSpacing: -0.5,
                                                textAlign: "center",
                                            }}
                                            numberOfLines={2}
                                        >
                                            {friend.user.display_name}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                    </View>
                </>
            ) : (
                <GlassCard>
                    <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                        {friends.length === 0
                            ? "Add some friends first to invite them to groups"
                            : "All your friends are already in this group"}
                    </Text>
                </GlassCard>
            )}

            {error && (
                <ErrorBanner
                    message={error}
                    onDismiss={() => setError(null)}
                    style={{ marginTop: 8 }}
                />
            )}

            {selected.size > 0 && (
                <View className="mt-4">
                    <TactileButton
                        label={`Add ${selected.size} Friend${selected.size > 1 ? "s" : ""}`}
                        onPress={handleAdd}
                        disabled={isAdding}
                    />
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    sectionLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.textDim,
        letterSpacing: 2,
        textTransform: "uppercase",
        paddingLeft: 5,
        paddingBottom: 6,
    },
});
