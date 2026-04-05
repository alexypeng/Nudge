import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "@/src/theme/colors";
import { useAlarmStore } from "@/src/stores/alarmStore";
import { useGroupStore } from "@/src/stores/groupStore";
import { AlarmCard } from "@/src/components/AlarmCard";
import { GlassCard } from "@/src/components/GlassCard";
import { TactileButton } from "@/src/components/TactileButton";
import { ArcadeSpinner } from "@/src/components/ArcadeSpinner";
import { ErrorBanner } from "@/src/components/ErrorBanner";
import { useEffect } from "react";

export default function AlarmsScreen() {
    const router = useRouter();
    const alarms = useAlarmStore((s) => s.alarms);
    const fetchAlarms = useAlarmStore((s) => s.fetch);
    const updateAlarm = useAlarmStore((s) => s.update);
    const isLoading = useAlarmStore((s) => s.isLoading);
    const error = useAlarmStore((s) => s.error);
    const groups = useGroupStore((s) => s.groups);

    useEffect(() => {
        fetchAlarms();
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pt-14 pb-24"
            style={{ backgroundColor: Colors.background }}
        >
            <Text
                style={{
                    fontSize: 10,
                    fontWeight: "400",
                    color: Colors.textDim,
                    letterSpacing: 2.5,
                    textTransform: "uppercase",
                }}
            >
                ALARMS
            </Text>

            {error && (
                <ErrorBanner
                    message={error}
                    onRetry={fetchAlarms}
                    style={{ marginTop: 8, marginBottom: 4 }}
                />
            )}

            <View className="mt-2">
                {isLoading && alarms.length === 0 ? (
                    <ArcadeSpinner />
                ) : alarms.length > 0 ? (
                    [...alarms].sort((a, b) => a.time.localeCompare(b.time)).map((alarm) => (
                        <AlarmCard
                            key={alarm.id}
                            alarm={alarm}
                            groupName={groups.find((g) => g.id === alarm.group_id)?.name}
                            className="mb-2"
                            onPress={() => {
                                router.push({
                                    pathname: "/alarm/[id]",
                                    params: { id: alarm.id },
                                });
                            }}
                            onToggle={(isActive) => updateAlarm(alarm.id, { is_active: isActive })}
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
                            No alarms yet — create one to get started
                        </Text>
                    </GlassCard>
                )}
            </View>

        </ScrollView>
        <View style={{ position: "absolute", bottom: 16, left: 20, right: 20 }}>
            <TactileButton
                label="New Alarm"
                onPress={() => router.push("/alarm/create")}
            />
        </View>
        </View>
    );
}
