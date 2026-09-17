export interface AlarmConfig {
    id: string;
    hour: number;
    minute: number;
    date?: string;
    daysOfWeek?: number[];
    title: string;
    body: string;
    data?: Record<string, string>;
}

export interface AlarmCapability {
    available: boolean;
    reason: string;
    /** Android 14+: whether alarms can open full screen over the lock screen. */
    canUseFullScreenIntent?: boolean;
    /** Android: alarms ring through a notification, so they need notifications enabled. */
    notificationsEnabled?: boolean;
}

export interface AlarmEvent {
    alarmId: string;
    action: "fired" | "dismissed" | "snoozed";
}

export type ExpoAlarmModuleEvents = {
    onAlarmFired: (event: AlarmEvent) => void;
};
