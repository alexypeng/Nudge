import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../theme/colors';
import { AlarmOut } from '../api/client';
import { GlassCard } from './GlassCard';

interface AlarmCardProps {
  alarm: AlarmOut;
  isRinging?: boolean;
  onPress?: () => void;
  onToggle?: (isActive: boolean) => void;
  className?: string;
}

const SPRING = { damping: 28, stiffness: 600 };

export function AlarmCard({ alarm, isRinging = false, onPress, onToggle, className }: AlarmCardProps) {
  const pulse = useSharedValue(1);
  const toggleX = useSharedValue(alarm.is_active ? 22 : 0);

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

  React.useEffect(() => {
    toggleX.value = withSpring(alarm.is_active ? 22 : 0, SPRING);
  }, [alarm.is_active]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: toggleX.value }],
  }));

  const [h, m] = alarm.time.slice(0, 5).split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  const timeDisplay = `${hour12}:${String(m).padStart(2, '0')}`;

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle?.(!alarm.is_active);
  };

  return (
    <Pressable className={className} onPress={onPress}>
      <Animated.View style={pulseStyle}>
        <GlassCard style={isRinging ? styles.ringingBorder : undefined}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={[styles.time, !alarm.is_active && styles.dimmed]}>{timeDisplay}</Text>
                <Text style={[styles.period, !alarm.is_active && styles.dimmed]}>{period}</Text>
              </View>
              <Text style={[styles.name, !alarm.is_active && styles.dimmed]}>{alarm.name}</Text>
              <Text style={styles.repeats}>
                {alarm.repeats || 'One-time'}
              </Text>
            </View>
            <Pressable onPress={handleToggle} hitSlop={8}>
              <View style={[
                styles.track,
                { backgroundColor: alarm.is_active ? Colors.accent : 'rgba(255,255,255,0.08)' },
              ]}>
                <Animated.View style={[styles.thumb, thumbStyle]} />
              </View>
            </Pressable>
          </View>
        </GlassCard>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardRow: {
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
  period: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
    marginLeft: 4,
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
  track: {
    width: 52,
    height: 30,
    borderRadius: 15,
    padding: 2,
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
  },
  dimmed: {
    opacity: 0.35,
  },
  ringingBorder: {
    borderColor: Colors.statusLate,
    borderWidth: 1.5,
  },
});
