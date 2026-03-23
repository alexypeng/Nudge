import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
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
      <View style={styles.content}>{children}</View>
    </View>
  );
}

// TODO: migrate to Unistyles
const styles = StyleSheet.create({
  outer: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  tint: {
    backgroundColor: Colors.surface,
  },
  content: {
    padding: 20,
  },
});
