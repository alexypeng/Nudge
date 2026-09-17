import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/src/components/Text";
import { NudgeMark } from "@/src/components/NudgeMark";
import { TactileButton } from "@/src/components/TactileButton";
import { Colors } from "@/src/theme/colors";

export default function WelcomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.hero}>
                <View style={styles.glow}>
                    <NudgeMark size={132} accessibilityLabel="Nudge alarm clock logo" />
                </View>

                <Text style={styles.wordmark}>Nudge</Text>
                <Text style={styles.tagline}>Wake up together.</Text>
                <Text style={styles.body}>
                    Set alarms with friends, check in on time, and climb the leaderboard.
                </Text>
            </View>

            <View style={styles.actions}>
                <TactileButton
                    label="Get Started"
                    onPress={() => router.push("/(auth)/register")}
                />
                <TactileButton
                    label="I already have an account"
                    variant="ghost"
                    onPress={() => router.push("/(auth)/login")}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingHorizontal: 32,
        paddingBottom: 24,
    },
    hero: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    glow: {
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: Colors.accentSubtle,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    wordmark: {
        fontSize: 56,
        fontWeight: "900",
        color: Colors.accent,
        letterSpacing: -0.5,
    },
    tagline: {
        fontSize: 18,
        fontWeight: "900",
        color: Colors.textPrimary,
        letterSpacing: -0.5,
        marginTop: 4,
    },
    body: {
        fontSize: 13,
        fontWeight: "400",
        color: Colors.textSecondary,
        textAlign: "center",
        maxWidth: 280,
        marginTop: 10,
        lineHeight: 19,
    },
    actions: {
        gap: 12,
    },
});
