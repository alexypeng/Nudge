import { useRef, useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    useWindowDimensions,
    StyleSheet,
    ViewToken,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/src/theme/colors";
import { TactileButton } from "@/src/components/TactileButton";
import * as Haptics from "expo-haptics";

const ONBOARDING_KEY = "ringsync_onboarding_seen";

interface Page {
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
}

const pages: Page[] = [
    {
        id: "1",
        icon: "alarm-outline",
        title: "Wake up together",
        subtitle:
            "Set alarms with your friends and hold each other accountable every morning.",
    },
    {
        id: "2",
        icon: "notifications-outline",
        title: "Ring your friends",
        subtitle:
            "When someone oversleeps, give them a nudge. They\u2019ll get a push notification to wake up.",
    },
    {
        id: "3",
        icon: "trophy-outline",
        title: "Stay on track",
        subtitle:
            "See who\u2019s got the best wake-up rate in your group. Check in on time to climb the leaderboard.",
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            if (viewableItems.length > 0 && viewableItems[0].index != null) {
                setCurrentIndex(viewableItems[0].index);
            }
        },
        [],
    );

    const handleNext = () => {
        if (currentIndex < pages.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handleDone = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await AsyncStorage.setItem(ONBOARDING_KEY, "true");
        router.replace("/(tabs)");
    };

    const isLast = currentIndex === pages.length - 1;

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={pages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={[styles.page, { width }]}>
                        <View style={styles.iconContainer}>
                            <Ionicons
                                name={item.icon}
                                size={72}
                                color={Colors.accent}
                            />
                        </View>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.subtitle}>{item.subtitle}</Text>
                    </View>
                )}
            />

            {/* Dots */}
            <View style={styles.dotsRow}>
                {pages.map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            i === currentIndex && styles.dotActive,
                        ]}
                    />
                ))}
            </View>

            {/* Button */}
            <View style={styles.buttonContainer}>
                <TactileButton
                    label={isLast ? "Get Started" : "Next"}
                    onPress={isLast ? handleDone : handleNext}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    page: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.accentSubtle,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: "900",
        color: Colors.textPrimary,
        letterSpacing: -0.5,
        textAlign: "center",
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 15,
        color: Colors.textSecondary,
        textAlign: "center",
        lineHeight: 22,
    },
    dotsRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        marginBottom: 24,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "rgba(255,255,255,0.15)",
    },
    dotActive: {
        backgroundColor: Colors.accent,
        width: 24,
    },
    buttonContainer: {
        paddingHorizontal: 32,
        paddingBottom: 50,
    },
});
