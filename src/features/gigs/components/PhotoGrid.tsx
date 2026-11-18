import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { ShopCover } from '@/features/pod/components/ShopCover';
import type { GigPhoto } from '@/types/gigs';

/** Photos in a grid with a cross on each and an add tile while there's room. `cover` marks the first as the cover. */
export function PhotoGrid({
  photos,
  name,
  room,
  busy,
  cover,
  onAdd,
  onRemove,
}: {
  photos: readonly GigPhoto[];
  name: string;
  /** Whether another photo fits; null hides adding and removing. */
  room: boolean | null;
  busy: boolean;
  cover?: boolean;
  onAdd: () => void;
  onRemove: (photo: GigPhoto) => void;
}) {
  return (
    <View style={styles.photos}>
      {photos.map((p, i) => (
        <View key={p.id} style={styles.thumb}>
          <ShopCover photo={{ ...p, smaller: [] }} name={name} width={160} style={styles.image} />
          {cover && i === 0 ? <Text style={styles.cover}>Cover</Text> : null}
          {room !== null ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove photo ${i + 1}`} hitSlop={8} onPress={() => onRemove(p)} style={styles.remove}>
              <Ionicons name="close" size={16} color={Brand.text} />
            </Pressable>
          ) : null}
        </View>
      ))}
      {room ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Add a photo" disabled={busy} onPress={onAdd} style={({ pressed }) => [styles.thumb, styles.add, pressed && styles.pressed]}>
          {busy ? <ActivityIndicator color={Brand.primarySoft} /> : <Ionicons name="camera-outline" size={24} color={Brand.primarySoft} />}
          <Text style={styles.small}>{busy ? 'Uploading' : 'Add photo'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  thumb: { width: '31%', aspectRatio: 16 / 9, borderRadius: Radius.md, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  cover: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    paddingHorizontal: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    backgroundColor: 'rgba(13,12,18,0.78)',
    ...Typography.caption,
    fontSize: 11,
    color: Brand.text,
  },
  remove: { position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(13,12,18,0.78)' },
  add: { alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1, borderStyle: 'dashed', borderColor: Brand.border, backgroundColor: Brand.surface },
  pressed: { opacity: 0.8 },
  small: { ...Typography.caption, color: Brand.textMuted },
});
