import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { router } from "expo-router";
import { api } from "@/src/api/client";
import { useAlarmStore } from "@/src/stores/alarmStore";

export function setupNotifications() {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

export async function registerForPushNotifications(authToken: string) {
    if (!Device.isDevice) return;

    const { status } = await Notifications.getPermissionsAsync();
    let finalStatus = status;

    if (status !== "granted") {
        const { status: newStatus } =
            await Notifications.requestPermissionsAsync();
        finalStatus = newStatus;
    }

    if (finalStatus !== "granted") return;

    const pushToken = await Notifications.getDevicePushTokenAsync();

    await api.registerDevice(authToken, {
        push_token: pushToken.data as string,
        device_type: Platform.OS as "ios" | "android",
    });
}

export function setupNotificationListeners() {
    const receivedSub = Notifications.addNotificationReceivedListener(
        (notification) => {
            const data = notification.request.content.data;
            const action = data?.action as string | undefined;

            if (
                action === "alarm_ringing" ||
                action === "alarm_silenced" ||
                action === "alarm_checked_in" ||
                action === "alarm_expired"
            ) {
                useAlarmStore.getState().fetch();
            }
        },
    );

    const responseSub = Notifications.addNotificationResponseReceivedListener(
        (response) => {
            const data = response.notification.request.content.data;
            const action = data?.action as string | undefined;
            const alarmId = data?.alarm_id as string | undefined;

            if (!action || !alarmId) return;

            if (action === "alarm_ringing" || action === "manual_ring") {
                router.push({ pathname: "/alarm/active", params: { alarmId } });
            }
        },
    );

    return () => {
        receivedSub.remove();
        responseSub.remove();
    };
}
