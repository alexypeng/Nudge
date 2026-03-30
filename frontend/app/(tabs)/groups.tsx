import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/src/theme/colors";
import { useGroupStore } from "@/src/stores/groupStore";
import { GroupCard } from "@/src/components/GroupCard";
import { GlassCard } from "@/src/components/GlassCard";
import { TactileButton } from "@/src/components/TactileButton";
import { ArcadeSpinner } from "@/src/components/ArcadeSpinner";
import { ErrorBanner } from "@/src/components/ErrorBanner";
import { useEffect } from "react";

export default function GroupsScreen() {
    const router = useRouter();
    const groups = useGroupStore((s) => s.groups);
    const fetchGroups = useGroupStore((s) => s.fetch);
    const isLoading = useGroupStore((s) => s.isLoading);
    const error = useGroupStore((s) => s.error);

    useEffect(() => {
        fetchGroups();
    }, []);

    return (
        <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pt-14 pb-8"
            style={{ backgroundColor: Colors.background }}
        >
            <Text
                style={{
                    fontSize: 10,
                    fontWeight: "400",
                    color: Colors.textDim,
                    letterSpacing: 2.5,
                    textTransform: "uppercase",
                }}
            >
                MY GROUPS
            </Text>

            {error && (
                <ErrorBanner
                    message={error}
                    onRetry={fetchGroups}
                    style={{ marginTop: 8, marginBottom: 4 }}
                />
            )}

            <View className="mt-2">
                {isLoading && groups.length === 0 ? (
                    <ArcadeSpinner />
                ) : groups.length > 0 ? (
                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                        {groups.map((group) => (
                            <Pressable
                                key={group.id}
                                onPress={() =>
                                    router.push({
                                        pathname: "/group/[id]",
                                        params: { id: group.id },
                                    })
                                }
                                style={{
                                    backgroundColor: Colors.surface,
                                    borderWidth: 1.5,
                                    borderColor: Colors.border,
                                    borderRadius: 18,
                                    padding: 16,
                                    width: "31%",
                                    aspectRatio: 1,
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                            >
                                <Ionicons
                                    name={(group.icon as keyof typeof Ionicons.glyphMap) || "people"}
                                    size={40}
                                    color={Colors.accent}
                                    style={{ marginBottom: 10 }}
                                />
                                <Text
                                    style={{
                                        fontSize: 15,
                                        fontWeight: "900",
                                        color: Colors.textPrimary,
                                        letterSpacing: -0.5,
                                    }}
                                    numberOfLines={2}
                                >
                                    {group.name}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                ) : (
                    <GlassCard>
                        <Text
                            style={{
                                fontSize: 13,
                                color: Colors.textSecondary,
                            }}
                        >
                            Join or create a group to get started
                        </Text>
                    </GlassCard>
                )}
            </View>

            <View className="mt-4">
                <TactileButton
                    label="Create Group"
                    onPress={() => {
                        router.push("/group/create");
                    }}
                />
            </View>
        </ScrollView>
    );
}
