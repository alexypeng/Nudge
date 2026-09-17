import { Tabs } from "expo-router";
import { Home, Bell, Users, UserPlus, Settings } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/src/theme/colors";
import { FONT_FAMILY } from "@/src/components/Text";

// Height of the tab content (12 top padding + icon + label) above the system inset.
// The inset is added on top so the bar clears the iPhone home indicator and Android's
// 3-button or gesture navigation bar, which apps draw behind since edge-to-edge became mandatory.
const TAB_BAR_CONTENT_HEIGHT = 64;

export default function TabLayout() {
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.background,
                    borderTopColor: Colors.hairline,
                    paddingTop: 12,
                    paddingBottom: insets.bottom,
                    height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
                },
                tabBarLabelStyle: { fontFamily: FONT_FAMILY, fontWeight: "700" },
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
                name="friends"
                options={{
                    title: "Friends",
                    tabBarIcon: ({ color, size }) => <UserPlus color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
                }}
            />
        </Tabs>
    );
}
