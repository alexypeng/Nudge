import { View, Text, ScrollView, Pressable } from "react-native";
import { Redirect, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { Bell, Users } from "lucide-react-native";
import * as Haptics from "expo-haptics";
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

interface RingableFriend {
    alarmId: string;
    alarmName: string;
    alarmTime: string;
    userId: string;
    displayName: string;
    groupId: string;
    groupName: string;
    eventCreatedAt: string;
}

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
    const [activeEvents, setActiveEvents] = useState<
        Record<string, AlarmEventOut>
    >({});
    const [ringableFriends, setRingableFriends] = useState<RingableFriend[]>([]);
    const [ringStatus, setRingStatus] = useState<Record<string, string>>({});

    const fetchEvents = async () => {
        if (!token) return;
        const allAlarms = useAlarmStore.getState().alarms;
        const events: Record<string, AlarmEventOut> = {};
        await Promise.all(
            allAlarms.map(async (alarm) => {
                try {
                    const event = await api.getLatestEvent(token, alarm.id);
                    if (event && event.status === "RINGING") {
                        events[alarm.id] = event;
                    }
                } catch {}
            }),
        );
        setActiveEvents(events);
    };

    const handleCheckIn = async (alarmId: string) => {
        if (!token) return;
        await api.checkIn(token, alarmId);
        await fetchEvents();
    };

    const fetchRingableFriends = async () => {
        if (!token || !user) return;
        try {
            const currentGroups = useGroupStore.getState().groups;
            if (currentGroups.length === 0) {
                setRingableFriends([]);
                return;
            }

            const groupDataResults = await Promise.allSettled(
                currentGroups.map(async (group) => {
                    const [alarms, members] = await Promise.all([
                        api.listGroupAlarms(token, group.id),
                        api.listGroupMembers(token, group.id),
                    ]);
                    return { group, alarms, members };
                }),
            );

            const userNameMap: Record<string, string> = {};
            const otherAlarms: {
                alarm: { id: string; name: string; time: string; user_id: string };
                group: { id: string; name: string };
            }[] = [];

            for (const result of groupDataResults) {
                if (result.status !== "fulfilled") continue;
                const { group, alarms, members } = result.value;
                for (const member of members) {
                    userNameMap[member.id] = member.display_name;
                }
                for (const alarm of alarms) {
                    if (alarm.user_id !== user.id) {
                        otherAlarms.push({ alarm, group });
                    }
                }
            }

            if (otherAlarms.length === 0) {
                setRingableFriends([]);
                return;
            }

            const eventResults = await Promise.allSettled(
                otherAlarms.map(async ({ alarm, group }) => {
                    const event = await api.getLatestEvent(token, alarm.id);
                    return { alarm, group, event };
                }),
            );

            const ringable: RingableFriend[] = [];
            for (const result of eventResults) {
                if (result.status !== "fulfilled") continue;
                const { alarm, group, event } = result.value;
                if (event && event.status === "EXPIRED") {
                    ringable.push({
                        alarmId: alarm.id,
                        alarmName: alarm.name,
                        alarmTime: alarm.time,
                        userId: alarm.user_id,
                        displayName: userNameMap[alarm.user_id] ?? "Unknown",
                        groupId: group.id,
                        groupName: group.name,
                        eventCreatedAt: event.created_at,
                    });
                }
            }

            ringable.sort(
                (a, b) =>
                    new Date(b.eventCreatedAt).getTime() -
                    new Date(a.eventCreatedAt).getTime(),
            );

            setRingableFriends(ringable);
        } catch {
            setRingableFriends([]);
        }
    };

    const handleRing = async (alarmId: string) => {
        if (!token) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await api.triggerAlarm(token, alarmId);
            setRingStatus((prev) => ({ ...prev, [alarmId]: "Sent!" }));
        } catch (err) {
            const message = (err as Error).message;
            setRingStatus((prev) => ({
                ...prev,
                [alarmId]: message.includes("429")
                    ? "Too soon, try again shortly"
                    : message,
            }));
        }
        setTimeout(
            () =>
                setRingStatus((prev) => {
                    const next = { ...prev };
                    delete next[alarmId];
                    return next;
                }),
            3000,
        );
    };

    useFocusEffect(
        useCallback(() => {
            alarmFetch().then(fetchEvents);
            groupFetch().then(fetchRingableFriends);
            const activeIds = new Set(
                useAlarmStore
                    .getState()
                    .alarms.filter((a) => a.is_active)
                    .map((a) => a.id),
            );
            setVisibleIds(activeIds);
        }, []),
    );

    if (!token) return <Redirect href="/(auth)/login" />;

    const isFirstLoad =
        (alarmLoading && alarms.length === 0) ||
        (groupLoading && groups.length === 0);
    const fetchError = alarmError || groupError;

    const displayedAlarms = alarms
        .filter((a) => a.is_active || visibleIds.has(a.id))
        .sort((a, b) => a.time.localeCompare(b.time));
    const activeAlarms = alarms.filter((a) => a.is_active);
    const nextAlarm = activeAlarms
        .filter((a) => a.next_trigger_utc)
        .sort(
            (a, b) =>
                new Date(a.next_trigger_utc!).getTime() -
                new Date(b.next_trigger_utc!).getTime(),
        )[0];

    return (
        <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1 }}
            contentContainerClassName="px-5 pt-14 pb-8"
            style={{ backgroundColor: Colors.background }}
        >
            {/* Greeting */}
            <Text
                style={{
                    fontSize: 28,
                    fontWeight: "900",
                    color: Colors.textPrimary,
                    letterSpacing: -0.5,
                    marginBottom: 15,
                    paddingTop: 30,
                    textAlign: "center",
                }}
            >
                {getGreeting()}, {user?.display_name ?? "there"}
            </Text>

            {fetchError && (
                <ErrorBanner
                    message={fetchError}
                    onRetry={() => {
                        alarmFetch();
                        groupFetch();
                    }}
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
                                PENDING CHECK-IN
                            </Text>
                            {Object.entries(activeEvents).map(
                                ([alarmId, event]) => {
                                    const alarm = alarms.find(
                                        (a) => a.id === alarmId,
                                    );
                                    if (!alarm) return null;
                                    const { time: t12, period } = formatTime12h(
                                        alarm.time,
                                    );
                                    return (
                                        <RingingAlarmCard
                                            key={alarmId}
                                            alarmName={alarm.name}
                                            time={t12}
                                            period={period}
                                            eventCreatedAt={event.created_at}
                                            onCheckIn={() =>
                                                handleCheckIn(alarmId)
                                            }
                                        />
                                    );
                                },
                            )}
                        </>
                    )}

                    {/* Ring Your Friends */}
                    {ringableFriends.length > 0 && (
                        <>
                            <Text
                                className="mt-6 mb-2"
                                style={{
                                    fontSize: 10,
                                    fontWeight: "400",
                                    color: Colors.statusSnooze,
                                    letterSpacing: 2.5,
                                    textTransform: "uppercase",
                                }}
                            >
                                RING YOUR FRIENDS
                            </Text>
                            {ringableFriends.map((friend) => {
                                const { time: t12, period } = formatTime12h(
                                    friend.alarmTime,
                                );
                                const status = ringStatus[friend.alarmId];
                                return (
                                    <GlassCard
                                        key={friend.alarmId}
                                        style={{
                                            marginBottom: 8,
                                            borderColor: Colors.statusSnooze,
                                        }}
                                    >
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                            }}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={{
                                                        fontSize: 15,
                                                        fontWeight: "900",
                                                        color: Colors.textPrimary,
                                                        letterSpacing: -0.5,
                                                    }}
                                                >
                                                    {friend.displayName}
                                                </Text>
                                                <Text
                                                    style={{
                                                        fontSize: 12,
                                                        color: Colors.textSecondary,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    {friend.alarmName} · {t12}{" "}
                                                    {period}
                                                </Text>
                                                <Text
                                                    style={{
                                                        fontSize: 11,
                                                        color: Colors.textDim,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    {friend.groupName} · needs a
                                                    wake-up call
                                                </Text>
                                            </View>
                                            <View
                                                style={{ alignItems: "center" }}
                                            >
                                                <Pressable
                                                    onPress={() =>
                                                        handleRing(
                                                            friend.alarmId,
                                                        )
                                                    }
                                                    style={{
                                                        backgroundColor:
                                                            Colors.accentSubtle,
                                                        borderWidth: 1,
                                                        borderColor:
                                                            "rgba(96,165,250,0.25)",
                                                        borderRadius: 99,
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 6,
                                                        flexDirection: "row",
                                                        alignItems: "center",
                                                        gap: 4,
                                                    }}
                                                >
                                                    <Ionicons
                                                        name="notifications"
                                                        size={14}
                                                        color={Colors.accent}
                                                    />
                                                    <Text
                                                        style={{
                                                            fontSize: 10,
                                                            fontWeight: "700",
                                                            color: Colors.accent,
                                                        }}
                                                    >
                                                        Ring
                                                    </Text>
                                                </Pressable>
                                                {status && (
                                                    <Text
                                                        style={{
                                                            fontSize: 10,
                                                            color:
                                                                status ===
                                                                "Sent!"
                                                                    ? Colors.statusUp
                                                                    : Colors.statusLate,
                                                            marginTop: 4,
                                                        }}
                                                    >
                                                        {status}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    </GlassCard>
                                );
                            })}
                        </>
                    )}

                    {/* Next Alarm Hero */}
                    <Text
                        className="mt-6 mb-2"
                        style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: Colors.textDim,
                            letterSpacing: 2,
                            textTransform: "uppercase",
                            paddingLeft: 5,
                            paddingBottom: 6,
                        }}
                    >
                        NEXT ALARM
                    </Text>
                    {nextAlarm ? (
                        <GlassCard style={{ borderColor: Colors.borderHot }}>
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "baseline",
                                }}
                            >
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
                        <View
                            style={{
                                alignItems: "center",
                                paddingVertical: 24,
                            }}
                        >
                            <Bell
                                color={Colors.textDim}
                                size={36}
                                strokeWidth={1.5}
                            />
                            <Text
                                style={{
                                    fontSize: 14,
                                    fontWeight: "700",
                                    color: Colors.textSecondary,
                                    marginTop: 12,
                                }}
                            >
                                No alarms yet
                            </Text>
                        </View>
                    )}

                    {/* Alarms */}
                    {displayedAlarms.length > 0 && (
                        <>
                            <Text
                                className="mt-6 mb-2"
                                style={{
                                    fontSize: 12,
                                    fontWeight: "700",
                                    color: Colors.textDim,
                                    letterSpacing: 2,
                                    textTransform: "uppercase",
                                    paddingLeft: 5,
                                }}
                            >
                                ACTIVE
                            </Text>
                            {displayedAlarms.map((alarm) => (
                                <AlarmCard
                                    key={alarm.id}
                                    alarm={alarm}
                                    groupName={
                                        groups.find(
                                            (g) => g.id === alarm.group_id,
                                        )?.name
                                    }
                                    className="mb-2"
                                    onPress={() =>
                                        router.push({
                                            pathname: "/alarm/[id]",
                                            params: { id: alarm.id },
                                        })
                                    }
                                    onToggle={(isActive) =>
                                        alarmUpdate(alarm.id, {
                                            is_active: isActive,
                                        })
                                    }
                                />
                            ))}
                        </>
                    )}

                    {/* Groups */}
                    <Text
                        className="mt-6 mb-2"
                        style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: Colors.textDim,
                            letterSpacing: 2,
                            textTransform: "uppercase",
                            paddingLeft: 5,
                            paddingBottom: 6,
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
                                        name={
                                            (group.icon as keyof typeof Ionicons.glyphMap) ||
                                            "people"
                                        }
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
                        <View
                            style={{
                                alignItems: "center",
                                paddingVertical: 24,
                            }}
                        >
                            <Users
                                color={Colors.textDim}
                                size={36}
                                strokeWidth={1.5}
                            />
                            <Text
                                style={{
                                    fontSize: 14,
                                    fontWeight: "700",
                                    color: Colors.textSecondary,
                                    marginTop: 12,
                                }}
                            >
                                No groups yet
                            </Text>
                        </View>
                    )}
                </>
            )}
        </ScrollView>
    );
}
