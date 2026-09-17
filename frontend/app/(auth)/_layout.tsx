import { Stack } from "expo-router";
import { Colors } from "@/src/theme/colors";

// Welcome is the entry point for logged-out users; the forms push on top of it and get
// the same native back arrow as the rest of the app (transparent header, no title).
const formScreenOptions = {
    headerShown: true,
    headerTransparent: true,
    title: "",
    headerTintColor: Colors.textPrimary,
    headerBackButtonDisplayMode: "minimal" as const,
};

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background },
            }}
        >
            <Stack.Screen name="welcome" />
            <Stack.Screen name="login" options={formScreenOptions} />
            <Stack.Screen name="register" options={formScreenOptions} />
            <Stack.Screen name="forgot-password" options={formScreenOptions} />
        </Stack>
    );
}
