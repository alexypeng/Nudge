import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import { useAlarmStore } from "@/src/stores/alarmStore";
import { useGroupStore } from "@/src/stores/groupStore";
import {
    View,
    ScrollView,
    Pressable,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Text, TextInput } from "@/src/components/Text";
import { GroupIcon } from "@/src/components/GroupIcon";
import { HeaderSubmitButton } from "@/src/components/HeaderSubmitButton";
import DatePicker from "react-native-date-picker";
import { Colors } from "@/src/theme/colors";
import { GlassCard } from "@/src/components/GlassCard";

import { useGridTileStyle } from "@/src/components/gridTile";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function AlarmCreateScreen() {
    const tileStyle = useGridTileStyle();
    const router = useRouter();
    const navigation = useNavigation();

    const { groupId: paramGroupId } = useLocalSearchParams<{
        groupId?: string;
    }>();
    const createAlarm = useAlarmStore((s) => s.create);
    const groups = useGroupStore((s) => s.groups);
    const fetchGroups = useGroupStore((s) => s.fetch);

    const [name, setName] = useState("");
    const [selectedGroupId, setSelectedGroupId] = useState(paramGroupId ?? "");
    const [time, setTime] = useState(new Date());
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [groupSearch, setGroupSearch] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isOneTime = selectedDays.length === 0;
    const needsGroupPicker = !paramGroupId;
    const canSubmit = !!name && !!selectedGroupId && !isSubmitting;

    useEffect(() => {
        if (needsGroupPicker) fetchGroups();
    }, []);

    const toggleDay = (day: string) => {
        setSelectedDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
        );
    };

    const handleCreate = useCallback(async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            const timeStr = `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;
            await createAlarm({
                name,
                time: timeStr,
                repeats: DAYS.filter((d) => selectedDays.includes(d)).join(","),
                is_one_time: isOneTime,
                group_id: selectedGroupId,
            });
            router.back();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    }, [name, time, selectedDays, selectedGroupId, isOneTime]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <HeaderSubmitButton
                    canSubmit={canSubmit}
                    isSubmitting={isSubmitting}
                    onSubmit={handleCreate}
                    accessibilityLabel="Create alarm"
                />
            ),
        });
    }, [navigation, canSubmit, isSubmitting, handleCreate]);

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
                {/* Time Picker */}
                <View className="items-center mb-8">
                    <DatePicker
                        date={time}
                        onDateChange={setTime}
                        mode="time"
                        theme="dark"
                    />
                </View>

                {/* Alarm Name */}
                <Text
                    style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: Colors.textDim,
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        paddingLeft: 5,
                        paddingBottom: 6,
                    }}
                >
                    NAME
                </Text>
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
                    placeholder="Morning workout"
                    placeholderTextColor={Colors.textDim}
                />

                {/* Repeat Days */}
                <Text
                    style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: Colors.textDim,
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        paddingLeft: 5,
                        paddingBottom: 6,
                    }}
                >
                    REPEAT
                </Text>
                <View className="flex-row justify-between mb-5">
                    {DAYS.map((day, i) => {
                        const active = selectedDays.includes(day);
                        return (
                            <Pressable
                                key={day}
                                onPress={() => toggleDay(day)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 99,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: active
                                        ? Colors.accent
                                        : Colors.surface,
                                    borderWidth: 1,
                                    borderColor: active
                                        ? Colors.accent
                                        : Colors.border,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 13,
                                        fontWeight: "700",
                                        color: active
                                            ? Colors.surface
                                            : Colors.textSecondary,
                                    }}
                                >
                                    {DAY_LABELS[i]}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Group Picker (only if not coming from a group) */}
                {needsGroupPicker && (
                    <>
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
                            GROUP
                        </Text>
                        {groups.length > 0 ? (
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
                                    value={groupSearch}
                                    onChangeText={setGroupSearch}
                                    placeholder="Search groups"
                                    placeholderTextColor={Colors.textDim}
                                />
                                <View
                                    className="flex-row flex-wrap mb-2"
                                    style={{ gap: 8 }}
                                >
                                    {groups
                                        .filter((g) => {
                                            if (!groupSearch) return true;
                                            return g.name
                                                .toLowerCase()
                                                .includes(
                                                    groupSearch.toLowerCase(),
                                                );
                                        })
                                        .map((group) => {
                                            const active =
                                                selectedGroupId === group.id;
                                            return (
                                                <Pressable
                                                    key={group.id}
                                                    onPress={() =>
                                                        setSelectedGroupId(
                                                            group.id,
                                                        )
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
                                                        ...tileStyle,
                                                        justifyContent:
                                                            "center",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <GroupIcon
                                                        name={group.icon}
                                                        size={40}
                                                        color={
                                                            active
                                                                ? Colors.surface
                                                                : Colors.accent
                                                        }
                                                        style={{
                                                            marginBottom: 10,
                                                        }}
                                                    />
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
                                                        {group.name}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                </View>
                                <View style={{ marginBottom: 12 }} />
                            </>
                        ) : (
                            <GlassCard className="mb-5">
                                <Text
                                    style={{
                                        fontSize: 13,
                                        color: Colors.textSecondary,
                                    }}
                                >
                                    No groups yet — create one first
                                </Text>
                            </GlassCard>
                        )}
                    </>
                )}

                {/* Error */}
                {error && (
                    <Text
                        className="mb-3"
                        style={{ fontSize: 13, color: Colors.statusLate }}
                    >
                        {error}
                    </Text>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
