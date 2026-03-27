import ExpoAlarm, { AlarmEvent } from "@/modules/expo-alarm";
import { AlarmOut } from "@/src/api/client";
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
  if (!alarm.is_active || !alarm.next_trigger_utc) return;

  const [hourStr, minuteStr] = alarm.time.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  await ExpoAlarm.scheduleAlarm({
    id: alarm.id,
    hour,
    minute,
    date: alarm.is_one_time ? alarm.next_trigger_utc : undefined,
    daysOfWeek: alarm.is_one_time ? undefined : repeatsToDaysOfWeek(alarm.repeats),
    title: alarm.name,
    body: "Time to wake up!",
    data: { alarmId: alarm.id },
  });
}

export async function cancelAlarm(alarmId: string) {
  await ExpoAlarm.cancelAlarm(alarmId);
}

export async function syncAllAlarms(alarms: AlarmOut[]) {
  await ExpoAlarm.cancelAllAlarms();
  const active = alarms.filter((a) => a.is_active && a.next_trigger_utc);
  await Promise.all(active.map(scheduleAlarm));
}

export async function requestAlarmPermission(): Promise<boolean> {
  return ExpoAlarm.requestPermission();
}

export async function checkAlarmCapability() {
  return ExpoAlarm.checkCapability();
}

export function setupAlarmListener() {
  return ExpoAlarm.addListener("onAlarmFired", (event: AlarmEvent) => {
    router.push({ pathname: "/alarm/active", params: { alarmId: event.alarmId } });
  });
}
