import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Motion } from '@/constants/motion';
import { Feedback } from '@/lib/haptics';

interface SegmentedTabsProps<K extends string> {
  options: readonly { key: K; label: string }[];
  /** undefined = nothing selected yet (the highlight is hidden). */
  value: K | undefined;
  onChange: (key: K) => void;
}

const PADDING = Spacing.one;

/** Pill switcher (Password / One-time code, Personal / Business). The highlight slides on the UI thread. */
export function SegmentedTabs<K extends string>({ options, value, onChange }: SegmentedTabsProps<K>) {
  const [width, setWidth] = useState(0);
  const segment = (width - PADDING * 2) / options.length;
  const index = options.findIndex((o) => o.key === value);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: segment,
    transform: [{ translateX: withTiming(index * segment, { duration: Motion.duration.base, easing: Motion.easing.standard }) }],
  }));

  return (
    <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {width > 0 && index >= 0 ? <Animated.View style={[styles.indicator, indicatorStyle]} /> : null}
      {options.map((option) => (
        <Pressable
          key={option.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: option.key === value }}
          style={styles.option}
          onPress={() => {
            if (option.key === value) return;
            Feedback.select();
            onChange(option.key);
          }}
        >
          <Text style={[styles.label, option.key === value && styles.labelActive]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: PADDING, borderRadius: Radius.pill, backgroundColor: Brand.surfaceAlt },
  indicator: { position: 'absolute', top: PADDING, bottom: PADDING, left: PADDING, borderRadius: Radius.pill, backgroundColor: Brand.border },
  option: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' },
  label: { ...Typography.body, fontSize: 14, color: Brand.textMuted },
  labelActive: { color: Brand.text, fontFamily: Typography.bodyStrong.fontFamily },
});
