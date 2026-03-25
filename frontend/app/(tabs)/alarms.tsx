import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "@/src/theme/colors";
import { useAlarmStore } from "@/src/stores/alarmStore";
import { AlarmCard } from "@/src/components/AlarmCard";
import { GlassCard } from "@/src/components/GlassCard";
import { TactileButton } from "@/src/components/TactileButton";
import { useEffect } from "react";

export default function AlarmsScreen() {
    const router = useRouter();
    const alarms = useAlarmStore((s) => s.alarms);
    const fetchAlarms = useAlarmStore((s) => s.fetch);
    const updateAlarm = useAlarmStore((s) => s.update);

    useEffect(() => {
        fetchAlarms();
    }, []);

    return (
        <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pt-14 pb-8"
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

            <View className="mt-2">
                {alarms.length > 0 ? (
                    alarms.map((alarm) => (
                        <AlarmCard
                            key={alarm.id}
                            alarm={alarm}
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

            <View className="mt-4">
                <TactileButton
                    label="New Alarm"
                    onPress={() => router.push("/alarm/create")}
                />
            </View>
        </ScrollView>
    );
}
