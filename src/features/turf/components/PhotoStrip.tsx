import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { ShopCover } from '@/features/pod/components/ShopCover';
import type { GroundPhoto } from '@/types/turf';

/** A ground's photos, swiped sideways; its initial on colour when it has none. */
export function PhotoStrip({ photos, name, dimmed }: { photos: readonly GroundPhoto[]; name: string; dimmed?: boolean }) {
  const { width } = useWindowDimensions();
  const shown = width - Spacing.three * 2;
  if (photos.length < 2) {
    const photo = photos[0];
    return <ShopCover photo={photo ? { ...photo, smaller: [] } : null} name={name} width={shown} style={styles.cover} dimmed={dimmed} />;
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={shown * 0.86 + Spacing.two} decelerationRate="fast" contentContainerStyle={styles.row}>
      {photos.map((p) => (
        <ShopCover key={p.id} photo={{ ...p, smaller: [] }} name={name} width={shown} style={[styles.cover, { width: shown * 0.86 }]} dimmed={dimmed} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.two },
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.lg, overflow: 'hidden' },
});
