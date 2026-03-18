import { Tabs } from "expo-router";
import { Colors } from "@/src/theme/colors";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.background,
                    borderTopColor: "rgba(255,255,255,0.08)",
                },
                tabBarActiveTintColor: "#6C63FF",
                tabBarInactiveTintColor: Colors.text.secondary,
            }}
        >
            <Tabs.Screen name="index" options={{ title: "Home" }} />
            <Tabs.Screen name="alarms" options={{ title: "Alarms" }} />
            <Tabs.Screen name="groups" options={{ title: "Groups" }} />
            <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        </Tabs>
    );
}
