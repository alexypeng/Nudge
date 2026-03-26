import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Colors } from "@/src/theme/colors";
import { TactileButton } from "@/src/components/TactileButton";
import { api, AlarmEventOut, AlarmOut } from "@/src/api/client";
import { useAuthStore } from "@/src/stores/authStore";
import { useAlarmStore } from "@/src/stores/alarmStore";

export default function AlarmActiveScreen() {
    const router = useRouter();
    const { alarmId } = useLocalSearchParams<{ alarmId: string }>();
    const token = useAuthStore((s) => s.token);
    const alarm = useAlarmStore((s) => s.alarms.find((a) => a.id === alarmId));

    const [event, setEvent] = useState<AlarmEventOut | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEvent = async () => {
        if (!token || !alarmId) return;
        try {
            const result = await api.getLatestEvent(token, alarmId);
            setEvent(result ?? null);
        } catch {
            setError("Failed to load event");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvent();
    }, []);

    const handleSilence = async () => {
        if (!token || !alarmId) return;
        setError(null);
        try {
            await api.silenceAlarm(token, alarmId);
            await fetchEvent();
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const handleCheckIn = async () => {
        if (!token || !alarmId) return;
        setError(null);
        try {
            await api.checkIn(token, alarmId);
            await fetchEvent();
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const [h, m] = (alarm?.time ?? "00:00").slice(0, 5).split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    const timeDisplay = `${hour12}:${String(m).padStart(2, "0")}`;

    const statusColor =
        event?.status === "RINGING"
            ? Colors.statusLate
            : event?.status === "SILENCED"
              ? Colors.statusSnooze
              : event?.status === "CHECKED_IN"
                ? Colors.statusUp
                : Colors.textDim;

    return (
        <View
            className="flex-1 items-center justify-center px-5"
            style={{ backgroundColor: Colors.background }}
        >
            {/* Status Badge */}
            <View
                style={{
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderRadius: 99,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    marginBottom: 24,
                }}
            >
                <Text
                    style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: statusColor,
                        letterSpacing: 2.5,
                        textTransform: "uppercase",
                    }}
                >
                    {loading ? "LOADING" : event?.status ?? "NO EVENT"}
                </Text>
            </View>

            {/* Time */}
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                <Text
                    style={{
                        fontSize: 56,
                        fontWeight: "900",
                        color: Colors.accent,
                        letterSpacing: -0.5,
                    }}
                >
                    {timeDisplay}
                </Text>
                <Text
                    style={{
                        fontSize: 20,
                        fontWeight: "700",
                        color: Colors.accent,
                        marginLeft: 4,
                    }}
                >
                    {period}
                </Text>
            </View>

            {/* Alarm Name */}
            <Text
                style={{
                    fontSize: 17,
                    fontWeight: "900",
                    color: Colors.textPrimary,
                    letterSpacing: -0.5,
                    marginTop: 8,
                    marginBottom: 40,
                }}
            >
                {alarm?.name ?? "Alarm"}
            </Text>

            {/* Error */}
            {error && (
                <Text
                    style={{
                        fontSize: 13,
                        color: Colors.statusLate,
                        marginBottom: 12,
                    }}
                >
                    {error}
                </Text>
            )}

            {/* Actions */}
            <View style={{ width: "100%", gap: 12 }}>
                {event?.status === "RINGING" && (
                    <TactileButton label="Silence" onPress={handleSilence} />
                )}

                {event?.status === "SILENCED" && (
                    <TactileButton label="Check In" onPress={handleCheckIn} />
                )}

                {event?.status === "CHECKED_IN" && (
                    <TactileButton label="Done" onPress={() => router.back()} />
                )}
            </View>
        </View>
    );
}
