import React from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import { Colors } from '../theme/colors';
import { GroupOut } from '../api/client';
import { GlassCard } from './GlassCard';

interface GroupCardProps {
  group: GroupOut;
  onPress?: () => void;
  className?: string;
}

export function GroupCard({ group, onPress, className }: GroupCardProps) {
  return (
    <Pressable className={className} onPress={onPress}>
      <GlassCard>
        <Text style={styles.name}>{group.name}</Text>
      </GlassCard>
    </Pressable>
  );
}

// TODO: migrate to Unistyles
const styles = StyleSheet.create({
  name: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
});
