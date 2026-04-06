import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { useAlarmStore } from "@/src/stores/alarmStore";
import { useGroupStore } from "@/src/stores/groupStore";
import {
    View,
    Text,
    TextInput,
    ScrollView,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors } from "@/src/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "@/src/components/GlassCard";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function AlarmCreateScreen() {
    const router = useRouter();
    const navigation = useNavigation();

    const { groupId: paramGroupId } = useLocalSearchParams<{
        groupId?: string;
    }>();
    const createAlarm = useAlarmStore((s) => s.create);
    const groups = useGroupStore((s) => s.groups);
    const fetchGroups = useGroupStore((s) => s.fetch);

    const [name, setName] = useState("");
    const [selectedGroupId, setSelectedGroupId] = useState(paramGroupId ?? "");
    const [time, setTime] = useState(new Date());
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [groupSearch, setGroupSearch] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const insets = useSafeAreaInsets();
    const isOneTime = selectedDays.length === 0;
    const needsGroupPicker = !paramGroupId;
    const canSubmit = !!name && !!selectedGroupId && !isSubmitting;
    const btnY = useSharedValue(0);
    const btnAnim = useAnimatedStyle(() => ({
        transform: [{ translateY: btnY.value }],
    }));

    useEffect(() => {
        if (needsGroupPicker) fetchGroups();
    }, []);

    const toggleDay = (day: string) => {
        setSelectedDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
        );
    };

    const handleCreate = useCallback(async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            const timeStr = `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;
            await createAlarm({
                name,
                time: timeStr,
                repeats: DAYS.filter((d) => selectedDays.includes(d)).join(","),
                is_one_time: isOneTime,
                group_id: selectedGroupId,
            });
            router.back();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    }, [name, time, selectedDays, selectedGroupId, isOneTime]);

    useEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, []);

    return (
        <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ backgroundColor: Colors.background }}
        >
            <View
                style={[
                    styles.header,
                    { paddingTop: insets.top - 32, paddingBottom: 24 },
                ]}
            >
                <Text style={styles.headerTitle}>New Alarm</Text>
                <Pressable
                    onPressIn={() => {
                        btnY.value = withSpring(2, {
                            damping: 28,
                            stiffness: 600,
                        });
                    }}
                    onPressOut={() => {
                        btnY.value = withSpring(0, {
                            damping: 28,
                            stiffness: 600,
                        });
                    }}
                    onPress={() => {
                        if (!canSubmit) return;
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        handleCreate();
                    }}
                    disabled={!canSubmit}
                    style={styles.headerBtnHit}
                >
                    <Animated.View
                        style={[
                            styles.headerBtn,
                            { opacity: canSubmit ? 1 : 0.3 },
                            btnAnim,
                        ]}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator
                                size="small"
                                color={Colors.surface}
                            />
                        ) : (
                            <Check
                                color={Colors.surface}
                                size={18}
                                strokeWidth={3}
                            />
                        )}
                    </Animated.View>
                </Pressable>
            </View>
            <View style={styles.divider} />
            <ScrollView
                className="flex-1"
                contentContainerClassName="px-5 pt-4 pb-8"
            >
                {/* Time Picker */}
                <View className="items-center mb-8">
                    <DateTimePicker
                        value={time}
                        mode="time"
                        display="spinner"
                        is24Hour={false}
                        themeVariant="dark"
                        onChange={(_, selectedDate) => {
                            if (selectedDate) setTime(selectedDate);
                        }}
                    />
                </View>

                {/* Alarm Name */}
                <Text
                    style={{
                        fontSize: 10,
                        fontWeight: "400",
                        color: Colors.textDim,
                        letterSpacing: 2.5,
                        textTransform: "uppercase",
                        marginBottom: 6,
                    }}
                >
                    NAME
                </Text>
                <TextInput
                    className="h-12 px-4 mb-5"
                    style={{
                        backgroundColor: Colors.surface,
                        color: Colors.textPrimary,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: Colors.border,
                        fontSize: 15,
                    }}
                    value={name}
                    onChangeText={setName}
                    placeholder="Morning workout"
                    placeholderTextColor={Colors.textDim}
                />

                {/* Repeat Days */}
                <Text
                    style={{
                        fontSize: 10,
                        fontWeight: "400",
                        color: Colors.textDim,
                        letterSpacing: 2.5,
                        textTransform: "uppercase",
                        marginBottom: 6,
                    }}
                >
                    REPEAT
                </Text>
                <View className="flex-row justify-between mb-5">
                    {DAYS.map((day, i) => {
                        const active = selectedDays.includes(day);
                        return (
                            <Pressable
                                key={day}
                                onPress={() => toggleDay(day)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 99,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: active
                                        ? Colors.accent
                                        : Colors.surface,
                                    borderWidth: 1,
                                    borderColor: active
                                        ? Colors.accent
                                        : Colors.border,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 13,
                                        fontWeight: "700",
                                        color: active
                                            ? Colors.surface
                                            : Colors.textSecondary,
                                    }}
                                >
                                    {DAY_LABELS[i]}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Group Picker (only if not coming from a group) */}
                {needsGroupPicker && (
                    <>
                        <Text
                            style={{
                                fontSize: 10,
                                fontWeight: "400",
                                color: Colors.textDim,
                                letterSpacing: 2.5,
                                textTransform: "uppercase",
                                marginBottom: 6,
                            }}
                        >
                            GROUP
                        </Text>
                        {groups.length > 0 ? (
                            <>
                                <TextInput
                                    className="h-12 px-4 mb-4"
                                    style={{
                                        backgroundColor: Colors.surface,
                                        color: Colors.textPrimary,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: Colors.border,
                                        fontSize: 15,
                                    }}
                                    value={groupSearch}
                                    onChangeText={setGroupSearch}
                                    placeholder="Search groups"
                                    placeholderTextColor={Colors.textDim}
                                />
                                <View
                                    className="flex-row flex-wrap mb-2"
                                    style={{ gap: 8 }}
                                >
                                    {groups
                                        .filter((g) => {
                                            if (!groupSearch) return true;
                                            return g.name
                                                .toLowerCase()
                                                .includes(
                                                    groupSearch.toLowerCase(),
                                                );
                                        })
                                        .map((group) => {
                                            const active =
                                                selectedGroupId === group.id;
                                            return (
                                                <Pressable
                                                    key={group.id}
                                                    onPress={() =>
                                                        setSelectedGroupId(
                                                            group.id,
                                                        )
                                                    }
                                                    style={{
                                                        backgroundColor: active
                                                            ? Colors.accent
                                                            : Colors.surface,
                                                        borderWidth: 1.5,
                                                        borderColor: active
                                                            ? Colors.accent
                                                            : Colors.border,
                                                        borderRadius: 18,
                                                        padding: 16,
                                                        width: "31%",
                                                        aspectRatio: 1,
                                                        justifyContent:
                                                            "center",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <Ionicons
                                                        name={
                                                            (group.icon as keyof typeof Ionicons.glyphMap) ||
                                                            "people"
                                                        }
                                                        size={40}
                                                        color={
                                                            active
                                                                ? Colors.surface
                                                                : Colors.accent
                                                        }
                                                        style={{
                                                            marginBottom: 10,
                                                        }}
                                                    />
                                                    <Text
                                                        style={{
                                                            fontSize: 15,
                                                            fontWeight: "900",
                                                            color: active
                                                                ? Colors.surface
                                                                : Colors.textPrimary,
                                                            letterSpacing: -0.5,
                                                            textAlign: "center",
                                                        }}
                                                        numberOfLines={2}
                                                    >
                                                        {group.name}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                </View>
                                <View style={{ marginBottom: 12 }} />
                            </>
                        ) : (
                            <GlassCard className="mb-5">
                                <Text
                                    style={{
                                        fontSize: 13,
                                        color: Colors.textSecondary,
                                    }}
                                >
                                    No groups yet — create one first
                                </Text>
                            </GlassCard>
                        )}
                    </>
                )}

                {/* Error */}
                {error && (
                    <Text
                        className="mb-3"
                        style={{ fontSize: 13, color: Colors.statusLate }}
                    >
                        {error}
                    </Text>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "900",
        color: Colors.textPrimary,
        letterSpacing: -0.5,
    },
    headerBtnHit: {
        position: "absolute",
        right: 20,
    },
    headerBtn: {
        width: 42,
        height: 42,
        borderRadius: 99,
        backgroundColor: Colors.accent,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: Colors.accentPress,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
    divider: {
        height: 1,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
    },
});
