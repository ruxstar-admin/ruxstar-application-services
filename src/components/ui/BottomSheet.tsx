import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Motion } from '@/constants/motion';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 800;
const FALLBACK_HEIGHT = 600;

/**
 * The one modal pattern for the whole app (report, pickers, confirmations): slides up over a dimmed
 * backdrop, closes on backdrop tap, Android back, or swipe down. Content sizes the sheet.
 */
export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const height = useSharedValue(FALLBACK_HEIGHT);

  // Mount as soon as it is asked to show; it unmounts itself when the close animation finishes.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration: Motion.duration.slow, easing: Motion.easing.standard });
      return;
    }
    drag.value = withTiming(0, { duration: Motion.duration.base });
    progress.value = withTiming(0, { duration: Motion.duration.base, easing: Motion.easing.accelerate }, (done) => {
      if (done) scheduleOnRN(setMounted, false);
    });
  }, [visible, progress, drag]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      drag.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) scheduleOnRN(onClose);
      else drag.value = withTiming(0, { duration: Motion.duration.fast });
    });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 1], [0, 1]) }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * height.value + drag.value }],
  }));

  if (!mounted) return null;

  return (
    <Modal transparent statusBarTranslucent animationType="none" visible onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View
            style={[styles.sheet, sheetStyle]}
            onLayout={(e) => {
              height.value = e.nativeEvent.layout.height;
            }}
          >
            <SafeAreaView edges={['bottom']}>
              <View style={styles.grabber} />
              {title ? <Text style={styles.title}>{title}</Text> : null}
              <View style={styles.content}>{children}</View>
            </SafeAreaView>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Brand.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.three,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: Brand.border,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  title: { ...Typography.heading, color: Brand.text, marginBottom: Spacing.three },
  content: { paddingBottom: Spacing.three, gap: Spacing.two },
});
