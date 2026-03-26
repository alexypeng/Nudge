// Reexport the native module. On web, it will be resolved to ExpoAlarmModule.web.ts
// and on native platforms to ExpoAlarmModule.ts
export { default } from './src/ExpoAlarmModule';
export { default as ExpoAlarmView } from './src/ExpoAlarmView';
export * from  './src/ExpoAlarm.types';
