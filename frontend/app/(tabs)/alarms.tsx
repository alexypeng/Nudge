import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import { Colors } from "@/src/theme/colors";
import { useAlarmStore } from "@/src/stores/alarmStore";
import { useGroupStore } from "@/src/stores/groupStore";
import { AlarmCard } from "@/src/components/AlarmCard";
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
                contentContainerStyle={{ flexGrow: 1 }}
                style={{ backgroundColor: Colors.background }}
            >
                {error && (
                    <ErrorBanner
                        message={error}
                        onRetry={fetchAlarms}
                        style={{ marginBottom: 8 }}
                    />
                )}

                {isLoading && alarms.length === 0 ? (
                    <ArcadeSpinner style={{ marginTop: 40 }} />
                ) : alarms.length > 0 ? (
                    [...alarms]
                        .sort((a, b) => a.time.localeCompare(b.time))
                        .map((alarm) => (
                            <AlarmCard
                                key={alarm.id}
                                alarm={alarm}
                                groupName={
                                    groups.find((g) => g.id === alarm.group_id)
                                        ?.name
                                }
                                className="mb-2"
                                onPress={() => {
                                    router.push({
                                        pathname: "/alarm/[id]",
                                        params: { id: alarm.id },
                                    });
                                }}
                                onToggle={(isActive) =>
                                    updateAlarm(alarm.id, {
                                        is_active: isActive,
                                    })
                                }
                            />
                        ))
                ) : (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                        <Bell
                            color={Colors.textDim}
                            size={48}
                            strokeWidth={1.5}
                        />
                        <Text
                            style={{
                                fontSize: 15,
                                fontWeight: "700",
                                color: Colors.textSecondary,
                                marginTop: 16,
                            }}
                        >
                            No alarms yet
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                color: Colors.textDim,
                                marginTop: 4,
                            }}
                        >
                            Create one to get started
                        </Text>
                    </View>
                )}
            </ScrollView>
            <View
                style={{
                    position: "absolute",
                    bottom: 16,
                    left: 20,
                    right: 20,
                }}
            >
                <TactileButton
                    label="New Alarm"
                    onPress={() => router.push("/alarm/create")}
                />
            </View>
        </View>
    );
}
