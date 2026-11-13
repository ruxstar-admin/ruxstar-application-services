import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Avatar } from '@/components/ui/Avatar';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import type { Author } from '@/types/social';

function Dot({ delay }: { delay: number }) {
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withDelay(delay, withRepeat(withSequence(withTiming(-4, { duration: 280 }), withTiming(0, { duration: 280 })), -1));
  }, [lift, delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }], opacity: 0.5 + (-lift.value / 4) * 0.5 }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** "typing…" as Instagram shows it: the person's photo and a bubble of three bouncing dots. */
export function TypingBubble({ people, showName }: { people: Author[]; showName: boolean }) {
  const first = people[0];
  if (!first) return null;
  const label = people.length === 1 ? `${first.name || first.username} is typing` : `${people.length} people are typing`;
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.row} accessibilityLiveRegion="polite" accessibilityLabel={label}>
      <Avatar name={first.name || first.username} uri={first.avatarUrl} size={28} />
      <View>
        {showName ? <Text style={styles.name}>{people.length === 1 ? first.name || first.username : label}</Text> : null}
        <View style={styles.bubble}>
          <Dot delay={0} />
          <Dot delay={140} />
          <Dot delay={280} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, marginTop: Spacing.two },
  name: { ...Typography.caption, color: Brand.textMuted, marginBottom: 2, marginLeft: Spacing.two },
  bubble: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surfaceAlt },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Brand.text },
});
