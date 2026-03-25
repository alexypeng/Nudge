import { Tabs } from "expo-router";
import { Home, Bell, Users, User } from "lucide-react-native";
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
                tabBarActiveTintColor: Colors.accent,
                tabBarInactiveTintColor: Colors.textSecondary,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="alarms"
                options={{
                    title: "Alarms",
                    tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="groups"
                options={{
                    title: "Groups",
                    tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
                }}
            />
        </Tabs>
    );
}
