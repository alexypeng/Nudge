import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    ScrollView,
    Pressable,
    Modal,
    StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/src/stores/authStore";
import { Colors } from "@/src/theme/colors";
import { TactileButton } from "@/src/components/TactileButton";
import * as Haptics from "expo-haptics";

export default function SettingsScreen() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const updateUser = useAuthStore((s) => s.updateUser);
    const deleteAccount = useAuthStore((s) => s.deleteAccount);
    const logout = useAuthStore((s) => s.logout);

    const [displayName, setDisplayName] = useState(user?.display_name ?? "");
    const [email, setEmail] = useState(user?.email ?? "");
    const [username, setUsername] = useState(user?.username ?? "");
    const [newPassword, setNewPassword] = useState("");

    const [isSaving, setIsSaving] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const showSuccess = (msg: string) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(null), 3000);
    };

    const profileChanged =
        displayName !== (user?.display_name ?? "") ||
        email !== (user?.email ?? "") ||
        username !== (user?.username ?? "");

    const initial = displayName?.charAt(0).toUpperCase() ?? "?";

    const handleLogout = () => {
        logout();
        router.replace("/(auth)/login");
    };

    const handleSaveProfile = async () => {
        setError(null);
        setIsSaving(true);
        try {
            const updates: { display_name?: string; email?: string } = {};
            if (displayName !== user?.display_name)
                updates.display_name = displayName;
            if (email !== user?.email) updates.email = email;
            await updateUser(updates);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            showSuccess("Profile updated");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword) return;
        setError(null);
        setIsChangingPassword(true);
        try {
            await updateUser({ password: newPassword });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setNewPassword("");
            showSuccess("Password updated");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        setShowDeleteModal(false);
        setIsDeleting(true);
        try {
            await deleteAccount();
            router.replace("/(auth)/login");
        } catch (err) {
            setError((err as Error).message);
            setIsDeleting(false);
        }
    };

    return (
        <>
            <ScrollView
                className="flex-1 pt-16"
                contentContainerClassName="px-5 pt-8 pb-8"
                style={{ backgroundColor: Colors.background }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Feedback */}
                {error && (
                    <Text
                        style={[styles.feedback, { color: Colors.statusLate }]}
                    >
                        {error}
                    </Text>
                )}
                {success && (
                    <Text style={[styles.feedback, { color: Colors.statusUp }]}>
                        {success}
                    </Text>
                )}

                {/* Avatar */}
                <Text className="text-center" style={styles.fieldLabel}>
                    Profile Picture
                </Text>
                <View
                    className="w-32 h-32 rounded-full items-center justify-center mb-8 mt-4 self-center"
                    style={{ backgroundColor: Colors.avatarBlue }}
                >
                    <Text
                        style={{
                            fontSize: 56,
                            fontWeight: "900",
                            color: Colors.surface,
                        }}
                    >
                        {initial}
                    </Text>
                </View>

                <Text style={styles.fieldLabel}>Display Name</Text>
                <TextInput
                    className="h-14 px-4 mb-5"
                    style={styles.input}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholderTextColor={Colors.textDim}
                />

                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                    className="h-14 px-4 mb-5"
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor={Colors.textDim}
                />

                <Text style={styles.fieldLabel}>Username</Text>
                <TextInput
                    className="h-14 px-4 mb-8"
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    placeholderTextColor={Colors.textDim}
                />

                <TactileButton
                    label="Save Changes"
                    onPress={handleSaveProfile}
                    disabled={!profileChanged || isSaving}
                />

                {/* Password Section */}
                <Text style={[styles.sectionLabel, { marginTop: 32 }]}>
                    PASSWORD
                </Text>

                <Text style={styles.fieldLabel}>New Password</Text>
                <TextInput
                    className="h-14 px-4 mb-3"
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    placeholder="Enter new password"
                    placeholderTextColor={Colors.textDim}
                />

                <TactileButton
                    label="Update Password"
                    onPress={handleChangePassword}
                    disabled={!newPassword || isChangingPassword}
                />

                {/* Danger Zone */}
                <Text style={[styles.sectionLabel, { marginTop: 32 }]}>
                    DANGER ZONE
                </Text>

                {/* Logout */}
                <View className="w-full mb-4">
                    <TactileButton
                        label="Sign Out"
                        variant="danger"
                        onPress={handleLogout}
                    />
                </View>

                <TactileButton
                    label="Delete Account"
                    variant="danger"
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowDeleteModal(true);
                    }}
                    disabled={isDeleting}
                />
            </ScrollView>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <Pressable
                    className="flex-1 items-center justify-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                    onPress={() => setShowDeleteModal(false)}
                >
                    <Pressable
                        className="w-4/5"
                        style={{
                            backgroundColor: Colors.surface,
                            borderRadius: 18,
                            borderWidth: 1.5,
                            borderColor: "rgba(255, 99, 99, 0.3)",
                            padding: 20,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 15,
                                fontWeight: "900",
                                color: Colors.textPrimary,
                                letterSpacing: -0.5,
                                marginBottom: 8,
                            }}
                        >
                            Delete Account?
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                color: Colors.textSecondary,
                                marginBottom: 20,
                            }}
                        >
                            This will permanently delete your account and all
                            your data. This can't be undone.
                        </Text>
                        <View style={{ gap: 8 }}>
                            <TactileButton
                                label="Delete Forever"
                                variant="danger"
                                onPress={handleDeleteAccount}
                            />
                            <TactileButton
                                label="Cancel"
                                variant="ghost"
                                onPress={() => setShowDeleteModal(false)}
                            />
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    sectionLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.textDim,
        letterSpacing: 2,
        textTransform: "uppercase",
        paddingLeft: 5,
        paddingBottom: 6,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.textSecondary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: Colors.surface,
        color: Colors.textPrimary,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        fontSize: 15,
    },
    readonlyRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 4,
    },
    readonlyLabel: {
        fontSize: 10,
        fontWeight: "400",
        color: Colors.textDim,
        letterSpacing: 2.5,
        textTransform: "uppercase",
    },
    readonlyValue: {
        fontSize: 13,
        color: Colors.textPrimary,
    },
    divider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.05)",
        marginVertical: 10,
    },
    feedback: {
        fontSize: 13,
        marginBottom: 12,
    },
});
