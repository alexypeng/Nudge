import { View, Text } from "react-native";
import { Colors } from "@/src/theme/colors";

export default function HomeScreen() {
    return (
        <View
            className="flex-1 items-center justify-center"
            style={{ backgroundColor: Colors.background }}
        >
            <Text style={{ color: Colors.text.primary }}>Home</Text>
        </View>
    );
}
