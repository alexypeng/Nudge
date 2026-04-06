import { useGroupStore } from "@/src/stores/groupStore";
import { useFriendStore } from "@/src/stores/friendStore";
import { useAuthStore } from "@/src/stores/authStore";
import { api } from "@/src/api/client";
import { useRouter, useNavigation } from "expo-router";
import { UserPlus, Check } from "lucide-react-native";
import { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/src/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "@/src/components/GlassCard";

const ICON_OPTIONS: (keyof typeof Ionicons.glyphMap)[] = [
    "people",
    "alarm",
    "sunny",
    "fitness",
    "book",
    "moon",
    "trophy",
    "flame",
    "star",
    "musical-notes",
    "heart",
    "rocket",
    "football",
    "cafe",
    "code-slash",
    "paw",
];

export default function GroupCreateScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const token = useAuthStore((s) => s.token);
    const createGroup = useGroupStore((s) => s.create);
    const friends = useFriendStore((s) => s.friends);
    const fetchFriends = useFriendStore((s) => s.fetch);

    const [name, setName] = useState("");
    const [icon, setIcon] = useState<string>("people");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const insets = useSafeAreaInsets();
    const canSubmit = !!name && !isSubmitting;
    const btnY = useSharedValue(0);
    const btnAnim = useAnimatedStyle(() => ({
        transform: [{ translateY: btnY.value }],
    }));

    useEffect(() => {
        fetchFriends();
    }, []);

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

    const handleGroupCreate = useCallback(async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            const group = await createGroup({ name, icon });
            if (token && selected.size > 0) {
                await Promise.all(
                    Array.from(selected).map((userId) =>
                        api.addMemberToGroup(token, group.id, userId),
                    ),
                );
            }
            router.back();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    }, [name, icon, selected, token]);

    useEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, []);

    return (
        <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ backgroundColor: Colors.background }}
        >
            <View
                style={[
                    styles.header,
                    { paddingTop: insets.top - 32, paddingBottom: 24 },
                ]}
            >
                <Text style={styles.headerTitle}>New Group</Text>
                <Pressable
                    onPressIn={() => {
                        btnY.value = withSpring(2, {
                            damping: 28,
                            stiffness: 600,
                        });
                    }}
                    onPressOut={() => {
                        btnY.value = withSpring(0, {
                            damping: 28,
                            stiffness: 600,
                        });
                    }}
                    onPress={() => {
                        if (!canSubmit) return;
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        handleGroupCreate();
                    }}
                    disabled={!canSubmit}
                    style={styles.headerBtnHit}
                >
                    <Animated.View
                        style={[
                            styles.headerBtn,
                            { opacity: canSubmit ? 1 : 0.3 },
                            btnAnim,
                        ]}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator
                                size="small"
                                color={Colors.surface}
                            />
                        ) : (
                            <Check
                                color={Colors.surface}
                                size={18}
                                strokeWidth={3}
                            />
                        )}
                    </Animated.View>
                </Pressable>
            </View>
            <View style={styles.divider} />
            <ScrollView
                className="flex-1"
                contentContainerClassName="px-5 pt-4 pb-8"
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.label}>ICON</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                    style={{ marginBottom: 16, flexGrow: 0 }}
                >
                    {ICON_OPTIONS.map((iconName) => {
                        const isSelected = icon === iconName;
                        return (
                            <Pressable
                                key={iconName}
                                onPress={() => setIcon(iconName)}
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: isSelected
                                        ? Colors.accentSubtle
                                        : Colors.surface,
                                    borderWidth: 1.5,
                                    borderColor: isSelected
                                        ? Colors.borderHot
                                        : Colors.border,
                                }}
                            >
                                <Ionicons
                                    name={iconName}
                                    size={22}
                                    color={
                                        isSelected
                                            ? Colors.accent
                                            : Colors.textSecondary
                                    }
                                />
                            </Pressable>
                        );
                    })}
                </ScrollView>

                <Text style={styles.label}>GROUP NAME</Text>
                <TextInput
                    className="h-12 px-4 mb-5"
                    style={{
                        backgroundColor: Colors.surface,
                        color: Colors.textPrimary,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: Colors.border,
                        fontSize: 15,
                    }}
                    value={name}
                    onChangeText={setName}
                    placeholder="Early Birds"
                    placeholderTextColor={Colors.textDim}
                    autoFocus
                />

                <Text style={styles.label}>ADD MEMBERS</Text>
                {friends.length > 0 ? (
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
                            className="flex-row flex-wrap mb-2"
                            style={{ gap: 8 }}
                        >
                            {friends
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
                    <View style={{ alignItems: "center", paddingVertical: 24 }}>
                        <UserPlus
                            color={Colors.textDim}
                            size={36}
                            strokeWidth={1.5}
                        />
                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: "700",
                                color: Colors.textSecondary,
                                marginTop: 12,
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
                            Add friends first to invite them
                        </Text>
                    </View>
                )}

                {error && (
                    <Text
                        className="mt-3"
                        style={{ fontSize: 13, color: Colors.statusLate }}
                    >
                        {error}
                    </Text>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "900",
        color: Colors.textPrimary,
        letterSpacing: -0.5,
    },
    headerBtnHit: {
        position: "absolute",
        right: 20,
    },
    headerBtn: {
        width: 42,
        height: 42,
        borderRadius: 99,
        backgroundColor: Colors.accent,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: Colors.accentPress,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
    divider: {
        height: 1,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
    },
    label: {
        fontSize: 10,
        fontWeight: "400",
        color: Colors.textDim,
        letterSpacing: 2.5,
        textTransform: "uppercase",
        marginBottom: 6,
    },
});
