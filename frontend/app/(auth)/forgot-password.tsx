import { useState } from "react";
import {
    Text,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import { TactileButton } from "@/src/components/TactileButton";
import { Colors } from "@/src/theme/colors";
import { api } from "@/src/api/client";

export default function ForgotPasswordScreen() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [step, setStep] = useState<"email" | "code">("email");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSendCode = async () => {
        setError(null);
        setIsLoading(true);
        try {
            await api.forgotPassword(email);
            setStep("code");
            setSuccess("Check your email for a 6-digit code.");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setError(null);
        setSuccess(null);
        setIsLoading(true);
        try {
            await api.resetPassword(email, code, newPassword);
            router.replace("/(auth)/login");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
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
                    Reset Password
                </Text>
                <Text
                    className="text-base mb-8 text-center"
                    style={{ color: Colors.textSecondary }}
                >
                    {step === "email"
                        ? "Enter your email to get a reset code"
                        : "Enter the code and your new password"}
                </Text>

                {step === "email" ? (
                    <>
                        <TextInput
                            className="h-14 px-4 mb-4"
                            style={{
                                backgroundColor: Colors.surface,
                                color: Colors.textPrimary,
                                borderRadius: 14,
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
                        {error && (
                            <Text
                                className="text-sm mb-3"
                                style={{ color: Colors.statusLate }}
                            >
                                {error}
                            </Text>
                        )}
                        <TactileButton
                            label="Send Code"
                            onPress={handleSendCode}
                            disabled={!email || isLoading}
                        />
                    </>
                ) : (
                    <>
                        {success && (
                            <Text
                                className="text-sm mb-3"
                                style={{ color: Colors.statusUp }}
                            >
                                {success}
                            </Text>
                        )}
                        <TextInput
                            className="h-14 px-4 mb-3"
                            style={{
                                backgroundColor: Colors.surface,
                                color: Colors.textPrimary,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: Colors.border,
                                fontSize: 20,
                                letterSpacing: 8,
                                textAlign: "center",
                            }}
                            value={code}
                            onChangeText={(t) =>
                                setCode(t.replace(/[^0-9]/g, "").slice(0, 6))
                            }
                            placeholder="000000"
                            placeholderTextColor={Colors.textDim}
                            keyboardType="number-pad"
                            maxLength={6}
                        />
                        <TextInput
                            className="h-14 px-4 mb-4"
                            style={{
                                backgroundColor: Colors.surface,
                                color: Colors.textPrimary,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: Colors.border,
                            }}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                            placeholder="New password"
                            placeholderTextColor={Colors.textDim}
                        />
                        {error && (
                            <Text
                                className="text-sm mb-3"
                                style={{ color: Colors.statusLate }}
                            >
                                {error}
                            </Text>
                        )}
                        <TactileButton
                            label="Reset Password"
                            onPress={handleResetPassword}
                            disabled={
                                code.length !== 6 || !newPassword || isLoading
                            }
                        />
                    </>
                )}

                <Text
                    className="text-center mt-5"
                    style={{ color: Colors.textSecondary }}
                    onPress={() => router.back()}
                >
                    Back to Sign In
                </Text>
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    );
}
