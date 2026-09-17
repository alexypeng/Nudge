import { forwardRef } from "react";
import {
    Platform,
    Text as RNText,
    TextInput as RNTextInput,
    type TextInputProps,
    type TextProps,
} from "react-native";

// DM Sans is embedded natively by the expo-font plugin (app.json). Android registers it as an
// xml font family named "DMSans"; iOS uses the family name from the font files, "DM Sans".
// Either way fontWeight selects the matching weight file, so styles only need to set fontWeight.
export const FONT_FAMILY = Platform.select({ android: "DMSans", default: "DM Sans" });

const fontStyle = { fontFamily: FONT_FAMILY };

/** React Native's Text with the app font applied; use it instead of importing Text from react-native. */
export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...props }, ref) {
    return <RNText ref={ref} style={[fontStyle, style]} {...props} />;
});

/** React Native's TextInput with the app font applied. */
export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
    { style, ...props },
    ref,
) {
    return <RNTextInput ref={ref} style={[fontStyle, style]} {...props} />;
});
