import React from 'react';
import { StyleSheet, Text, Pressable, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../theme/colors';

interface TactileButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'ghost';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  className?: string;
}

const SPRING = { damping: 28, stiffness: 600 };

const variantColors = {
  primary: { bg: Colors.accent, shadow: Colors.accentPress },
  danger: { bg: Colors.statusLate, shadow: '#B91C1C' },
  ghost: { bg: 'transparent', shadow: 'transparent' },
};

export function TactileButton({
  label,
  onPress,
  variant = 'primary',
  style,
  textStyle,
  disabled = false,
  className,
}: TactileButtonProps) {
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const { bg, shadow } = variantColors[variant];
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => {
        translateY.value = withSpring(4, SPRING);
      }}
      onPressOut={() => {
        translateY.value = withSpring(0, SPRING);
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className={className}
      style={[styles.wrapper, style, disabled && styles.disabled]}
    >
      {!isGhost && (
        <Animated.View style={[styles.shadow, { backgroundColor: shadow }]} />
      )}
      <Animated.View
        style={[
          styles.surface,
          { backgroundColor: bg },
          isGhost && styles.ghostBorder,
          animatedStyle,
        ]}
      >
        <Text
          style={[
            styles.label,
            isGhost && { color: Colors.accent },
            textStyle,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    height: 56,
  },
  shadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 52,
    borderRadius: 12,
  },
  surface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  ghostBorder: {
    borderWidth: 1.5,
    borderColor: Colors.borderHot,
  },
  disabled: {
    opacity: 0.5,
  },
});
