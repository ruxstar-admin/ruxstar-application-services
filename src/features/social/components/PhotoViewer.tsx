import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { FlatList, Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Motion } from '@/constants/motion';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { photoPlaceholder } from '@/features/social/lib/photo-source';
import { Feedback } from '@/lib/haptics';
import type { PostPhoto } from '@/types/social';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(max, Math.max(min, value));
};

interface PageProps {
  photo: PostPhoto;
  width: number;
  height: number;
  active: boolean;
  dismissY: SharedValue<number>;
  onZoomed: (zoomed: boolean) => void;
  onClose: () => void;
}

/** One photo, fitted to the screen. Pinch or double-tap to zoom, drag when zoomed, swipe down to close when not. */
function Page({ photo, width, height, active, dismissY, onZoomed, onClose }: PageProps) {
  const [zoomed, setZoomed] = useState(false);
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  const ratio = photo.width > 0 && photo.height > 0 ? photo.width / photo.height : 1;
  const fitWidth = Math.min(width, height * ratio);
  const fitHeight = fitWidth / ratio;

  const report = (next: boolean) => {
    setZoomed(next);
    onZoomed(next);
  };

  // Swiping to another photo leaves this one at its normal size.
  if (!active && zoomed) setZoomed(false);
  useEffect(() => {
    if (active) return;
    scale.value = 1;
    x.value = 0;
    y.value = 0;
  }, [active, scale, x, y]);

  const limitX = (s: number) => {
    'worklet';
    return Math.max(0, (fitWidth * s - width) / 2);
  };
  const limitY = (s: number) => {
    'worklet';
    return Math.max(0, (fitHeight * s - height) / 2);
  };

  const settle = () => {
    'worklet';
    const timing = { duration: Motion.duration.base, easing: Motion.easing.standard };
    if (scale.value <= 1.02) {
      scale.value = withTiming(1, timing);
      x.value = withTiming(0, timing);
      y.value = withTiming(0, timing);
      scheduleOnRN(report, false);
      return;
    }
    x.value = withTiming(clamp(x.value, -limitX(scale.value), limitX(scale.value)), timing);
    y.value = withTiming(clamp(y.value, -limitY(scale.value), limitY(scale.value)), timing);
    scheduleOnRN(report, true);
  };

  const pinch = Gesture.Pinch()
    .onStart((e) => {
      startScale.value = scale.value;
      startX.value = x.value;
      startY.value = y.value;
      focalX.value = e.focalX - width / 2;
      focalY.value = e.focalY - height / 2;
    })
    .onUpdate((e) => {
      const next = clamp(startScale.value * e.scale, 0.8, MAX_SCALE);
      // Keep the point between the fingers where it was.
      const grow = next / startScale.value;
      scale.value = next;
      x.value = focalX.value - (focalX.value - startX.value) * grow;
      y.value = focalY.value - (focalY.value - startY.value) * grow;
    })
    .onEnd(() => settle());

  const move = Gesture.Pan()
    .enabled(zoomed)
    .maxPointers(1)
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
    })
    .onUpdate((e) => {
      x.value = clamp(startX.value + e.translationX, -limitX(scale.value), limitX(scale.value));
      y.value = clamp(startY.value + e.translationY, -limitY(scale.value), limitY(scale.value));
    })
    .onEnd((e) => {
      x.value = withDecay({ velocity: e.velocityX, clamp: [-limitX(scale.value), limitX(scale.value)] });
      y.value = withDecay({ velocity: e.velocityY, clamp: [-limitY(scale.value), limitY(scale.value)] });
    });

  const dismiss = Gesture.Pan()
    .enabled(!zoomed)
    .maxPointers(1)
    .activeOffsetY([-12, 12])
    .failOffsetX([-12, 12])
    .onUpdate((e) => {
      dismissY.value = e.translationY;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationY) > DISMISS_DISTANCE || Math.abs(e.velocityY) > DISMISS_VELOCITY) scheduleOnRN(onClose);
      else dismissY.value = withTiming(0, { duration: Motion.duration.fast });
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      const timing = { duration: Motion.duration.base, easing: Motion.easing.standard };
      if (scale.value > 1) {
        scale.value = withTiming(1, timing);
        x.value = withTiming(0, timing);
        y.value = withTiming(0, timing);
        scheduleOnRN(report, false);
        return;
      }
      const fx = e.x - width / 2;
      const fy = e.y - height / 2;
      scale.value = withTiming(DOUBLE_TAP_SCALE, timing);
      x.value = withTiming(clamp(-fx * (DOUBLE_TAP_SCALE - 1), -limitX(DOUBLE_TAP_SCALE), limitX(DOUBLE_TAP_SCALE)), timing);
      y.value = withTiming(clamp(-fy * (DOUBLE_TAP_SCALE - 1), -limitY(DOUBLE_TAP_SCALE), limitY(DOUBLE_TAP_SCALE)), timing);
      scheduleOnRN(report, true);
    });

  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, move, dismiss));

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.page, { width, height }]} collapsable={false}>
        <Animated.View style={[{ width: fitWidth, height: fitHeight }, photoStyle]}>
          <Image
            source={{ uri: photo.url }}
            placeholder={photoPlaceholder(photo)}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            transition={120}
            accessibilityLabel="Post photo"
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

