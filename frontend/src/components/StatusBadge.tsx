import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';
import { AlarmEventStatus } from '../api/client';

interface StatusBadgeProps {
  status: AlarmEventStatus;
}

const labels: Record<AlarmEventStatus, string> = {
  RINGING: 'Ringing',
  SILENCED: 'Silenced',
  CHECKED_IN: 'Checked In',
  EXPIRED: 'Expired',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = Colors.status[status];

  return (
    <View style={[styles.pill, { backgroundColor: `${color}22`, borderColor: color }]}>
      <Text style={[styles.label, { color }]}>{labels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
});
