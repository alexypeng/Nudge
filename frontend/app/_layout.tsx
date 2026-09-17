import "@/global.css";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/src/stores/authStore";
import { Colors } from "@/src/theme/colors";
import {
    requestAlarmPermission,
    checkAlarmCapability,
    openPendingAlarm,
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
    const insets = useSafeAreaInsets();

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

    // An alarm that rang while the app was closed or backgrounded opens its check-in screen
    // on launch and on every return to the foreground (once the navigator is mounted).
    useEffect(() => {
        if (!isLoaded || !token) return;
        openPendingAlarm().catch((e) => console.warn("[Alarm] pending check failed:", e));
        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active") {
                openPendingAlarm().catch((e) => console.warn("[Alarm] pending check failed:", e));
            }
        });
        return () => sub.remove();
    }, [isLoaded, token]);

    if (!isLoaded) return null;

    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: Colors.background },
                headerTintColor: Colors.textPrimary,
                headerBackButtonDisplayMode: "minimal",
                // Keep stack screen content above the Android navigation bar and the
                // iPhone home indicator; apps draw behind both (edge-to-edge).
                contentStyle: {
                    backgroundColor: Colors.background,
                    paddingBottom: insets.bottom,
                },
            }}
        >
            <Stack.Screen
                name="(tabs)"
                options={{
                    headerShown: false,
                    // The tab bar pads itself for the bottom inset.
                    contentStyle: { backgroundColor: Colors.background },
                }}
            />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen
                name="onboarding"
                options={{ headerShown: false, animation: "fade" }}
            />
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
        </Stack>
    );
}
