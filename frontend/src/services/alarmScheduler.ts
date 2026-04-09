import ExpoAlarm, { AlarmEvent } from "@/modules/expo-alarm";
import { api, AlarmOut } from "@/src/api/client";
import { router } from "expo-router";

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
    if (!ExpoAlarm) {
        console.warn("[Alarm] native module not loaded — cannot schedule");
        return;
    }
    if (!alarm.is_active || !alarm.next_trigger_utc) {
        console.warn(
            "[Alarm] skipping schedule — active:",
            alarm.is_active,
            "trigger:",
            alarm.next_trigger_utc,
        );
        return;
    }

    const [hourStr, minuteStr] = alarm.time.split(":");
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    const config = {
        id: alarm.id,
        hour,
        minute,
        date: alarm.is_one_time ? alarm.next_trigger_utc : undefined,
        daysOfWeek: alarm.is_one_time
            ? undefined
            : repeatsToDaysOfWeek(alarm.repeats),
        title: alarm.name,
        body: "Your alarm is ringing!",
        data: { alarmId: alarm.id },
    };

    console.log("[Alarm] scheduling:", JSON.stringify(config));
    try {
        await ExpoAlarm.scheduleAlarm(config);
        console.log("[Alarm] scheduled OK");
    } catch (e) {
        console.warn("[Alarm] schedule FAILED:", e);
    }
}

export async function cancelAlarm(alarmId: string) {
    if (!ExpoAlarm) return;
    await ExpoAlarm.cancelAlarm(alarmId);
}

export async function syncAllAlarms(alarms: AlarmOut[]) {
    if (!ExpoAlarm) {
        console.warn("[Alarm] native module not loaded — cannot sync");
        return;
    }
    await ExpoAlarm.cancelAllAlarms();
    const active = alarms.filter((a) => a.is_active && a.next_trigger_utc);
    console.log("[Alarm] syncing", active.length, "active alarms");
    await Promise.all(active.map(scheduleAlarm));
}

export async function requestAlarmPermission(): Promise<boolean> {
    if (!ExpoAlarm) {
        console.warn(
            "[Alarm] native module not loaded — cannot request permission",
        );
        return false;
    }
    const granted = await ExpoAlarm.requestPermission();
    console.log("[Alarm] permission granted:", granted);
    return granted;
}

export async function checkAlarmCapability() {
    if (!ExpoAlarm) {
        console.warn("[Alarm] native module not loaded");
        return { available: false, reason: "Native module not available" };
    }
    const cap = await ExpoAlarm.checkCapability();
    console.log("[Alarm] capability:", JSON.stringify(cap));
    return cap;
}

export function setupAlarmListener() {
    if (!ExpoAlarm) return { remove: () => {} };
    return ExpoAlarm.addListener("onAlarmFired", async (event: AlarmEvent) => {
        console.log(
            "[Alarm] onAlarmFired event received:",
            JSON.stringify(event),
        );
        const { useAuthStore } = require("@/src/stores/authStore");
        const { useAlarmStore } = require("@/src/stores/alarmStore");
        const token = useAuthStore.getState().token;

        if (token) {
            try {
                await api.ringAlarm(token, event.alarmId);
                console.log("[Alarm] ring API called successfully");
            } catch (e) {
                console.warn("[Alarm] ring API failed:", e);
            }
        }

        useAlarmStore.getState().fetch();
        try {
            router.push({
                pathname: "/alarm/active",
                params: { alarmId: event.alarmId },
            });
            console.log("[Alarm] navigation to /alarm/active triggered");
        } catch (e) {
            console.warn("[Alarm] navigation failed:", e);
        }
    });
}
