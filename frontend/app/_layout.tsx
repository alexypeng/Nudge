import "@/global.css";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { useAuthStore } from "@/src/stores/authStore";
import { Colors } from "@/src/theme/colors";
import {
    requestAlarmPermission,
    checkAlarmCapability,
    setupAlarmListener,
} from "@/src/services/alarmScheduler";
import {
    setupNotificationListeners,
    setupNotifications,
} from "@/src/services/notificationService";

export {
    ErrorBoundary,
} from "expo-router";

SplashScreen.preventAutoHideAsync();
setupNotifications();

export default function RootLayout() {
    const { token, isLoaded, loadToken } = useAuthStore();

    useEffect(() => {
        loadToken();
        requestAlarmPermission()
            .then(() => checkAlarmCapability())
            .catch((e) => console.warn("[Alarm] init error:", e));
        const alarmSub = setupAlarmListener();
        const cleanupNotifications = setupNotificationListeners();
        return () => {
            alarmSub.remove();
            cleanupNotifications();
        };
    }, []);

    useEffect(() => {
        if (isLoaded) SplashScreen.hideAsync();
    }, [isLoaded]);

    if (!isLoaded) return null;

    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: Colors.background },
                headerTintColor: Colors.textPrimary,
                headerBackButtonDisplayMode: "minimal",
                contentStyle: { backgroundColor: Colors.background },
            }}
        >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen
                name="alarm/create"
                options={{ title: "New Alarm", presentation: "modal" }}
            />
            <Stack.Screen name="alarm/[id]" options={{ title: "Edit Alarm" }} />
            <Stack.Screen
                name="alarm/active"
                options={{ headerShown: false, animation: "fade" }}
            />
            <Stack.Screen
                name="group/create"
                options={{ title: "New Group", presentation: "modal" }}
            />
            <Stack.Screen name="group/[id]" options={{ title: "Group" }} />
            <Stack.Screen
                name="friends/search"
                options={{ title: "Add Friends", presentation: "modal" }}
            />
            <Stack.Screen
                name="friends/add-to-group"
                options={{ title: "Add to Group", presentation: "modal" }}
            />
            <Stack.Screen name="settings" options={{ title: "Settings" }} />
        </Stack>
    );
}
