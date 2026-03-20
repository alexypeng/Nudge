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

const SPRING = { damping: 15, stiffness: 120 };

const variantColors = {
  primary: { bg: '#6366F1', shadow: '#4338CA' },
  danger: { bg: Colors.status.RINGING, shadow: '#B91C1C' },
  ghost: { bg: 'rgba(255,255,255,0.1)', shadow: 'rgba(255,255,255,0.05)' },
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
      <Animated.View style={[styles.shadow, { backgroundColor: shadow }]} />
      <Animated.View style={[styles.surface, { backgroundColor: bg }, animatedStyle]}>
        <Text style={[styles.label, textStyle]}>{label}</Text>
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
    borderRadius: 16,
  },
  surface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  disabled: {
    opacity: 0.5,
  },
});
