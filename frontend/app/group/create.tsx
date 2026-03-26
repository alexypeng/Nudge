import { useGroupStore } from "@/src/stores/groupStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/src/theme/colors";
import { TactileButton } from "@/src/components/TactileButton";

const ICON_OPTIONS: (keyof typeof Ionicons.glyphMap)[] = [
    "people",
    "alarm",
    "sunny",
    "fitness",
    "book",
    "moon",
    "trophy",
    "flame",
    "star",
    "musical-notes",
    "heart",
    "rocket",
    "football",
    "cafe",
    "code-slash",
    "paw",
];

export default function GroupCreateScreen() {
    const router = useRouter();

    const createGroup = useGroupStore((s) => s.create);

    const [name, setName] = useState("");
    const [icon, setIcon] = useState<string>("people");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleGroupCreate = async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            await createGroup({ name, icon });
            router.back();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 px-5 pt-8"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ backgroundColor: Colors.background }}
        >
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
                ICON
            </Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                style={{ marginBottom: 16, flexGrow: 0 }}
            >
                {ICON_OPTIONS.map((name) => {
                    const selected = icon === name;
                    return (
                        <Pressable
                            key={name}
                            onPress={() => setIcon(name)}
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 12,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: selected
                                    ? Colors.accentSubtle
                                    : Colors.surface,
                                borderWidth: 1.5,
                                borderColor: selected
                                    ? Colors.borderHot
                                    : Colors.border,
                            }}
                        >
                            <Ionicons
                                name={name}
                                size={22}
                                color={selected ? Colors.accent : Colors.textSecondary}
                            />
                        </Pressable>
                    );
                })}
            </ScrollView>

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
                GROUP NAME
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
                placeholder="Early Birds"
                placeholderTextColor={Colors.textDim}
                autoFocus
            />

            {error && (
                <Text
                    className="mb-3"
                    style={{ fontSize: 13, color: Colors.statusLate }}
                >
                    {error}
                </Text>
            )}

            <TactileButton
                label="Create Group"
                onPress={handleGroupCreate}
                disabled={isSubmitting || !name}
            />
        </KeyboardAvoidingView>
    );
}
