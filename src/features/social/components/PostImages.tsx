import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { PhotoViewer } from '@/features/social/components/PhotoViewer';
import { frameRatio, photoSource } from '@/features/social/lib/photo-source';
import { Feedback } from '@/lib/haptics';
import type { PostPhoto } from '@/types/social';

const HEART_SIZE = 96;
/** A finger that moves further than this is scrolling, not tapping. */
const TAP_SLOP = 10;

interface PostImagesProps {
  photos: PostPhoto[];
  /** Double-tap on a photo. The heart shows either way; the caller decides whether that likes the post. */
  onDoubleTap?: () => void;
}

/**
 * A post's photos, one at a time at the first photo's shape: swipe for the next, tap to open full screen,
 * double-tap to like. Sizes are set in points once the row is measured: on Android, photos sized by
 * percentage and aspect ratio stayed blank.
 */
export function PostImages({ photos, onDoubleTap }: PostImagesProps) {
  const [width, setWidth] = useState(0);
  const [current, setCurrent] = useState(0);
  const [viewing, setViewing] = useState<number | null>(null);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const heartStyle = useAnimatedStyle(() => ({ opacity: heartOpacity.value, transform: [{ scale: heartScale.value }] }));

  if (photos.length === 0) return null;
  const ratio = frameRatio(photos[0]);
  const height = Math.round(width / ratio);
  const many = photos.length > 1;

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.floor(e.nativeEvent.layout.width));
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setCurrent(Math.min(photos.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / width))));
  };

  const open = (i: number) => {
    Feedback.tap();
    setViewing(i);
  };
  const like = () => {
    Feedback.press();
    heartScale.value = withSequence(withSpring(1, { damping: 9, stiffness: 260 }), withDelay(380, withTiming(0.6, { duration: 180 })));
    heartOpacity.value = withSequence(withTiming(1, { duration: 90 }), withDelay(420, withTiming(0, { duration: 180 })));
    onDoubleTap?.();
  };

  const slide = (photo: PostPhoto, i: number) => {
    const doubleTap = Gesture.Tap().numberOfTaps(2).maxDistance(TAP_SLOP).runOnJS(true).onEnd(like);
    const singleTap = Gesture.Tap().maxDistance(TAP_SLOP).runOnJS(true).onEnd(() => open(i));
    return (
      <GestureDetector key={photo.url} gesture={Gesture.Exclusive(doubleTap, singleTap)}>
        <View
          accessible
          accessibilityRole="imagebutton"
          accessibilityLabel={many ? `Photo ${i + 1} of ${photos.length}` : 'Post photo'}
          accessibilityHint="Opens full screen"
          onAccessibilityTap={() => open(i)}
          style={{ width, height }}
          collapsable={false}
        >
          <Image source={photoSource(photo, width)} style={{ width, height }} contentFit="cover" transition={150} recyclingKey={photo.url} />
        </View>
      </GestureDetector>
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.frame, { aspectRatio: ratio }]} onLayout={onLayout}>
        {width > 0 ? (
          many ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={32}
            >
              {photos.map(slide)}
            </ScrollView>
          ) : (
            slide(photos[0], 0)
          )
        ) : null}

        <Animated.View pointerEvents="none" style={[styles.heart, heartStyle]}>
          <Ionicons name="heart" size={HEART_SIZE} color={Brand.text} />
        </Animated.View>

        {many ? (
          <View pointerEvents="none" style={styles.counter}>
            <Text style={styles.counterText}>{`${current + 1}/${photos.length}`}</Text>
          </View>
        ) : null}
      </View>

      {many ? (
        <View style={styles.dots} importantForAccessibility="no-hide-descendants">
          {photos.map((photo, i) => (
            <View key={photo.url} style={[styles.dot, i === current && styles.dotOn]} />
          ))}
        </View>
      ) : null}

      <PhotoViewer photos={photos} index={viewing} onClose={() => setViewing(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  frame: { width: '100%', overflow: 'hidden', borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  heart: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -HEART_SIZE / 2,
    marginLeft: -HEART_SIZE / 2,
  },
  counter: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  counterText: { ...Typography.caption, fontSize: 12, color: Brand.text, fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.one + 1 },
  dot: { width: 6, height: 6, borderRadius: Radius.pill, backgroundColor: Brand.border },
  dotOn: { backgroundColor: Brand.primarySoft },
});
