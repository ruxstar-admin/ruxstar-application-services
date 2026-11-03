import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Brand, Radius, Spacing } from '@/constants/theme';
import type { PostPhoto } from '@/types/social';

/** One photo full width at its own shape (the API keeps it between 4:5 and 1.91:1); two or more as a grid of squares. */
export function PostImages({ photos }: { photos: PostPhoto[] }) {
  if (photos.length === 0) return null;

  if (photos.length === 1) {
    const [photo] = photos;
    return (
      <Image
        source={{ uri: photo.url }}
        style={[styles.single, { aspectRatio: photo.width / photo.height }]}
        contentFit="cover"
        transition={150}
        recyclingKey={photo.url}
        accessibilityLabel="Post photo"
      />
    );
  }

  return (
    <View style={styles.grid}>
      {photos.slice(0, 4).map((photo) => (
        <Image
          key={photo.url}
          source={{ uri: photo.url }}
          style={[styles.cell, photos.length === 3 && photo === photos[0] && styles.wide]}
          contentFit="cover"
          transition={150}
          recyclingKey={photo.url}
          accessibilityLabel="Post photo"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  single: { width: '100%', borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  cell: { width: '49.3%', aspectRatio: 1, borderRadius: Radius.sm, backgroundColor: Brand.surfaceAlt },
  wide: { width: '100%', aspectRatio: 2 },
});
