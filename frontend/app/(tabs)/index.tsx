import { View, Text } from "react-native";
import { Redirect } from "expo-router";
import { Colors } from "@/src/theme/colors";
import { useAuthStore } from "@/src/stores/authStore";

export default function HomeScreen() {
    const token = useAuthStore((s) => s.token);

    if (!token) return <Redirect href="/(auth)/login" />;

    return (
        <View
            className="flex-1 items-center justify-center"
            style={{ backgroundColor: Colors.background }}
        >
            <Text style={{ color: Colors.textPrimary }}>Home</Text>
        </View>
    );
}
