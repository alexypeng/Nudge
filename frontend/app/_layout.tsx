import "@/global.css";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Stack, Redirect } from "expo-router";
import { useAuthStore } from "@/src/stores/authStore";

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary,
} from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const { token, isLoaded, loadToken } = useAuthStore();

    useEffect(() => {
        loadToken();
    }, []);

    useEffect(() => {
        if (isLoaded) SplashScreen.hideAsync();
    }, [isLoaded]);

    if (!isLoaded) return null;
    if (!token) return <Redirect href="/(auth)/login" />;

    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: "#0A0A0F" },
                headerTintColor: "#FFFFFF",
                contentStyle: { backgroundColor: "#0A0A0F" },
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
            <Stack.Screen name="group/[id]" options={{ title: "Group" }} />
        </Stack>
    );
}
