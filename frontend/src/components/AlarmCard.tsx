import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
} from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { AlarmOut } from '../api/client';
import { GlassCard } from './GlassCard';

interface AlarmCardProps {
  alarm: AlarmOut;
  isRinging?: boolean;
  onPress?: () => void;
}

const SPRING = { damping: 15, stiffness: 120 };

export function AlarmCard({ alarm, isRinging = false, onPress }: AlarmCardProps) {
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    if (isRinging) {
      pulse.value = withRepeat(
        withSpring(1.03, SPRING),
        -1,
        true,
      );
    } else {
      pulse.value = withSpring(1, SPRING);
    }
  }, [isRinging]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const timeDisplay = alarm.time.slice(0, 5); // "HH:MM"

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={pulseStyle}>
        <GlassCard style={isRinging ? styles.ringingBorder : undefined}>
          <View style={styles.row}>
            <Text style={styles.time}>{timeDisplay}</Text>
            <View style={[
              styles.activeDot,
              { backgroundColor: alarm.is_active ? Colors.status.CHECKED_IN : Colors.status.EXPIRED },
            ]} />
          </View>
          <Text style={styles.name}>{alarm.name}</Text>
          {alarm.repeats ? (
            <Text style={styles.repeats}>{alarm.repeats}</Text>
          ) : (
            <Text style={styles.repeats}>One-time</Text>
          )}
        </GlassCard>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 8,
    letterSpacing: -0.5,
  },
  repeats: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ringingBorder: {
    borderColor: Colors.status.RINGING,
    borderWidth: 1,
  },
});
