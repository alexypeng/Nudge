import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useAlarmStore } from "@/src/stores/alarmStore";
import { useGroupStore } from "@/src/stores/groupStore";
import {
    View,
    Text,
    TextInput,
    ScrollView,
    Pressable,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors } from "@/src/theme/colors";
import { TactileButton } from "@/src/components/TactileButton";
import { GlassCard } from "@/src/components/GlassCard";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function AlarmCreateScreen() {
    const router = useRouter();

    const { groupId: paramGroupId } = useLocalSearchParams<{ groupId?: string }>();
    const createAlarm = useAlarmStore((s) => s.create);
    const groups = useGroupStore((s) => s.groups);
    const fetchGroups = useGroupStore((s) => s.fetch);

    const [name, setName] = useState("");
    const [selectedGroupId, setSelectedGroupId] = useState(paramGroupId ?? "");
    const [time, setTime] = useState(new Date());
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAllGroups, setShowAllGroups] = useState(false);

    const isOneTime = selectedDays.length === 0;
    const needsGroupPicker = !paramGroupId;

    useEffect(() => {
        if (needsGroupPicker) fetchGroups();
    }, []);

    const toggleDay = (day: string) => {
        setSelectedDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
        );
    };

    const handleCreate = async () => {
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
    };

    return (
        <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ backgroundColor: Colors.background }}
        >
            <ScrollView
                className="flex-1"
                contentContainerClassName="px-5 pt-8 pb-8"
            >
                {/* Time Picker */}
                <View className="items-center mb-8">
                    <DateTimePicker
                        value={time}
                        mode="time"
                        display="spinner"
                        is24Hour={false}
                        themeVariant="dark"
                        onChange={(_, selectedDate) => {
                            if (selectedDate) setTime(selectedDate);
                        }}
                    />
                </View>

                {/* Alarm Name */}
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
                    NAME
                </Text>
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
                    placeholder="Morning workout"
                    placeholderTextColor={Colors.textDim}
                />

                {/* Repeat Days */}
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
                                <View
                                    className="flex-row flex-wrap mb-2"
                                    style={{ gap: 8 }}
                                >
                                    {(showAllGroups ? groups : groups.slice(0, 3)).map((group) => {
                                        const active = selectedGroupId === group.id;
                                        return (
                                            <Pressable
                                                key={group.id}
                                                onPress={() => setSelectedGroupId(group.id)}
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
                                                <Ionicons
                                                    name={(group.icon as keyof typeof Ionicons.glyphMap) || "people"}
                                                    size={40}
                                                    color={active ? Colors.surface : Colors.accent}
                                                    style={{ marginBottom: 10 }}
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
                                {groups.length > 3 && (
                                    <Pressable
                                        onPress={() => setShowAllGroups((v) => !v)}
                                        style={{ marginBottom: 12 }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                fontWeight: "700",
                                                color: Colors.accent,
                                                textAlign: "center",
                                            }}
                                        >
                                            {showAllGroups ? "Show less" : `Show all (${groups.length})`}
                                        </Text>
                                    </Pressable>
                                )}
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

                {/* Submit */}
                <TactileButton
                    label="Create Alarm"
                    onPress={handleCreate}
                    disabled={isSubmitting || !name || !selectedGroupId}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
