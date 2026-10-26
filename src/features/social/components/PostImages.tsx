import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Brand, Radius, Spacing } from '@/constants/theme';

/** One image full width (4:3); two or more as a 2-column grid of squares (max four shown). */
export function PostImages({ images }: { images: string[] }) {
  if (images.length === 0) return null;

  if (images.length === 1) {
    return <Image source={{ uri: images[0] }} style={styles.single} contentFit="cover" transition={150} accessibilityLabel="Post photo" />;
  }

  return (
    <View style={styles.grid}>
      {images.slice(0, 4).map((uri) => (
        <Image key={uri} source={{ uri }} style={styles.cell} contentFit="cover" transition={150} accessibilityLabel="Post photo" />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  single: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  cell: { width: '49.3%', aspectRatio: 1, borderRadius: Radius.sm, backgroundColor: Brand.surfaceAlt },
});
