import { View, Text, ScrollView, Pressable } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Colors } from "@/src/theme/colors";
import { useAuthStore } from "@/src/stores/authStore";
import { useEffect } from "react";
import { useAlarmStore } from "@/src/stores/alarmStore";
import { useGroupStore } from "@/src/stores/groupStore";
import { AlarmCard } from "@/src/components/AlarmCard";
import { GlassCard } from "@/src/components/GlassCard";

function formatTime12h(time24: string) {
    const [h, m] = time24.split(":");
    const hour = parseInt(h, 10);
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return { time: `${hour12}:${m}`, period };
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

export default function HomeScreen() {
    const router = useRouter();
    const token = useAuthStore((s) => s.token);
    const user = useAuthStore((s) => s.user);
    const alarms = useAlarmStore((s) => s.alarms);
    const alarmFetch = useAlarmStore((s) => s.fetch);
    const alarmUpdate = useAlarmStore((s) => s.update);
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
        .sort(
            (a, b) =>
                new Date(a.next_trigger_utc!).getTime() -
                new Date(b.next_trigger_utc!).getTime()
        )[0];

    return (
        <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pt-14 pb-8"
            style={{ backgroundColor: Colors.background }}
        >
            {/* Greeting */}
            <Text
                className="text-base mb-6"
                style={{
                    fontWeight: "900",
                    color: Colors.textPrimary,
                    letterSpacing: -0.5,
                }}
            >
                {getGreeting()}, {user?.display_name ?? "there"}
            </Text>

            {/* Next Alarm Hero */}
            <Text
                className="mt-6 mb-2"
                style={{
                    fontSize: 10,
                    fontWeight: "400",
                    color: Colors.textDim,
                    letterSpacing: 2.5,
                    textTransform: "uppercase",
                }}
            >
                NEXT ALARM
            </Text>
            {nextAlarm ? (
                <GlassCard style={{ borderColor: Colors.borderHot }}>
                    <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                        <Text
                            style={{
                                fontSize: 48,
                                fontWeight: "900",
                                color: Colors.accent,
                                letterSpacing: -0.5,
                            }}
                        >
                            {formatTime12h(nextAlarm.time).time}
                        </Text>
                        <Text
                            style={{
                                fontSize: 17,
                                fontWeight: "700",
                                color: Colors.accent,
                                marginLeft: 4,
                            }}
                        >
                            {formatTime12h(nextAlarm.time).period}
                        </Text>
                    </View>
                    <Text
                        className="mt-1"
                        style={{
                            fontSize: 15,
                            fontWeight: "900",
                            color: Colors.textPrimary,
                            letterSpacing: -0.5,
                        }}
                    >
                        {nextAlarm.name}
                    </Text>
                </GlassCard>
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

            {/* Active Alarms */}
            {activeAlarms.length > 0 && (
                <>
                    <Text
                        className="mt-6 mb-2"
                        style={{
                            fontSize: 10,
                            fontWeight: "400",
                            color: Colors.textDim,
                            letterSpacing: 2.5,
                            textTransform: "uppercase",
                        }}
                    >
                        ACTIVE
                    </Text>
                    {activeAlarms.map((alarm) => (
                        <AlarmCard
                            key={alarm.id}
                            alarm={alarm}
                            className="mb-2"
                            onPress={() =>
                                router.push({
                                    pathname: "/alarm/[id]",
                                    params: { id: alarm.id },
                                })
                            }
                            onToggle={(isActive) => alarmUpdate(alarm.id, { is_active: isActive })}
                        />
                    ))}
                </>
            )}

            {/* Groups */}
            <Text
                className="mt-6 mb-2"
                style={{
                    fontSize: 10,
                    fontWeight: "400",
                    color: Colors.textDim,
                    letterSpacing: 2.5,
                    textTransform: "uppercase",
                }}
            >
                MY GROUPS
            </Text>
            {groups.length > 0 ? (
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {groups.map((group) => (
                        <Pressable
                            key={group.id}
                            onPress={() =>
                                router.push({
                                    pathname: "/group/[id]",
                                    params: { id: group.id },
                                })
                            }
                            style={{
                                backgroundColor: Colors.surface,
                                borderWidth: 1.5,
                                borderColor: Colors.border,
                                borderRadius: 18,
                                padding: 16,
                                width: "48%",
                                aspectRatio: 1,
                                justifyContent: "flex-end",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 15,
                                    fontWeight: "900",
                                    color: Colors.textPrimary,
                                    letterSpacing: -0.5,
                                }}
                                numberOfLines={2}
                            >
                                {group.name}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            ) : (
                <GlassCard>
                    <Text
                        style={{
                            fontSize: 13,
                            color: Colors.textSecondary,
                        }}
                    >
                        Join or create a group to get started
                    </Text>
                </GlassCard>
            )}
        </ScrollView>
    );
}
