import { View, Pressable, StyleSheet, ViewStyle } from "react-native";
import { Text } from "@/src/components/Text";
import { CircleAlert, X } from "lucide-react-native";
import { GlassCard } from "./GlassCard";
import { Colors } from "../theme/colors";
import * as Haptics from "expo-haptics";

interface ErrorBannerProps {
    message: string;
    onRetry?: () => void;
    onDismiss?: () => void;
    style?: ViewStyle;
}

export function ErrorBanner({ message, onRetry, onDismiss, style }: ErrorBannerProps) {
    return (
        <GlassCard style={[styles.card, style]}>
            <View style={styles.row}>
                <CircleAlert size={18} color={Colors.statusLate} />
                <Text style={styles.message} numberOfLines={2}>
                    {message}
                </Text>
                {onRetry && (
                    <Pressable
                        style={styles.retryPill}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onRetry();
                        }}
                    >
                        <Text style={styles.retryText}>Retry</Text>
                    </Pressable>
                )}
                {onDismiss && (
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onDismiss();
                        }}
                        hitSlop={8}
                    >
                        <X size={16} color={Colors.textDim} />
                    </Pressable>
                )}
            </View>
        </GlassCard>
    );
}

const styles = StyleSheet.create({
    card: {
        borderColor: Colors.statusLateBorder,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    message: {
        flex: 1,
        fontSize: 13,
        fontWeight: "400",
        color: Colors.statusLate,
    },
    retryPill: {
        backgroundColor: Colors.statusLateSubtle,
        borderWidth: 1,
        borderColor: Colors.statusLateBorder,
        borderRadius: 99,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    retryText: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.statusLate,
    },
});
