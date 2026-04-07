import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/src/theme/colors";
import { TactileButton } from "@/src/components/TactileButton";
import { useAlarmStore } from "@/src/stores/alarmStore";
import { cancelAlarm } from "@/src/services/alarmScheduler";

export default function ActiveAlarmScreen() {
    const { alarmId } = useLocalSearchParams<{ alarmId: string }>();
    const alarm = useAlarmStore((s) => s.alarms.find((a) => a.id === alarmId));
    const [dismissing, setDismissing] = useState(false);

    const time = alarm?.time ?? "";
    const [hourStr, minuteStr] = time.split(":");
    const hour = parseInt(hourStr, 10);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const formattedTime = `${displayHour}:${minuteStr ?? "00"}`;

    const handleDismiss = async () => {
        setDismissing(true);
        try {
            if (alarmId) {
                await cancelAlarm(alarmId);
            }
        } finally {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace("/(tabs)" as any);
            }
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.badge}>
                <Ionicons
                    name="alarm"
                    size={14}
                    color={Colors.statusLate}
                    style={{ marginRight: 5 }}
                />
                <Text style={styles.badgeText}>RINGING</Text>
            </View>

            <Text style={styles.time}>{formattedTime}</Text>
            <Text style={styles.period}>{period}</Text>
            <Text style={styles.name}>{alarm?.name ?? "Alarm"}</Text>

            <View style={styles.buttonContainer}>
                <TactileButton
                    label="Dismiss"
                    variant="danger"
                    onPress={handleDismiss}
                    disabled={dismissing}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: Colors.statusLate,
        borderRadius: 99,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginBottom: 32,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.statusLate,
        letterSpacing: 2.5,
        textTransform: "uppercase",
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
        marginTop: 2,
    },
    name: {
        fontSize: 18,
        fontWeight: "900",
        color: Colors.textPrimary,
        letterSpacing: -0.5,
        marginTop: 8,
    },
    buttonContainer: {
        position: "absolute",
        bottom: 60,
        left: 32,
        right: 32,
    },
});
