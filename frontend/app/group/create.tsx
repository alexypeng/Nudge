import { useGroupStore } from "@/src/stores/groupStore";
import { useFriendStore } from "@/src/stores/friendStore";
import { useAuthStore } from "@/src/stores/authStore";
import { api } from "@/src/api/client";
import { useRouter, useNavigation } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import {
    View,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Pressable,
    StyleSheet,
} from "react-native";
import { Text, TextInput } from "@/src/components/Text";
import * as Haptics from "expo-haptics";
import { Colors } from "@/src/theme/colors";
import { DEFAULT_GROUP_ICON, GROUP_ICON_NAMES } from "@/src/theme/groupIcons";
import { GlassCard } from "@/src/components/GlassCard";
import { GroupIcon } from "@/src/components/GroupIcon";
import { HeaderSubmitButton } from "@/src/components/HeaderSubmitButton";

export default function GroupCreateScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const token = useAuthStore((s) => s.token);
    const createGroup = useGroupStore((s) => s.create);
    const friends = useFriendStore((s) => s.friends);
    const fetchFriends = useFriendStore((s) => s.fetch);

    const [name, setName] = useState("");
    const [icon, setIcon] = useState<string>(DEFAULT_GROUP_ICON);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canSubmit = !!name && !isSubmitting;

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

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <HeaderSubmitButton
                    canSubmit={canSubmit}
                    isSubmitting={isSubmitting}
                    onSubmit={handleGroupCreate}
                    accessibilityLabel="Create group"
                />
            ),
        });
    }, [navigation, canSubmit, isSubmitting, handleGroupCreate]);

    return (
        // iOS: the ScrollView insets itself for the keyboard, which stays correct under the
        // native header and inside the modal sheet. Android: resize the container instead.
        <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? undefined : "height"}
            style={{ backgroundColor: Colors.background }}
        >
            <ScrollView
                className="flex-1"
                contentContainerClassName="px-5 pt-4 pb-8"
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets
            >
                <Text style={styles.label}>ICON</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                    style={{ marginBottom: 16, flexGrow: 0 }}
                >
                    {GROUP_ICON_NAMES.map((iconName) => {
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
                                <GroupIcon
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
                    className="h-14 px-4 mb-5"
                    style={{
                        backgroundColor: Colors.surface,
                        color: Colors.textPrimary,
                        borderRadius: 14,
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
                            className="h-14 px-4 mb-4"
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
    label: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.textDim,
        letterSpacing: 2,
        textTransform: "uppercase",
        paddingLeft: 5,
        paddingBottom: 6,
    },
});
