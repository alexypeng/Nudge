import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { Colors } from "@/src/theme/colors";
import { useAuthStore } from "@/src/stores/authStore";
import { useEffect } from "react";
import { useAlarmStore } from "@/src/stores/alarmStore";
import { useGroupStore } from "@/src/stores/groupStore";
import { AlarmCard } from "@/src/components/AlarmCard";
import { GroupCard } from "@/src/components/GroupCard";
import { GlassCard } from "@/src/components/GlassCard";

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

export default function HomeScreen() {
    const token = useAuthStore((s) => s.token);
    const user = useAuthStore((s) => s.user);
    const alarms = useAlarmStore((s) => s.alarms);
    const alarmFetch = useAlarmStore((s) => s.fetch);
    const groups = useGroupStore((s) => s.groups);
    const groupFetch = useGroupStore((s) => s.fetch);

    useEffect(() => {
        alarmFetch();
        groupFetch();
    }, []);

    if (!token) return <Redirect href="/(auth)/login" />;

    const activeAlarms = alarms.filter((a) => a.is_active);
    const nextAlarm = activeAlarms
        .filter((a) => a.next_trigger_utc)
        .sort((a, b) =>
            new Date(a.next_trigger_utc!).getTime() -
            new Date(b.next_trigger_utc!).getTime()
        )[0];

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
        >
            {/* Greeting */}
            <Text style={styles.greeting}>
                {getGreeting()}, {user?.display_name ?? "there"}
            </Text>

            {/* Next Alarm Hero */}
            <Text style={styles.sectionLabel}>NEXT ALARM</Text>
            {nextAlarm ? (
                <GlassCard style={styles.heroCard}>
                    <Text style={styles.heroTime}>
                        {nextAlarm.time.slice(0, 5)}
                    </Text>
                    <Text style={styles.heroName}>{nextAlarm.name}</Text>
                </GlassCard>
            ) : (
                <GlassCard>
                    <Text style={styles.emptyText}>
                        No alarms yet — create one to get started
                    </Text>
                </GlassCard>
            )}

            {/* Active Alarms */}
            {activeAlarms.length > 0 && (
                <>
                    <Text style={styles.sectionLabel}>ACTIVE</Text>
                    {activeAlarms.map((alarm) => (
                        <AlarmCard
                            key={alarm.id}
                            alarm={alarm}
                            className="mb-2"
                        />
                    ))}
                </>
            )}

            {/* Groups */}
            <Text style={styles.sectionLabel}>MY GROUPS</Text>
            {groups.length > 0 ? (
                groups.map((group) => (
                    <GroupCard
                        key={group.id}
                        group={group}
                        className="mb-2"
                    />
                ))
            ) : (
                <GlassCard>
                    <Text style={styles.emptyText}>
                        Join or create a group to get started
                    </Text>
                </GlassCard>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 32,
    },
    greeting: {
        fontSize: 15,
        fontWeight: "900",
        color: Colors.textPrimary,
        letterSpacing: -0.5,
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: "400",
        color: Colors.textDim,
        letterSpacing: 2.5,
        textTransform: "uppercase",
        marginTop: 24,
        marginBottom: 8,
    },
    heroCard: {
        borderColor: Colors.borderHot,
    },
    heroTime: {
        fontSize: 48,
        fontWeight: "900",
        color: Colors.accent,
        letterSpacing: -0.5,
    },
    heroName: {
        fontSize: 15,
        fontWeight: "900",
        color: Colors.textPrimary,
        letterSpacing: -0.5,
        marginTop: 4,
    },
    emptyText: {
        fontSize: 13,
        fontWeight: "400",
        color: Colors.textSecondary,
    },
});
