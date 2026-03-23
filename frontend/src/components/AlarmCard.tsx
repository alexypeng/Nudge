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
  className?: string;
}

const SPRING = { damping: 15, stiffness: 120 };

export function AlarmCard({ alarm, isRinging = false, onPress, className }: AlarmCardProps) {
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
    <Pressable className={className} onPress={onPress}>
      <Animated.View style={pulseStyle}>
        <GlassCard style={isRinging ? styles.ringingBorder : undefined}>
          <View style={styles.row}>
            <Text style={styles.time}>{timeDisplay}</Text>
            <View style={[
              styles.activeDot,
              { backgroundColor: alarm.is_active ? Colors.statusUp : Colors.statusExpired },
            ]} />
          </View>
          <Text style={styles.name}>{alarm.name}</Text>
          <Text style={styles.repeats}>
            {alarm.repeats || 'One-time'}
          </Text>
        </GlassCard>
      </Animated.View>
    </Pressable>
  );
}

// TODO: migrate to Unistyles
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.accent,
    letterSpacing: -0.5,
  },
  name: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginTop: 8,
    letterSpacing: -0.5,
  },
  repeats: {
    fontSize: 10,
    fontWeight: '400',
    color: Colors.textDim,
    marginTop: 4,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ringingBorder: {
    borderColor: Colors.statusLate,
    borderWidth: 1.5,
  },
});
