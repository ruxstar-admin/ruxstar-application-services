import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Chip } from '@/components/ui/Chip';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Motion } from '@/constants/motion';
import type { Profile } from '@/types/profile';

export type ProfileStep = 'photo' | 'bio' | 'city';

const STEPS: { key: ProfileStep; label: string; done: (p: Profile) => boolean }[] = [
  { key: 'photo', label: 'Add a photo', done: (p) => !!p.avatarUrl },
  { key: 'bio', label: 'Add a bio', done: (p) => p.bio.trim().length > 0 },
  { key: 'city', label: 'Add your city', done: (p) => p.city.trim().length > 0 },
];

interface ProfileChecklistProps {
  profile: Profile;
  onStep: (step: ProfileStep) => void;
}

/** What is still missing from your profile, one tap each. Renders nothing once all three are done. */
export function ProfileChecklist({ profile, onStep }: ProfileChecklistProps) {
  const missing = STEPS.filter((step) => !step.done(profile));
  const done = STEPS.length - missing.length;
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(done / STEPS.length, { duration: Motion.duration.slow, easing: Motion.easing.standard });
  }, [done, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  if (missing.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>Finish your profile</Text>
        <Text style={styles.count}>
          {done} of {STEPS.length}
        </Text>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: STEPS.length, now: done }}
        accessibilityLabel="Profile completion"
      >
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
      <Text style={styles.message}>People trust a profile with a face, a line about you and a city.</Text>
      <View style={styles.chips}>
        {missing.map((step) => (
          <Chip
            key={step.key}
            label={step.label}
            icon={<Ionicons name="add" size={18} color={Brand.primarySoft} />}
            onPress={() => onStep(step.key)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { ...Typography.bodyStrong, color: Brand.text },
  count: { ...Typography.caption, color: Brand.textMuted, fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: Radius.pill, backgroundColor: Brand.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill, backgroundColor: Brand.primary },
  message: { ...Typography.caption, color: Brand.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
});
