import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/src/components/Text";
import { useLocalSearchParams, router } from "expo-router";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { AlarmClock, Check, Clock, Moon } from "lucide-react-native";
import { Colors } from "@/src/theme/colors";
import { TactileButton } from "@/src/components/TactileButton";
import { useAlarmStore } from "@/src/stores/alarmStore";
import { useAuthStore } from "@/src/stores/authStore";
import { api } from "@/src/api/client";
import { stopRinging } from "@/src/services/alarmScheduler";

const SPRING = { damping: 15, stiffness: 120 };
const STAGGER_MS = 90;

type Result =
    | { kind: "on_time" }
    | { kind: "late" }
    | { kind: "already" }
    | { kind: "missed" }
    | { kind: "error"; message: string };

const RESULT_COPY = {
    on_time: { title: "You're up!", body: "Checked in on time. Nice work." },
    late: { title: "Running late", body: "Checked in. Tomorrow's a fresh start." },
    already: { title: "All set", body: "You already checked in for this one." },
    missed: { title: "Missed this one", body: "Tomorrow's another shot." },
} as const;

function errorMessage(err: unknown) {
    const raw = (err as Error).message ?? "";
    try {
        return JSON.parse(raw).error ?? raw;
    } catch {
        return raw || "Couldn't reach the server.";
    }
}

function useReveal(index: number) {
    const progress = useSharedValue(0);
    useEffect(() => {
        progress.value = withDelay(index * STAGGER_MS, withSpring(1, SPRING));
    }, []);
    return useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ translateY: (1 - progress.value) * 16 }],
    }));
}

export default function ActiveAlarmScreen() {
    const { alarmId } = useLocalSearchParams<{ alarmId: string }>();
    const alarm = useAlarmStore((s) => s.alarms.find((a) => a.id === alarmId));
    const token = useAuthStore((s) => s.token);

    const [checkingIn, setCheckingIn] = useState(false);
    const [result, setResult] = useState<Result | null>(null);

    const badgeStyle = useReveal(0);
    const timeStyle = useReveal(1);
    const nameStyle = useReveal(2);
    const actionStyle = useReveal(3);

    const resultScale = useSharedValue(0);
    const resultStyle = useAnimatedStyle(() => ({
        transform: [{ scale: resultScale.value }],
        opacity: Math.min(1, resultScale.value),
    }));

    const [hourStr, minuteStr] = (alarm?.time ?? "").split(":");
    const hour = parseInt(hourStr, 10);
    const hasTime = !Number.isNaN(hour);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;

    const handleCheckIn = async () => {
        if (!alarmId || !token) return;
        setCheckingIn(true);

        let next: Result;
        try {
            const response = await api.checkIn(token, alarmId);
            next = { kind: response.on_time ? "on_time" : "late" };
        } catch (err) {
            const message = errorMessage(err);
            const lower = message.toLowerCase();
            // 409s are final (already checked in, or past the 2-hour cutoff); anything else can be retried.
            next = lower.includes("already checked in")
                ? { kind: "already" }
                : lower.includes("missed")
                  ? { kind: "missed" }
                  : { kind: "error", message };
        }

        if (next.kind !== "error") {
            // Silence it only once the outcome is settled; the schedule itself is untouched.
            await stopRinging(alarmId);
            useAlarmStore.getState().fetch();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            resultScale.value = 0;
            resultScale.value = withSpring(1, SPRING);
        }

        setResult(next);
        setCheckingIn(false);
    };

    const handleDone = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)");
        }
    };

    const settled = result && result.kind !== "error" ? result : null;
    const accent =
        settled?.kind === "on_time" || settled?.kind === "already"
            ? Colors.statusUp
            : settled?.kind === "late"
              ? Colors.statusSnooze
              : Colors.textDim;
    const ResultIcon =
        settled?.kind === "missed" ? Moon : settled?.kind === "late" ? Clock : Check;

    return (
        <View style={styles.container}>
            <View style={styles.content}>
            <Animated.View style={[styles.badge, badgeStyle]}>
                <AlarmClock size={14} color={Colors.statusSnooze} style={{ marginRight: 5 }} />
                <Text style={styles.badgeText}>{settled ? "ALARM" : "WAKE UP"}</Text>
            </Animated.View>

            <Animated.View style={[styles.timeRow, timeStyle]}>
                <Text style={styles.time}>
                    {hasTime ? `${displayHour}:${minuteStr}` : "--:--"}
                </Text>
                {hasTime && <Text style={styles.period}>{period}</Text>}
            </Animated.View>

            <Animated.View style={nameStyle}>
                <Text style={styles.name}>{alarm?.name ?? "Alarm"}</Text>
                {!settled && (
                    <Text style={styles.hint}>Check in within 5 minutes to stay on time</Text>
                )}
            </Animated.View>

            {settled && (
                <Animated.View style={[styles.result, resultStyle]}>
                    <View style={[styles.resultCircle, { borderColor: accent }]}>
                        <ResultIcon size={40} color={accent} strokeWidth={3} />
                    </View>
                    <Text style={[styles.resultTitle, { color: accent }]}>
                        {RESULT_COPY[settled.kind].title}
                    </Text>
                    <Text style={styles.resultBody}>{RESULT_COPY[settled.kind].body}</Text>
                </Animated.View>
            )}
            </View>

            <Animated.View style={[styles.actions, actionStyle]}>
                {result?.kind === "error" && (
                    <Text style={styles.error}>{result.message}</Text>
                )}
                {settled ? (
                    <TactileButton label="Done" variant="ghost" onPress={handleDone} />
                ) : (
                    <TactileButton
                        label={checkingIn ? "Checking in..." : "I'm up!"}
                        onPress={handleCheckIn}
                        disabled={checkingIn || !alarmId}
                    />
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingHorizontal: 32,
        paddingBottom: 48,
    },
    // Takes the space above the button so long results never run into it on short screens.
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.accentSubtle,
        borderWidth: 1,
        borderColor: Colors.statusSnooze,
        borderRadius: 99,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginBottom: 32,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.statusSnooze,
        letterSpacing: 2.5,
        textTransform: "uppercase",
    },
    timeRow: {
        flexDirection: "row",
        alignItems: "baseline",
    },
    time: {
        fontSize: 56,
        fontWeight: "900",
        color: Colors.accent,
        letterSpacing: -0.5,
    },
    period: {
        fontSize: 16,
        fontWeight: "700",
        color: Colors.accent,
        marginLeft: 6,
    },
    name: {
        fontSize: 18,
        fontWeight: "900",
        color: Colors.textPrimary,
        letterSpacing: -0.5,
        marginTop: 8,
        textAlign: "center",
    },
    hint: {
        fontSize: 13,
        fontWeight: "400",
        color: Colors.textSecondary,
        marginTop: 6,
        textAlign: "center",
    },
    result: {
        alignItems: "center",
        marginTop: 36,
    },
    resultCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 3,
        backgroundColor: Colors.surface,
        alignItems: "center",
        justifyContent: "center",
    },
    resultTitle: {
        fontSize: 22,
        fontWeight: "900",
        letterSpacing: -0.5,
        marginTop: 16,
    },
    resultBody: {
        fontSize: 13,
        fontWeight: "400",
        color: Colors.textSecondary,
        marginTop: 4,
        textAlign: "center",
    },
    actions: {
        alignSelf: "stretch",
    },
    error: {
        fontSize: 13,
        fontWeight: "400",
        color: Colors.statusLate,
        textAlign: "center",
        marginBottom: 12,
    },
});
