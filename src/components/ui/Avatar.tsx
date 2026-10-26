import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Brand, Fonts } from '@/constants/theme';

interface AvatarProps {
  name: string;
  uri?: string;
  size?: number;
}

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

/** Round profile picture; falls back to the person's initials on a purple tint. */
export function Avatar({ name, uri, size = 48 }: AvatarProps) {
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (uri) return <Image source={{ uri }} style={box} accessibilityLabel={name} contentFit="cover" transition={150} />;

  return (
    <View style={[styles.fallback, box]} accessibilityLabel={name}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initialsOf(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.primaryDeep },
  initials: { fontFamily: Fonts.semibold, color: Brand.text },
});
