import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Colors } from '../theme/colors';
import { GroupOut } from '../api/client';
import { GlassCard } from './GlassCard';
import { GroupIcon } from './GroupIcon';

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
          <GroupIcon
            name={group.icon}
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
