import { useState } from 'react';
import { PixelRatio, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { Brand, Radius, Spacing } from '@/constants/theme';
import type { PostPhoto } from '@/types/social';

/** The narrowest copy that is still sharp at `width` points on this screen. */
function sourceFor(photo: PostPhoto, width: number) {
  const needed = width * PixelRatio.get();
  const copy = [...(photo.smaller ?? [])].sort((a, b) => a.width - b.width).find((s) => s.width >= needed);
  return { uri: copy?.url ?? photo.url };
}

/**
 * One photo full width at its own shape (the API keeps it between 4:5 and 1.91:1); two or more as a grid of squares.
 * Sizes are set in points once the row is measured: on Android, tiles sized by percentage and aspect ratio stayed blank.
 */
export function PostImages({ photos }: { photos: PostPhoto[] }) {
  const [width, setWidth] = useState(0);
  if (photos.length === 0) return null;
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.floor(e.nativeEvent.layout.width));

  if (photos.length === 1) {
    const [photo] = photos;
    const ratio = photo.width / photo.height;
    return (
      <View style={[styles.single, { aspectRatio: ratio }]} onLayout={onLayout}>
        {width > 0 ? (
          <Image
            source={sourceFor(photo, width)}
            style={{ width, height: Math.round(width / ratio) }}
            contentFit="cover"
            transition={150}
            recyclingKey={photo.url}
            accessibilityLabel="Post photo"
          />
        ) : null}
      </View>
    );
  }

  const shown = photos.slice(0, 4);
  const cell = Math.floor((width - Spacing.one) / 2);
  return (
    <View style={[styles.grid, width === 0 && { aspectRatio: shown.length === 2 ? 2 : 1 }]} onLayout={onLayout}>
      {width > 0
        ? shown.map((photo, i) => {
            const wide = shown.length === 3 && i === 0;
            const size = wide ? { width, height: Math.round(width / 2) } : { width: cell, height: cell };
            return (
              <Image
                key={photo.url}
                source={sourceFor(photo, size.width)}
                style={[styles.cell, size]}
                contentFit="cover"
                transition={150}
                recyclingKey={photo.url}
                accessibilityLabel="Post photo"
              />
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  single: { width: '100%', overflow: 'hidden', borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  grid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  cell: { borderRadius: Radius.sm, backgroundColor: Brand.surfaceAlt },
});
