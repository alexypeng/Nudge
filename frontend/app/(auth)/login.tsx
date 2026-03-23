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

export default function LoginScreen() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const { login, isLoading } = useAuthStore();

    const handleLogin = async () => {
        setError(null);
        try {
            await login({ email, password });
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
                    color: Colors.textPrimary,
                    letterSpacing: -0.5,
                }}
            >
                Sign In
            </Text>
            <Text
                className="text-base mb-8"
                style={{ color: Colors.textSecondary }}
            >
                Welcome back to RingSync
            </Text>
            <TextInput
                className="h-12 px-4 mb-3"
                style={{
                    backgroundColor: Colors.surface,
                    color: Colors.textPrimary,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: Colors.border,
                }}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={Colors.textDim}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                className="h-12 px-4 mb-4"
                style={{
                    backgroundColor: Colors.surface,
                    color: Colors.textPrimary,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: Colors.border,
                }}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
                placeholder="Password"
                placeholderTextColor={Colors.textDim}
            />
            {error ? (
                <Text
                    className="text-sm mb-3"
                    style={{ color: Colors.statusLate }}
                >
                    {error}
                </Text>
            ) : null}
            <TactileButton
                label="Sign In"
                onPress={handleLogin}
                disabled={isLoading}
                className="mb-3"
            />
            <Link
                href="/(auth)/register"
                className="text-center mt-5"
                style={{
                    color: Colors.textSecondary,
                }}
            >
                Don't have an account? Sign up
            </Link>
        </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    );
}
