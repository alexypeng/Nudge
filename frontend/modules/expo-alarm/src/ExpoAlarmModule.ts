import { NativeModule, requireOptionalNativeModule } from "expo";
import {
    ExpoAlarmModuleEvents,
    AlarmConfig,
    AlarmCapability,
} from "./ExpoAlarm.types";

declare class ExpoAlarmModule extends NativeModule<ExpoAlarmModuleEvents> {
    requestPermission(): Promise<boolean>;
    checkCapability(): Promise<AlarmCapability>;
    checkNotificationPermission(): Promise<{ granted: boolean; canRequest: boolean }>;
    scheduleAlarm(config: AlarmConfig): Promise<void>;
    cancelAlarm(id: string): Promise<void>;
    cancelAllAlarms(): Promise<void>;
    /** The alarm that rang while the app was closed or in the background, cleared once read. */
    consumePendingAlarm(): Promise<string | null>;
    /** Silences a ringing alarm without cancelling its schedule. */
    stopRinging(id: string): Promise<void>;
}

export default requireOptionalNativeModule<ExpoAlarmModule>("ExpoAlarm");
