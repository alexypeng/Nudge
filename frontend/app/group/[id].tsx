import { useAlarmStore } from "@/src/stores/alarmStore";
import { useGroupStore } from "@/src/stores/groupStore";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/src/theme/colors";
import { AlarmCard } from "@/src/components/AlarmCard";
import { GlassCard } from "@/src/components/GlassCard";
import { TactileButton } from "@/src/components/TactileButton";
import { api, UserOut } from "@/src/api/client";
import { useAuthStore } from "@/src/stores/authStore";

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

export default function GroupScreen() {
    const router = useRouter();
    const navigation = useNavigation();

    const { id } = useLocalSearchParams<{ id: string }>();
    const group = useGroupStore((s) => s.groups.find((g) => g.id === id));
    const leaveGroup = useGroupStore((s) => s.leave);
    const updateGroup = useGroupStore((s) => s.update);
    const allAlarms = useAlarmStore((s) => s.alarms);
    const fetchAlarms = useAlarmStore((s) => s.fetch);
    const alarms = useMemo(
        () => allAlarms.filter((a) => a.group_id === id),
        [allAlarms, id],
    );

    const token = useAuthStore((s) => s.token);
    const [members, setMembers] = useState<UserOut[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [groupName, setGroupName] = useState(group?.name ?? "");
    const [groupIcon, setGroupIcon] = useState(group?.icon ?? "people");

    useEffect(() => {
        fetchAlarms();
        if (token) {
            api.listGroupMembers(token, id).then(setMembers).catch(() => {});
        }
    }, []);

    useEffect(() => {
        navigation.setOptions({
            headerTitle: () => (
                <Pressable
                    onPress={() => setIsEditing(true)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                    <Ionicons
                        name={(group?.icon as keyof typeof Ionicons.glyphMap) || "people"}
                        size={18}
                        color={Colors.accent}
                    />
                    <Text
                        style={{
                            fontSize: 17,
                            fontWeight: "600",
                            color: Colors.textPrimary,
                        }}
                    >
                        {group?.name ?? "Group"}
                    </Text>
                </Pressable>
            ),
        });
    }, [group?.name, group?.icon]);

    const handleEditSave = async () => {
        setIsEditing(false);
        const nameChanged = groupName !== group?.name && !!groupName;
        const iconChanged = groupIcon !== group?.icon;
        if (!nameChanged && !iconChanged) {
            setGroupName(group?.name ?? "");
            setGroupIcon(group?.icon ?? "people");
            return;
        }
        try {
            const updates: { name?: string; icon?: string } = {};
            if (nameChanged) updates.name = groupName;
            if (iconChanged) updates.icon = groupIcon;
            await updateGroup(id, updates);
        } catch (err) {
            setError((err as Error).message);
            setGroupName(group?.name ?? "");
            setGroupIcon(group?.icon ?? "people");
        }
    };

    const handleLeave = async () => {
        try {
            await leaveGroup(id);
            router.back();
        } catch (err) {
            setError((err as Error).message);
        }
    };

    if (!group) {
        return (
            <View
                className="flex-1 items-center justify-center"
                style={{ backgroundColor: Colors.background }}
            >
                <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                    Group not found
                </Text>
            </View>
        );
    }

    return (
        <>
        <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pt-8 pb-8"
            style={{ backgroundColor: Colors.background }}
        >
            {/* Alarms */}
            <Text
                style={{
                    fontSize: 10,
                    fontWeight: "400",
                    color: Colors.textDim,
                    letterSpacing: 2.5,
                    textTransform: "uppercase",
                    marginBottom: 6,
                }}
            >
                ALARMS
            </Text>
            {alarms.length > 0 ? (
                alarms.map((alarm) => (
                    <AlarmCard
                        key={alarm.id}
                        alarm={alarm}
                        className="mb-2"
                        onPress={() =>
                            router.push({
                                pathname: "/alarm/[id]",
                                params: { id: alarm.id },
                            })
                        }
                        onToggle={(isActive) => useAlarmStore.getState().update(alarm.id, { is_active: isActive })}
                    />
                ))
            ) : (
                <GlassCard>
                    <Text
                        style={{
                            fontSize: 13,
                            color: Colors.textSecondary,
                        }}
                    >
                        No alarms in this group yet
                    </Text>
                </GlassCard>
            )}

            <View className="mt-4">
                <TactileButton
                    label="New Alarm"
                    onPress={() =>
                        router.push({
                            pathname: "/alarm/create",
                            params: { groupId: id },
                        })
                    }
                />
            </View>

            {/* Members */}
            <Text
                className="mt-6"
                style={{
                    fontSize: 10,
                    fontWeight: "400",
                    color: Colors.textDim,
                    letterSpacing: 2.5,
                    textTransform: "uppercase",
                    marginBottom: 6,
                }}
            >
                MEMBERS
            </Text>
            {members.length > 0 ? (
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {members.map((member) => (
                        <View
                            key={member.id}
                            className="items-center"
                            style={{
                                backgroundColor: Colors.surface,
                                borderWidth: 1.5,
                                borderColor: Colors.border,
                                borderRadius: 18,
                                padding: 12,
                                width: 80,
                            }}
                        >
                            <View
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    backgroundColor: Colors.avatarBlue,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginBottom: 6,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: "900",
                                        color: Colors.surface,
                                    }}
                                >
                                    {member.display_name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <Text
                                style={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    color: Colors.textPrimary,
                                    textAlign: "center",
                                }}
                                numberOfLines={1}
                            >
                                {member.display_name}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : (
                <GlassCard>
                    <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                        No members yet
                    </Text>
                </GlassCard>
            )}

            <View className="mt-4">
                <TactileButton
                    label="Add Members"
                    onPress={() =>
                        router.push({
                            pathname: "/friends/add-to-group",
                            params: { groupId: id },
                        })
                    }
                />
            </View>

            {/* Danger Zone */}
            <Text
                className="mt-8"
                style={{
                    fontSize: 10,
                    fontWeight: "400",
                    color: Colors.textDim,
                    letterSpacing: 2.5,
                    textTransform: "uppercase",
                    marginBottom: 6,
                }}
            >
                DANGER ZONE
            </Text>

            {error && (
                <Text
                    className="mb-3"
                    style={{ fontSize: 13, color: Colors.statusLate }}
                >
                    {error}
                </Text>
            )}

            <TactileButton
                label="Leave Group"
                variant="danger"
                onPress={handleLeave}
            />
        </ScrollView>

            {/* Edit Modal */}
            <Modal
                visible={isEditing}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setGroupName(group?.name ?? "");
                    setGroupIcon(group?.icon ?? "people");
                    setIsEditing(false);
                }}
            >
                <Pressable
                    className="flex-1 items-center justify-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                    onPress={() => {
                        setGroupName(group?.name ?? "");
                        setGroupIcon(group?.icon ?? "people");
                        setIsEditing(false);
                    }}
                >
                    <Pressable
                        className="w-4/5"
                        style={{
                            backgroundColor: Colors.surface,
                            borderRadius: 18,
                            borderWidth: 1.5,
                            borderColor: Colors.border,
                            padding: 20,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 10,
                                fontWeight: "400",
                                color: Colors.textDim,
                                letterSpacing: 2.5,
                                textTransform: "uppercase",
                                marginBottom: 6,
                            }}
                        >
                            ICON
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                            style={{ marginBottom: 16, flexGrow: 0 }}
                        >
                            {ICON_OPTIONS.map((name) => {
                                const selected = groupIcon === name;
                                return (
                                    <Pressable
                                        key={name}
                                        onPress={() => setGroupIcon(name)}
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 12,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            backgroundColor: selected
                                                ? Colors.accentSubtle
                                                : Colors.background,
                                            borderWidth: 1.5,
                                            borderColor: selected
                                                ? Colors.borderHot
                                                : Colors.border,
                                        }}
                                    >
                                        <Ionicons
                                            name={name}
                                            size={20}
                                            color={selected ? Colors.accent : Colors.textSecondary}
                                        />
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        <Text
                            style={{
                                fontSize: 10,
                                fontWeight: "400",
                                color: Colors.textDim,
                                letterSpacing: 2.5,
                                textTransform: "uppercase",
                                marginBottom: 6,
                            }}
                        >
                            GROUP NAME
                        </Text>
                        <TextInput
                            className="h-12 px-4 mb-4"
                            style={{
                                backgroundColor: Colors.background,
                                color: Colors.textPrimary,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: Colors.border,
                                fontSize: 15,
                            }}
                            value={groupName}
                            onChangeText={setGroupName}
                            onSubmitEditing={handleEditSave}
                            autoFocus
                        />
                        <TactileButton
                            label="Save"
                            onPress={handleEditSave}
                            disabled={!groupName}
                        />
                    </Pressable>
                </Pressable>
            </Modal>
    </>
    );
}
