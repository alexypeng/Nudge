import ExpoAlarm, { AlarmEvent } from "@/modules/expo-alarm";
import { AlarmOut } from "@/src/api/client";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";

const DAY_MAP: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
};

function repeatsToDaysOfWeek(repeats: string): number[] {
    if (!repeats) return [];
    return repeats
        .split(",")
        .map((d) => DAY_MAP[d.trim()])
        .filter((n) => n !== undefined);
}

export async function scheduleAlarm(alarm: AlarmOut) {
    if (!ExpoAlarm || !alarm.is_active || !alarm.next_trigger_utc) return;

    const [hourStr, minuteStr] = alarm.time.split(":");

    try {
        await ExpoAlarm.scheduleAlarm({
            id: alarm.id,
            hour: parseInt(hourStr, 10),
            minute: parseInt(minuteStr, 10),
            date: alarm.is_one_time ? alarm.next_trigger_utc : undefined,
            daysOfWeek: alarm.is_one_time
                ? undefined
                : repeatsToDaysOfWeek(alarm.repeats),
            title: alarm.name,
            body: "Rise and shine! Open Nudge to check in.",
            data: { alarmId: alarm.id },
        });
    } catch (e) {
        console.warn("[Alarm] schedule failed:", e);
    }
}

/** Removes an alarm's schedule entirely. Use when the alarm is deleted or turned off. */
export async function cancelAlarm(alarmId: string) {
    if (!ExpoAlarm) return;
    await ExpoAlarm.cancelAlarm(alarmId);
}

/** Silences a ringing alarm but keeps its schedule, so repeating alarms still fire next time. */
export async function stopRinging(alarmId: string) {
    if (!ExpoAlarm) return;
    try {
        await ExpoAlarm.stopRinging(alarmId);
    } catch (e) {
        console.warn("[Alarm] stopRinging failed:", e);
    }
}

export async function syncAllAlarms(alarms: AlarmOut[]) {
    if (!ExpoAlarm) return;
    await ExpoAlarm.cancelAllAlarms();
    const active = alarms.filter((a) => a.is_active && a.next_trigger_utc);
    await Promise.all(active.map(scheduleAlarm));
}

export async function requestAlarmPermission(): Promise<boolean> {
    if (!ExpoAlarm) return false;

    // Android alarms ring through a notification, so they need notification permission
    // (Android 13+) even when push registration is skipped, e.g. on an emulator.
    if (Platform.OS === "android") {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
            await Notifications.requestPermissionsAsync();
        }
    }

    return ExpoAlarm.requestPermission();
}

export async function checkAlarmCapability() {
    if (!ExpoAlarm) {
        return { available: false, reason: "Native module not available" };
    }
    const capability = await ExpoAlarm.checkCapability();
    if (!capability.available) {
        console.warn("[Alarm] capability:", capability.reason);
    }
    return capability;
}

// The same ring can be reported twice (live event + pending alarm on resume); open it once.
const REOPEN_GUARD_MS = 2 * 60 * 1000;
let lastOpened: { alarmId: string; at: number } | null = null;

function openCheckIn(alarmId: string) {
    const now = Date.now();
    if (lastOpened?.alarmId === alarmId && now - lastOpened.at < REOPEN_GUARD_MS) {
        return;
    }
    lastOpened = { alarmId, at: now };

    const { useAlarmStore } = require("@/src/stores/alarmStore");
    useAlarmStore.getState().fetch();
    router.push({ pathname: "/alarm/active", params: { alarmId } });
}

/**
 * Opens the check-in screen for an alarm that rang while the app was closed or backgrounded:
 * the user tapped Stop (iOS), or the notification / full-screen alarm (Android).
 */
export async function openPendingAlarm() {
    if (!ExpoAlarm) return;
    const alarmId = await ExpoAlarm.consumePendingAlarm();
    if (alarmId) openCheckIn(alarmId);
}

/** Opens the check-in screen when an alarm fires while the app is in the foreground. */
export function setupAlarmListener() {
    if (!ExpoAlarm) return { remove: () => {} };
    // The pending alarm is left in place (Android uses it to show over the lock screen);
    // the reopen guard stops it from opening a second time on resume.
    return ExpoAlarm.addListener("onAlarmFired", (event: AlarmEvent) => {
        openCheckIn(event.alarmId);
    });
}
