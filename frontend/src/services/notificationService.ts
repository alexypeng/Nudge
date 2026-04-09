import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { router } from "expo-router";
import { api } from "@/src/api/client";

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
                action === "alarm_checked_in" ||
                action === "alarm_expired"
            ) {
                const { useAlarmStore } = require("@/src/stores/alarmStore");
                useAlarmStore.getState().fetch();
            }

            if (
                action === "group_member_added" ||
                action === "group_member_joined" ||
                action === "group_member_left" ||
                action === "group_updated"
            ) {
                const { useGroupStore } = require("@/src/stores/groupStore");
                useGroupStore.getState().fetch();
            }

            if (
                action === "alarm_created" ||
                action === "alarm_updated" ||
                action === "alarm_deleted"
            ) {
                const { useAlarmStore } = require("@/src/stores/alarmStore");
                const { useGroupStore } = require("@/src/stores/groupStore");
                useAlarmStore.getState().fetch();
                useGroupStore.getState().fetch();
            }

            if (action === "friend_accepted") {
                const { useFriendStore } = require("@/src/stores/friendStore");
                useFriendStore.getState().fetch();
            }

            if (action === "friend_request_received") {
                const { useFriendStore } = require("@/src/stores/friendStore");
                useFriendStore.getState().fetchAll();
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
                const { useAlarmStore } = require("@/src/stores/alarmStore");
                useAlarmStore.getState().fetch();
                router.replace("/(tabs)/");
            }
        },
    );

    return () => {
        receivedSub.remove();
        responseSub.remove();
    };
}
