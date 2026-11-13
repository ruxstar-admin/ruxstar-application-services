import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Motion } from '@/constants/motion';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

const THUMB = 64;
const STEP = THUMB + Spacing.two;
const HOLD_MS = 220;

export interface StripPhoto {
  key: string;
  uri: string;
  status: 'uploading' | 'ready' | 'failed';
}

interface StripProps {
  photos: StripPhoto[];
  selected: string | null;
  onSelect: (key: string) => void;
  onRemove: (key: string) => void;
  onMove: (from: number, to: number) => void;
  /** Tiles after the photos, such as Add and Camera. */
  children?: React.ReactNode;
}

interface ThumbProps {
  photo: StripPhoto;
  index: number;
  count: number;
  selected: boolean;
  /** Keys in strip order, kept on the UI thread so the strip reorders live while a thumb is dragged. */
  order: SharedValue<string[]>;
  dragging: SharedValue<string>;
  onSelect: StripProps['onSelect'];
  onRemove: StripProps['onRemove'];
  onMove: StripProps['onMove'];
}

function Thumb({ photo, index, count, selected, order, dragging, onSelect, onRemove, onMove }: ThumbProps) {
  const { key } = photo;
  const lifted = useSharedValue(0);
  const start = useSharedValue(0);
  const dragX = useSharedValue(0);

  const pan = Gesture.Pan()
    .activateAfterLongPress(HOLD_MS)
    .onStart(() => {
      dragging.value = key;
      start.value = order.value.indexOf(key);
      dragX.value = 0;
      lifted.value = withTiming(1, { duration: Motion.duration.fast });
      scheduleOnRN(Feedback.select);
    })
    .onUpdate((e) => {
      dragX.value = e.translationX;
      const keys = order.value;
      const target = Math.min(keys.length - 1, Math.max(0, Math.round((start.value * STEP + e.translationX) / STEP)));
      const at = keys.indexOf(key);
      if (at === target) return;
      const next = keys.filter((k) => k !== key);
      next.splice(target, 0, key);
      order.value = next;
    })
    .onFinalize(() => {
      if (dragging.value !== key) return;
      dragging.value = '';
      lifted.value = withTiming(0, { duration: Motion.duration.fast });
      const end = order.value.indexOf(key);
      if (end !== start.value) scheduleOnRN(onMove, start.value, end);
    });
  const tap = Gesture.Tap()
    .maxDistance(10)
    .runOnJS(true)
    .onEnd(() => onSelect(key));

  const style = useAnimatedStyle(() => {
    const own = dragging.value === key;
    const slot = Math.max(0, order.value.indexOf(key));
    return {
      zIndex: own ? 2 : 1,
      transform: [
        { translateX: own ? start.value * STEP + dragX.value : withTiming(slot * STEP, { duration: Motion.duration.fast }) },
        { scale: 1 + lifted.value * 0.08 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.slot, style]}>
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Photo ${index + 1} of ${count}`}
          accessibilityState={{ selected }}
          accessibilityActions={[
            ...(index > 0 ? [{ name: 'earlier', label: 'Move earlier' }] : []),
            ...(index < count - 1 ? [{ name: 'later', label: 'Move later' }] : []),
          ]}
          onAccessibilityAction={(e) => onMove(index, e.nativeEvent.actionName === 'earlier' ? index - 1 : index + 1)}
          onAccessibilityTap={() => onSelect(photo.key)}
          style={[styles.thumb, selected && styles.thumbOn]}
          collapsable={false}
        >
          <Image source={{ uri: photo.uri }} style={styles.image} contentFit="cover" />
          {photo.status === 'uploading' ? (
            <View style={styles.overlay}>
              <ActivityIndicator size="small" color={Brand.text} />
            </View>
          ) : photo.status === 'failed' ? (
            <View style={styles.overlay}>
              <Ionicons name="alert-circle" size={22} color={Brand.error} />
            </View>
          ) : null}
        </View>
      </GestureDetector>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove photo ${index + 1}`}
        hitSlop={10}
        style={styles.remove}
        onPress={() => {
          Feedback.tap();
          onRemove(photo.key);
        }}
      >
        <Ionicons name="close" size={13} color={Brand.text} />
      </Pressable>
    </Animated.View>
  );
}

/** The photos of a post being made, in posting order. Hold one and drag to reorder; tap one to preview it. */
export function PhotoStrip({ photos, selected, onSelect, onRemove, onMove, children }: StripProps) {
  const keys = photos.map((p) => p.key);
  const joined = keys.join('|');
  const order = useSharedValue(keys);
  const dragging = useSharedValue('');
  useEffect(() => {
    order.value = joined ? joined.split('|') : [];
  }, [joined, order]);

  return (
    <View style={styles.row}>
      <View style={{ width: photos.length * STEP, height: THUMB }}>
        {photos.map((photo, i) => (
          <Thumb
            key={photo.key}
            photo={photo}
            index={i}
            count={photos.length}
            selected={photo.key === selected}
            order={order}
            dragging={dragging}
            onSelect={onSelect}
            onRemove={onRemove}
            onMove={onMove}
          />
        ))}
      </View>
      {children}
    </View>
  );
}

/** A square tile in the strip for an action, such as adding a photo. */
export function StripTile({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
      <Ionicons name={icon} size={24} color={Brand.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.one },
  slot: { position: 'absolute', top: 0, left: 0, width: THUMB, height: THUMB },
  thumb: { width: THUMB, height: THUMB, borderRadius: Radius.sm, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbOn: { borderColor: Brand.primarySoft },
  image: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  tile: {
    width: THUMB,
    height: THUMB,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.surface,
  },
  tilePressed: { backgroundColor: Brand.surfaceAlt },
});
