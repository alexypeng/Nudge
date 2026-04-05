import { View, Text, ScrollView, Pressable } from "react-native";
import { Redirect, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/src/theme/colors";
import { useAuthStore } from "@/src/stores/authStore";
import { useEffect, useRef, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useAlarmStore } from "@/src/stores/alarmStore";
import { useGroupStore } from "@/src/stores/groupStore";
import { api, AlarmEventOut } from "@/src/api/client";
import { AlarmCard } from "@/src/components/AlarmCard";
import { RingingAlarmCard } from "@/src/components/RingingAlarmCard";
import { GlassCard } from "@/src/components/GlassCard";
import { ArcadeSpinner } from "@/src/components/ArcadeSpinner";
import { ErrorBanner } from "@/src/components/ErrorBanner";

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
    const alarmLoading = useAlarmStore((s) => s.isLoading);
    const alarmError = useAlarmStore((s) => s.error);
    const groups = useGroupStore((s) => s.groups);
    const groupFetch = useGroupStore((s) => s.fetch);
    const groupLoading = useGroupStore((s) => s.isLoading);
    const groupError = useGroupStore((s) => s.error);

    const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
    const [activeEvents, setActiveEvents] = useState<Record<string, AlarmEventOut>>({});

    const fetchEvents = async () => {
        if (!token) return;
        const currentAlarms = useAlarmStore.getState().alarms.filter((a) => a.is_active);
        const events: Record<string, AlarmEventOut> = {};
        await Promise.all(
            currentAlarms.map(async (alarm) => {
                try {
                    const event = await api.getLatestEvent(token, alarm.id);
                    if (event && event.status === "RINGING") {
                        events[alarm.id] = event;
                    }
                } catch {}
            })
        );
        setActiveEvents(events);
    };

    const handleCheckIn = async (alarmId: string) => {
        if (!token) return;
        await api.checkIn(token, alarmId);
        await fetchEvents();
    };

    useFocusEffect(
        useCallback(() => {
            alarmFetch().then(fetchEvents);
            groupFetch();
            const activeIds = new Set(
                useAlarmStore.getState().alarms
                    .filter((a) => a.is_active)
                    .map((a) => a.id)
            );
            setVisibleIds(activeIds);
        }, [])
    );

    if (!token) return <Redirect href="/(auth)/login" />;

    const isFirstLoad = (alarmLoading && alarms.length === 0) || (groupLoading && groups.length === 0);
    const fetchError = alarmError || groupError;

    const displayedAlarms = alarms.filter((a) => a.is_active || visibleIds.has(a.id));
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

            {fetchError && (
                <ErrorBanner
                    message={fetchError}
                    onRetry={() => { alarmFetch(); groupFetch(); }}
                    style={{ marginBottom: 12 }}
                />
            )}

            {isFirstLoad ? (
                <ArcadeSpinner style={{ marginTop: 40 }} />
            ) : (
            <>

            {/* Ringing Alarms */}
            {Object.keys(activeEvents).length > 0 && (
                <>
                    <Text
                        className="mt-3 mb-2"
                        style={{
                            fontSize: 10,
                            fontWeight: "400",
                            color: Colors.statusLate,
                            letterSpacing: 2.5,
                            textTransform: "uppercase",
                        }}
                    >
                        RINGING NOW
                    </Text>
                    {Object.entries(activeEvents).map(([alarmId, event]) => {
                        const alarm = alarms.find((a) => a.id === alarmId);
                        if (!alarm) return null;
                        const { time: t12, period } = formatTime12h(alarm.time);
                        return (
                            <RingingAlarmCard
                                key={alarmId}
                                alarmName={alarm.name}
                                time={t12}
                                period={period}
                                onCheckIn={() => handleCheckIn(alarmId)}
                            />
                        );
                    })}
                </>
            )}

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

            {/* Alarms */}
            {displayedAlarms.length > 0 && (
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
                    {displayedAlarms.map((alarm) => (
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
                                width: "31%",
                                aspectRatio: 1,
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <Ionicons
                                name={(group.icon as keyof typeof Ionicons.glyphMap) || "people"}
                                size={40}
                                color={Colors.accent}
                                style={{ marginBottom: 10 }}
                            />
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

            </>
            )}
        </ScrollView>
    );
}
