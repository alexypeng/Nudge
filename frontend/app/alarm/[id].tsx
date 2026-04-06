import { useAlarmStore } from "@/src/stores/alarmStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    ScrollView,
    Pressable,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors } from "@/src/theme/colors";
import { TactileButton } from "@/src/components/TactileButton";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function EditAlarmScreen() {
    const router = useRouter();

    const { id } = useLocalSearchParams<{ id: string }>();
    const alarm = useAlarmStore((s) => s.alarms.find((a) => a.id === id));
    const deleteAlarm = useAlarmStore((s) => s.delete);
    const updateAlarm = useAlarmStore((s) => s.update);

    const [name, setName] = useState(alarm?.name ?? "");
    const [time, setTime] = useState(() => {
        const d = new Date();
        if (alarm?.time) {
            const [h, m] = alarm.time.split(":").map(Number);
            d.setHours(h, m, 0, 0);
        }
        return d;
    });
    const [selectedDays, setSelectedDays] = useState<string[]>(
        alarm?.repeats ? alarm.repeats.split(",") : [],
    );
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isOneTime = selectedDays.length === 0;

    const toggleDay = (day: string) => {
        setSelectedDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
        );
    };

    const handleUpdate = async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            const timeStr = `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;
            await updateAlarm(id, {
                name,
                time: timeStr,
                repeats: DAYS.filter((d) => selectedDays.includes(d)).join(","),
                is_one_time: isOneTime,
            });
            router.back();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            await deleteAlarm(id);
            router.back();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!alarm) {
        return (
            <View
                className="flex-1 items-center justify-center"
                style={{ backgroundColor: Colors.background }}
            >
                <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                    Alarm not found
                </Text>
            </View>
        );
    }

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

                {/* Error */}
                {error && (
                    <Text
                        className="mb-3"
                        style={{ fontSize: 13, color: Colors.statusLate }}
                    >
                        {error}
                    </Text>
                )}

                {/* Save */}
                <TactileButton
                    label="Save"
                    onPress={handleUpdate}
                    disabled={isSubmitting || !name}
                />

                {/* Delete */}
                <View className="mt-4">
                    <TactileButton
                        label="Delete Alarm"
                        variant="danger"
                        onPress={handleDelete}
                        disabled={isSubmitting}
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
