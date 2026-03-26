import { NativeModule, requireNativeModule } from "expo";
import {
    ExpoAlarmModuleEvents,
    AlarmConfig,
    AlarmCapability,
} from "./ExpoAlarm.types";

declare class ExpoAlarmModule extends NativeModule<ExpoAlarmModuleEvents> {
    requestPermission(): Promise<boolean>;
    checkCapability(): Promise<AlarmCapability>;
    scheduleAlarm(config: AlarmConfig): Promise<void>;
    cancelAlarm(id: string): Promise<void>;
    cancelAllAlarms(): Promise<void>;
}

export default requireNativeModule<ExpoAlarmModule>("ExpoAlarm");
