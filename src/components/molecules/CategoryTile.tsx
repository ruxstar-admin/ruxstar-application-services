/**
 * CategoryTile — Molecule
 * Icon + label grid tile for the category grid on the home screen.
 * Two sizes: sm (compact 2×4 grid) and md.
 */

import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing } from '@/constants/theme';

interface CategoryTileProps {
  label:   string;
  icon:    keyof typeof Ionicons.glyphMap;
  active?: boolean;
  onPress: () => void;
  size?:   'sm' | 'md';
}

export default function CategoryTile({
  label,
  icon,
  active  = false,
  onPress,
  size    = 'sm',
}: CategoryTileProps) {
  const { brand } = useTheme();
  const isSm = size === 'sm';

  const tileSize   = isSm ? 58 : 72;
  const iconSize   = isSm ? 24 : 28;
  const fontSize   = isSm ? 11 : 12;
  const iconBgSize = isSm ? 44 : 52;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { width: tileSize, opacity: pressed ? 0.75 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.iconWrap,
          {
            width:           iconBgSize,
            height:          iconBgSize,
            borderRadius:    Radius.md,
            backgroundColor: active ? brand.primary : brand.surface2,
            borderWidth:     1,
            borderColor:     active ? brand.primary : brand.border1,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={iconSize}
          color={active ? '#fff' : brand.primary}
        />
      </View>
      <Text
        style={[
          styles.label,
          {
            fontSize,
            color:      active ? brand.primary : brand.creamSub,
            fontWeight: active ? '700' : '500',
          },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    gap:        Spacing.one + 2,
  },
  iconWrap: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  label: {
    textAlign:     'center',
    letterSpacing: 0.1,
    lineHeight:    15,
  },
});
