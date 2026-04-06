import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Users } from "lucide-react-native";
import { Colors } from "@/src/theme/colors";
import { useGroupStore } from "@/src/stores/groupStore";
import { TactileButton } from "@/src/components/TactileButton";
import { ArcadeSpinner } from "@/src/components/ArcadeSpinner";
import { ErrorBanner } from "@/src/components/ErrorBanner";
import { usePolling } from "@/src/hooks/usePolling";

export default function GroupsScreen() {
    const router = useRouter();
    const groups = useGroupStore((s) => s.groups);
    const fetchGroups = useGroupStore((s) => s.fetch);
    const isLoading = useGroupStore((s) => s.isLoading);
    const error = useGroupStore((s) => s.error);

    usePolling(() => {
        fetchGroups();
    }, 10000);

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: Colors.background,
                paddingTop: 15,
            }}
        >
            <ScrollView
                className="flex-1"
                contentContainerClassName="px-5 pt-14 pb-24"
                contentContainerStyle={{ flexGrow: 1 }}
                style={{ backgroundColor: Colors.background }}
            >
                {error && (
                    <ErrorBanner
                        message={error}
                        onRetry={fetchGroups}
                        style={{ marginBottom: 8 }}
                    />
                )}

                {isLoading && groups.length === 0 ? (
                    <ArcadeSpinner style={{ marginTop: 40 }} />
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
                                    name={
                                        (group.icon as keyof typeof Ionicons.glyphMap) ||
                                        "people"
                                    }
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
                                        textAlign: "center",
                                    }}
                                    numberOfLines={2}
                                >
                                    {group.name}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                ) : (
                    <View
                        style={{
                            flex: 1,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Users
                            color={Colors.textDim}
                            size={96}
                            strokeWidth={1.5}
                        />
                        <Text
                            style={{
                                fontSize: 15,
                                fontWeight: "700",
                                color: Colors.textSecondary,
                                marginTop: 16,
                            }}
                        >
                            No groups yet
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                color: Colors.textDim,
                                marginTop: 4,
                            }}
                        >
                            Create or join a group to get started
                        </Text>
                    </View>
                )}
            </ScrollView>
            <View
                style={{
                    position: "absolute",
                    bottom: 16,
                    left: 20,
                    right: 20,
                }}
            >
                <TactileButton
                    label="Create Group"
                    onPress={() => router.push("/group/create")}
                />
            </View>
        </View>
    );
}
