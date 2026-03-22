import { useState } from "react";
import {
    Text,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { useAuthStore } from "@/src/stores/authStore";
import { TactileButton } from "@/src/components/TactileButton";
import { Colors } from "@/src/theme/colors";

export default function RegisterPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const { register, isLoading } = useAuthStore();

    const handleRegister = async () => {
        setError(null);
        try {
            await register({
                username: email,
                display_name: displayName,
                email,
                password,
                timezone,
            });
            router.replace("/(tabs)");
        } catch (err) {
            setError((err as Error).message);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 px-6 pt-16"
            style={{ backgroundColor: Colors.background }}
        >
            <Text
                className="text-3xl font-bold mb-2"
                style={{
                    color: Colors.text.primary,
                    letterSpacing: -0.5,
                    fontFamily: "Inter-Bold",
                }}
            >
                Create Account
            </Text>
            <Text
                className="text-base mb-8"
                style={{ color: Colors.text.secondary }}
            >
                Join RingSync and never oversleep
            </Text>
            <TextInput
                className="h-12 px-4 mb-3"
                style={{
                    backgroundColor: Colors.surface,
                    color: Colors.text.primary,
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: Colors.border.top,
                }}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display Name"
                placeholderTextColor={Colors.text.tertiary}
            />
            <TextInput
                className="h-12 px-4 mb-3"
                style={{
                    backgroundColor: Colors.surface,
                    color: Colors.text.primary,
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: Colors.border.top,
                }}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={Colors.text.tertiary}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                className="h-12 px-4 mb-3"
                style={{
                    backgroundColor: Colors.surface,
                    color: Colors.text.primary,
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: Colors.border.top,
                }}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
                placeholder="Password"
                placeholderTextColor={Colors.text.tertiary}
            />
            {error ? (
                <Text
                    className="text-sm mb-3"
                    style={{ color: Colors.status.RINGING }}
                >
                    {error}
                </Text>
            ) : null}
            <TactileButton
                label="Create Account"
                onPress={handleRegister}
                disabled={isLoading}
                className="mb-3"
            />
            <Link
                href="/(auth)/login"
                className="text-center mt-5"
                style={{ color: Colors.text.secondary }}
            >
                Already have an account? Sign in
            </Link>
        </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    );
}
