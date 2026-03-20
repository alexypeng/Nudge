import { useState } from "react";
import { Text, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, Link } from "expo-router";
import { useAuthStore } from "@/src/stores/authStore";
import { TactileButton } from "@/src/components/TactileButton";
import { Colors } from "@/src/theme/colors";

export default function RegisterPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [password, setPassword] = useState("");
    const [timezone, setTimezone] = useState("UTC");
    const [error, setError] = useState<string | null>(null);

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
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 px-6 pt-16"
            style={{ backgroundColor: Colors.background }}
        >
            <Text
                className="text-3xl font-bold tracking-tight mb-8"
                style={{ color: Colors.text.primary }}
            >
                Create Account
            </Text>
            <TextInput
                className="rounded-2xl h-12 px-4 mb-3"
                style={{
                    backgroundColor: Colors.surface,
                    color: Colors.text.primary,
                }}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display Name"
                placeholderTextColor={Colors.text.tertiary}
            />
            <TextInput
                className="rounded-2xl h-12 px-4 mb-3"
                style={{
                    backgroundColor: Colors.surface,
                    color: Colors.text.primary,
                }}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={Colors.text.tertiary}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                className="rounded-2xl h-12 px-4 mb-3"
                style={{
                    backgroundColor: Colors.surface,
                    color: Colors.text.primary,
                }}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
                placeholder="Password"
                placeholderTextColor={Colors.text.tertiary}
            />
            <TextInput
                className="rounded-2xl h-12 px-4 mb-4"
                style={{
                    backgroundColor: Colors.surface,
                    color: Colors.text.primary,
                }}
                value={timezone}
                onChangeText={setTimezone}
                placeholder="Timezone"
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
    );
}
