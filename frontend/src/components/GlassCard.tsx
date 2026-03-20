import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
}

export function GlassCard({ children, style, className }: GlassCardProps) {
  return (
    <View className={className} style={[styles.outer, style]}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
      <LinearGradient
        colors={[Colors.border.top, Colors.border.bottom]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.borderOverlay]}
        pointerEvents="none"
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  tint: {
    backgroundColor: Colors.surface,
  },
  borderOverlay: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  content: {
    padding: 16,
  },
});
