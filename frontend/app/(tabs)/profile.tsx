import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/src/stores/authStore";
import { Colors } from "@/src/theme/colors";
import { TactileButton } from "@/src/components/TactileButton";
import { GlassCard } from "@/src/components/GlassCard";

export default function ProfileScreen() {
    const router = useRouter();

    const displayName = useAuthStore((s) => s.user?.display_name);
    const email = useAuthStore((s) => s.user?.email);
    const timezone = useAuthStore((s) => s.user?.timezone);
    const logout = useAuthStore((s) => s.logout);

    const initial = displayName?.charAt(0).toUpperCase() ?? "?";

    const handleLogout = () => {
        logout();
        router.replace("/(auth)/login");
    };

    return (
        <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pt-14 pb-8 items-center"
            style={{ backgroundColor: Colors.background }}
        >
            {/* Settings Gear */}
            <Pressable
                onPress={() => router.push("/settings")}
                style={{ position: "absolute", top: 56, right: 20 }}
                hitSlop={12}
            >
                <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
            </Pressable>

            {/* Avatar */}
            <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: Colors.avatarBlue }}
            >
                <Text
                    style={{
                        fontSize: 24,
                        fontWeight: "900",
                        color: Colors.surface,
                    }}
                >
                    {initial}
                </Text>
            </View>

            {/* Name & Email */}
            <Text
                className="mb-1"
                style={{
                    fontSize: 15,
                    fontWeight: "900",
                    color: Colors.textPrimary,
                    letterSpacing: -0.5,
                }}
            >
                {displayName ?? "Unknown"}
            </Text>
            <Text
                className="mb-8"
                style={{
                    fontSize: 13,
                    color: Colors.textSecondary,
                }}
            >
                {email}
            </Text>

            {/* Info Card */}
            <GlassCard className="w-full mb-8">
                <View className="mb-4">
                    <Text
                        style={{
                            fontSize: 10,
                            fontWeight: "400",
                            color: Colors.textDim,
                            letterSpacing: 2.5,
                            textTransform: "uppercase",
                        }}
                    >
                        EMAIL
                    </Text>
                    <Text
                        className="mt-1"
                        style={{
                            fontSize: 13,
                            color: Colors.textPrimary,
                        }}
                    >
                        {email}
                    </Text>
                </View>
                <View
                    className="mb-4"
                    style={{
                        height: 1,
                        backgroundColor: "rgba(255,255,255,0.05)",
                    }}
                />
                <View>
                    <Text
                        style={{
                            fontSize: 10,
                            fontWeight: "400",
                            color: Colors.textDim,
                            letterSpacing: 2.5,
                            textTransform: "uppercase",
                        }}
                    >
                        TIMEZONE
                    </Text>
                    <Text
                        className="mt-1"
                        style={{
                            fontSize: 13,
                            color: Colors.textPrimary,
                        }}
                    >
                        {timezone}
                    </Text>
                </View>
            </GlassCard>

            {/* Logout */}
            <View className="w-full">
                <TactileButton
                    label="Sign Out"
                    variant="danger"
                    onPress={handleLogout}
                />
            </View>
        </ScrollView>
    );
}
