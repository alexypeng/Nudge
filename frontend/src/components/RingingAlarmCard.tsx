import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../theme/colors";
import { TactileButton } from "./TactileButton";

interface RingingAlarmCardProps {
    alarmName: string;
    time: string;
    period: string;
    onCheckIn: () => Promise<void>;
}

export function RingingAlarmCard({
    alarmName,
    time,
    period,
    onCheckIn,
}: RingingAlarmCardProps) {
    const [loading, setLoading] = useState(false);

    const handlePress = async () => {
        setLoading(true);
        try {
            await onCheckIn();
        } finally {
            setLoading(false);
        }
    };

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
            <TactileButton
                label="Check In"
                onPress={handlePress}
                disabled={loading}
                style={{ marginTop: 14 }}
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
});