interface PhotoViewerProps {
  photos: PostPhoto[];
  /** The photo to open on; null keeps the viewer closed. */
  index: number | null;
  onClose: () => void;
}

/** Post photos full screen on black: swipe between them, pinch or double-tap to zoom, swipe down or tap × to close. */
export function PhotoViewer({ photos, index, onClose }: PhotoViewerProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(index ?? 0);
  const [zoomed, setZoomed] = useState(false);
  const dismissY = useSharedValue(0);

  const [opened, setOpened] = useState(index);
  if (index !== opened) {
    setOpened(index);
    if (index !== null) {
      setCurrent(index);
      setZoomed(false);
    }
  }
  // Reset while closed, so a viewer that was swiped away opens in place next time.
  useEffect(() => {
    if (index === null) dismissY.value = 0;
  }, [index, dismissY]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(dismissY.value), [0, 400], [1, 0.25], 'clamp'),
  }));
  const stageStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dismissY.value }] }));
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(dismissY.value), [0, 80], [1, 0], 'clamp'),
  }));

  if (index === null) return null;
  const many = photos.length > 1;

  return (
    <Modal transparent statusBarTranslucent navigationBarTranslucent animationType="fade" visible onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
        <Animated.View style={[styles.flex, stageStyle]}>
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            scrollEnabled={many && !zoomed}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(photo) => photo.url}
            onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item, index: i }) => (
              <Page
                photo={item}
                width={width}
                height={height}
                active={i === current}
                dismissY={dismissY}
                onZoomed={setZoomed}
                onClose={onClose}
              />
            )}
          />
        </Animated.View>

        <Animated.View style={[styles.chrome, { paddingTop: insets.top + Spacing.two }, chromeStyle]} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close photo"
            hitSlop={8}
            onPress={() => {
              Feedback.tap();
              onClose();
            }}
            style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
          >
            <Ionicons name="close" size={26} color={Brand.text} />
          </Pressable>
          {many ? (
            <View style={styles.counter} accessibilityLiveRegion="polite">
              <Text style={styles.counterText}>{`${current + 1} of ${photos.length}`}</Text>
            </View>
          ) : null}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  backdrop: { backgroundColor: '#000' },
  page: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  chrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  closePressed: { backgroundColor: 'rgba(255,255,255,0.18)' },
  counter: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 2, borderRadius: Radius.pill, backgroundColor: 'rgba(0,0,0,0.45)' },
  counterText: { ...Typography.caption, color: Brand.text, fontVariant: ['tabular-nums'] },
});
