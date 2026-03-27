import "@/global.css";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Stack, Redirect } from "expo-router";
import { useAuthStore } from "@/src/stores/authStore";
import { Colors } from "@/src/theme/colors";
import {
    requestAlarmPermission,
    setupAlarmListener,
} from "@/src/services/alarmScheduler";
import {
    setupNotificationListeners,
    setupNotifications,
} from "@/src/services/notificationService";

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary,
} from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
setupNotifications();

export default function RootLayout() {
    const { token, isLoaded, loadToken } = useAuthStore();

    useEffect(() => {
        loadToken();
        requestAlarmPermission().catch(() => {});
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
    if (!token) return <Redirect href="/(auth)/login" />;

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
                options={{
                    headerShown: false,
                }}
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
        </Stack>
    );
}
