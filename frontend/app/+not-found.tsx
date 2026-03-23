import { View, Text } from "react-native";
import { Link } from "expo-router";
import { Colors } from "@/src/theme/colors";

export default function NotFoundScreen() {
    return (
        <View
            className="flex-1 items-center justify-center"
            style={{ backgroundColor: Colors.background }}
        >
            <Text
                className="text-2xl font-bold mb-4"
                style={{
                    color: Colors.textPrimary,
                }}
            >
                Page not found
            </Text>
            <Link href="/" style={{ color: Colors.accent }}>
                Go home
            </Link>
        </View>
    );
}
