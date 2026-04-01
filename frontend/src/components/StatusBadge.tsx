import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';
import { AlarmEventStatus } from '../api/client';

interface StatusBadgeProps {
  status: AlarmEventStatus;
}

const statusConfig: Record<AlarmEventStatus, { label: string; color: string }> = {
  RINGING: { label: 'Ringing', color: Colors.statusLate },
  SILENCED: { label: 'Snoozed', color: Colors.statusSnooze },
  CHECKED_IN: { label: 'On Time', color: Colors.statusUp },
  EXPIRED: { label: 'Expired', color: Colors.statusExpired },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, color } = statusConfig[status];

  return (
    <View style={[styles.pill, { backgroundColor: `${color}1A`, borderColor: `${color}40` }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
  },
});
