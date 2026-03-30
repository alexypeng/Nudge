import { useEffect } from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSpring,
    withDelay,
} from "react-native-reanimated";
import { Colors } from "../theme/colors";

interface ArcadeSpinnerProps {
    style?: ViewStyle;
}

function Dot({ delay }: { delay: number }) {
    const scale = useSharedValue(0.8);

    useEffect(() => {
        scale.value = withDelay(
            delay,
            withRepeat(
                withSpring(1.3, { damping: 15, stiffness: 120 }),
                -1,
                true,
            ),
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export function ArcadeSpinner({ style }: ArcadeSpinnerProps) {
    return (
        <View style={[styles.container, style]}>
            <View style={styles.dots}>
                <Dot delay={0} />
                <Dot delay={100} />
                <Dot delay={200} />
            </View>
            <Text style={styles.label}>LOADING</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
    },
    dots: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 99,
        backgroundColor: Colors.accent,
    },
    label: {
        fontSize: 10,
        fontWeight: "400",
        color: Colors.textDim,
        letterSpacing: 2.5,
    },
});
