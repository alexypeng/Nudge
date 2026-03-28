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

    const [username, setUsername] = useState("");
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
                username,
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
                className="flex-1 px-8 pt-40"
                style={{ backgroundColor: Colors.background }}
            >
                <Text
                    className="text-3xl font-bold mb-2 text-center"
                    style={{
                        color: Colors.textPrimary,
                        letterSpacing: -0.5,
                    }}
                >
                    Get Started
                </Text>
                <Text
                    className="text-base mb-8 text-center"
                    style={{ color: Colors.textSecondary }}
                >
                    Your crew's got your back
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
                    value={username}
                    onChangeText={(t) => setUsername(t.replace(/\s/g, "").toLowerCase())}
                    placeholder="@username"
                    placeholderTextColor={Colors.textDim}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <TextInput
                    className="h-12 px-4 mb-3"
                    style={{
                        backgroundColor: Colors.surface,
                        color: Colors.textPrimary,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: Colors.border,
                    }}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Display Name"
                    placeholderTextColor={Colors.textDim}
                />
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
                    className="h-12 px-4 mb-3"
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
                    label="Create Account"
                    onPress={handleRegister}
                    disabled={isLoading}
                    className="mb-3"
                />
                <Link
                    href="/(auth)/login"
                    className="text-center mt-5"
                    style={{ color: Colors.textSecondary }}
                >
                    Already have an account? Sign in
                </Link>
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    );
}
