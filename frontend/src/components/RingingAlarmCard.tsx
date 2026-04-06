import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../theme/colors";
import { TactileButton } from "./TactileButton";

const EXPIRY_SECONDS = 5 * 60;

interface RingingAlarmCardProps {
    alarmName: string;
    time: string;
    period: string;
    eventCreatedAt: string;
    onCheckIn: () => Promise<void>;
}

export function RingingAlarmCard({
    alarmName,
    time,
    period,
    eventCreatedAt,
    onCheckIn,
}: RingingAlarmCardProps) {
    const [loading, setLoading] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(() => {
        const elapsed = (Date.now() - new Date(eventCreatedAt).getTime()) / 1000;
        return Math.max(0, Math.ceil(EXPIRY_SECONDS - elapsed));
    });

    const barWidth = useSharedValue(secondsLeft / EXPIRY_SECONDS);

    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed =
                (Date.now() - new Date(eventCreatedAt).getTime()) / 1000;
            const remaining = Math.max(0, Math.ceil(EXPIRY_SECONDS - elapsed));
            setSecondsLeft(remaining);
            barWidth.value = withSpring(remaining / EXPIRY_SECONDS, {
                damping: 15,
                stiffness: 120,
            });
            if (remaining <= 0) clearInterval(interval);
        }, 1000);
        return () => clearInterval(interval);
    }, [eventCreatedAt]);

    const animatedBarStyle = useAnimatedStyle(() => ({
        width: `${barWidth.value * 100}%`,
    }));

    const handlePress = async () => {
        setLoading(true);
        try {
            await onCheckIn();
        } finally {
            setLoading(false);
        }
    };

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const timeLabel = `${minutes}:${String(seconds).padStart(2, "0")}`;
    const isUrgent = secondsLeft <= 60;

    return (
        <View style={styles.card}>
            <View style={styles.top}>
                <View style={styles.info}>
                    <View style={styles.timeRow}>
                        <Text style={styles.time}>{time}</Text>
                        <Text style={styles.period}>{period}</Text>
                    </View>
                    <Text style={styles.name}>{alarmName}</Text>
                </View>
                <View style={styles.badge}>
                    <Ionicons
                        name="alarm"
                        size={12}
                        color={Colors.statusLate}
                        style={{ marginRight: 4 }}
                    />
                    <Text style={styles.badgeText}>RINGING</Text>
                </View>
            </View>

            {/* Countdown */}
            <View style={styles.countdownRow}>
                <View style={styles.barTrack}>
                    <Animated.View
                        style={[
                            styles.barFill,
                            animatedBarStyle,
                            isUrgent && { backgroundColor: Colors.statusLate },
                        ]}
                    />
                </View>
                <Text
                    style={[
                        styles.countdownText,
                        isUrgent && { color: Colors.statusLate },
                    ]}
                >
                    {timeLabel}
                </Text>
            </View>

            <TactileButton
                label="Check In"
                onPress={handlePress}
                disabled={loading}
                style={{ marginTop: 10 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: Colors.statusLate,
        padding: 20,
        marginBottom: 8,
    },
    top: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    info: {
        flex: 1,
    },
    timeRow: {
        flexDirection: "row",
        alignItems: "baseline",
    },
    time: {
        fontSize: 32,
        fontWeight: "900",
        color: Colors.accent,
        letterSpacing: -0.5,
    },
    period: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.accent,
        marginLeft: 3,
    },
    name: {
        fontSize: 15,
        fontWeight: "900",
        color: Colors.textPrimary,
        letterSpacing: -0.5,
        marginTop: 2,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: Colors.statusLate,
        borderRadius: 99,
        paddingHorizontal: 9,
        paddingVertical: 3,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.statusLate,
        letterSpacing: 2.5,
        textTransform: "uppercase",
    },
    countdownRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 14,
        gap: 10,
    },
    barTrack: {
        flex: 1,
        height: 6,
        borderRadius: 99,
        backgroundColor: "rgba(255,255,255,0.06)",
        overflow: "hidden",
    },
    barFill: {
        height: 6,
        borderRadius: 99,
        backgroundColor: Colors.accent,
    },
    countdownText: {
        fontSize: 13,
        fontWeight: "700",
        color: Colors.accent,
        minWidth: 36,
        textAlign: "right",
    },
});
