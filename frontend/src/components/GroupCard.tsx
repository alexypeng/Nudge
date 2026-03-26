import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        <View style={styles.row}>
          <Ionicons
            name={(group.icon as keyof typeof Ionicons.glyphMap) || 'people'}
            size={20}
            color={Colors.accent}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.name}>{group.name}</Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}

// TODO: migrate to Unistyles
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
});
