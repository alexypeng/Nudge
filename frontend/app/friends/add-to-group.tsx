import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
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
                availableFriends.map((friend) => {
                    const isSelected = selected.has(friend.user.id);
                    return (
                        <Pressable
                            key={friend.friendship_id}
                            onPress={() => toggleSelect(friend.user.id)}
                        >
                            <GlassCard
                                style={{
                                    marginBottom: 8,
                                    borderColor: isSelected ? Colors.borderHot : Colors.border,
                                }}
                            >
                                <View className="flex-row items-center">
                                    <View
                                        style={[
                                            styles.checkbox,
                                            isSelected && styles.checkboxSelected,
                                        ]}
                                    >
                                        {isSelected && (
                                            <Text style={styles.checkmark}>✓</Text>
                                        )}
                                    </View>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>
                                            {friend.user.display_name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={styles.name} numberOfLines={1}>
                                        {friend.user.display_name}
                                    </Text>
                                </View>
                            </GlassCard>
                        </Pressable>
                    );
                })
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
        fontSize: 10,
        fontWeight: "400",
        color: Colors.textDim,
        letterSpacing: 2.5,
        textTransform: "uppercase",
        marginBottom: 6,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: Colors.border,
        marginRight: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    checkboxSelected: {
        backgroundColor: Colors.accent,
        borderColor: Colors.accent,
    },
    checkmark: {
        fontSize: 14,
        fontWeight: "900",
        color: Colors.surface,
    },
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
});
