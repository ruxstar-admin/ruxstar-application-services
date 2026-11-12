import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Brand, Fonts } from '@/constants/theme';
import { coverColours, initialOf, photoFor } from '@/features/pod/lib/shop';
import type { ShopPhoto } from '@/types/shop';

interface ShopCoverProps {
  photo: ShopPhoto | null;
  name: string;
  /** Pixels the cover is drawn at, to pick a photo copy that is sharp but not oversized. */
  width: number;
  style?: StyleProp<ViewStyle>;
  dimmed?: boolean;
  children?: React.ReactNode;
}

/** A shop's photo, or its initial on its own colours when it has none. */
export function ShopCover({ photo, name, width, style, dimmed, children }: ShopCoverProps) {
  return (
    <View style={[styles.frame, style]}>
      {photo ? (
        <Image
          source={{ uri: photoFor(photo, width) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          recyclingKey={photo.url}
          accessibilityLabel={`${name} photo`}
        />
      ) : (
        <LinearGradient colors={coverColours(name)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Text style={styles.initial}>{initialOf(name)}</Text>
        </LinearGradient>
      )}
      {dimmed ? <View style={[StyleSheet.absoluteFill, styles.dim]} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: Brand.surfaceAlt },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: Fonts.bold, fontSize: 56, color: 'rgba(255,255,255,0.92)' },
  dim: { backgroundColor: 'rgba(13,12,18,0.45)' },
});
