import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Colors } from "../theme/colors";

const SPRING = { damping: 15, stiffness: 120 };
const SHADOW_DEPTH = 3;

interface HeaderSubmitButtonProps {
    canSubmit: boolean;
    isSubmitting: boolean;
    onSubmit: () => void;
    accessibilityLabel: string;
}

// Rendered as a native stack `headerRight`, so it sits in the same system header
// (and back button) as the rest of the app's stack screens on iOS and Android.
export function HeaderSubmitButton({
    canSubmit,
    isSubmitting,
    onSubmit,
    accessibilityLabel,
}: HeaderSubmitButtonProps) {
    const sink = useSharedValue(0);
    const sinkStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: sink.value }],
        shadowOffset: { width: 0, height: SHADOW_DEPTH - sink.value },
    }));

    return (
        <Pressable
            onPressIn={() => {
                sink.value = withSpring(SHADOW_DEPTH, SPRING);
            }}
            onPressOut={() => {
                sink.value = withSpring(0, SPRING);
            }}
            onPress={() => {
                if (!canSubmit) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSubmit();
            }}
            disabled={!canSubmit}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
        >
            <Animated.View
                style={[styles.button, { opacity: canSubmit ? 1 : 0.3 }, sinkStyle]}
            >
                {isSubmitting ? (
                    <ActivityIndicator size="small" color={Colors.surface} />
                ) : (
                    <Check color={Colors.surface} size={18} strokeWidth={3} />
                )}
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 36,
        height: 36,
        marginBottom: SHADOW_DEPTH,
        borderRadius: 99,
        backgroundColor: Colors.accent,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: Colors.accentPress,
        shadowOffset: { width: 0, height: SHADOW_DEPTH },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
});
