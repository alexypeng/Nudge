import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { useFriendStore } from "@/src/stores/friendStore";
import { Colors } from "@/src/theme/colors";
import { GlassCard } from "@/src/components/GlassCard";
import { TactileButton } from "@/src/components/TactileButton";
import { ArcadeSpinner } from "@/src/components/ArcadeSpinner";
import { ErrorBanner } from "@/src/components/ErrorBanner";
import * as Haptics from "expo-haptics";

export default function FriendsTab() {
    const router = useRouter();
    const friends = useFriendStore((s) => s.friends);
    const pending = useFriendStore((s) => s.pendingRequests);
    const fetchAll = useFriendStore((s) => s.fetchAll);
    const acceptRequest = useFriendStore((s) => s.acceptRequest);
    const declineRequest = useFriendStore((s) => s.declineRequest);
    const removeFriend = useFriendStore((s) => s.removeFriend);
    const isLoading = useFriendStore((s) => s.isLoading);
    const storeError = useFriendStore((s) => s.error);
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        fetchAll();
    }, []);

    const handleAction = async (fn: () => Promise<void>) => {
        setActionError(null);
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await fn();
        } catch (err) {
            setActionError((err as Error).message);
            setTimeout(() => setActionError(null), 5000);
        }
    };

    const isFirstLoad = isLoading && friends.length === 0 && pending.length === 0;

    return (
        <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pt-14 pb-24"
            contentContainerStyle={{ flexGrow: 1 }}
            style={{ backgroundColor: Colors.background }}
        >
            {storeError && (
                <ErrorBanner
                    message={storeError}
                    onRetry={fetchAll}
                    style={{ marginBottom: 8 }}
                />
            )}

            {actionError && (
                <Text style={{ fontSize: 13, color: Colors.statusLate, marginBottom: 8 }}>
                    {actionError}
                </Text>
            )}

            {isFirstLoad ? (
                <ArcadeSpinner style={{ marginTop: 40 }} />
            ) : friends.length === 0 && pending.length === 0 ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <UserPlus color={Colors.textDim} size={48} strokeWidth={1.5} />
                    <Text
                        style={{
                            fontSize: 15,
                            fontWeight: "700",
                            color: Colors.textSecondary,
                            marginTop: 16,
                        }}
                    >
                        No friends yet
                    </Text>
                    <Text
                        style={{
                            fontSize: 13,
                            color: Colors.textDim,
                            marginTop: 4,
                        }}
                    >
                        Add some to build groups faster
                    </Text>
                </View>
            ) : (
            <>

            {/* Pending Requests */}
            {pending.length > 0 && (
                <View>
                    <Text style={styles.sectionLabel}>REQUESTS</Text>
                    {pending.map((request) => (
                        <GlassCard key={request.id} style={{ marginBottom: 8 }}>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1">
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>
                                            {request.from_user.display_name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.name} numberOfLines={1}>
                                            {request.from_user.display_name}
                                        </Text>
                                        <Text style={styles.username} numberOfLines={1}>
                                            @{request.from_user.username}
                                        </Text>
                                    </View>
                                </View>
                                <View className="flex-row" style={{ gap: 8 }}>
                                    <Pressable
                                        style={styles.acceptButton}
                                        onPress={() => handleAction(() => acceptRequest(request.id))}
                                    >
                                        <Text style={styles.acceptText}>Accept</Text>
                                    </Pressable>
                                    <Pressable
                                        style={styles.declineButton}
                                        onPress={() => handleAction(() => declineRequest(request.id))}
                                    >
                                        <Text style={styles.declineText}>Decline</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </GlassCard>
                    ))}
                </View>
            )}

            {/* Friends List */}
            {friends.length > 0 && (
                <View className={pending.length > 0 ? "mt-6" : ""}>
                    <Text style={styles.sectionLabel}>FRIENDS</Text>
                    {friends.map((friend) => (
                        <GlassCard key={friend.friendship_id} style={{ marginBottom: 8 }}>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1">
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>
                                            {friend.user.display_name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.name} numberOfLines={1}>
                                            {friend.user.display_name}
                                        </Text>
                                        <Text style={styles.username} numberOfLines={1}>
                                            @{friend.user.username}
                                        </Text>
                                    </View>
                                </View>
                                <Pressable
                                    onPress={() => handleAction(() => removeFriend(friend.friendship_id))}
                                >
                                    <Text style={styles.removeText}>Remove</Text>
                                </Pressable>
                            </View>
                        </GlassCard>
                    ))}
                </View>
            )}

            </>
            )}

        </ScrollView>
        <View style={{ position: "absolute", bottom: 16, left: 20, right: 20 }}>
            <TactileButton
                label="Add Friends"
                onPress={() => router.push("/friends/search")}
            />
        </View>
        </View>
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
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.avatarPurple,
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
    username: {
        fontSize: 12,
        fontWeight: "400",
        color: Colors.textSecondary,
        marginTop: 1,
    },
    acceptButton: {
        backgroundColor: Colors.accent,
        borderRadius: 99,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    acceptText: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.surface,
    },
    declineButton: {
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderRadius: 99,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    declineText: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.textSecondary,
    },
    removeText: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.statusLate,
    },
});
