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
}

export interface AlarmEvent {
    alarmId: string;
    action: "fired" | "dismissed" | "snoozed";
}

export type ExpoAlarmModuleEvents = {
    onAlarmFired: (event: AlarmEvent) => void;
};
