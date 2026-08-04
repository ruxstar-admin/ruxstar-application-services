/**
 * ThemeToggle — Atom
 * Sun / moon icon button that flips the persisted theme mode.
 */

import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useThemeStore } from '@/stores/theme-store';
import { Radius } from '@/constants/theme';

interface ThemeToggleProps {
  size?: number;
}

export default function ThemeToggle({ size = 22 }: ThemeToggleProps) {
  const { brand, isDark } = useTheme();
  const toggle = useThemeStore((s) => s.toggle);

  return (
    <Pressable
      onPress={toggle}
      hitSlop={10}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: brand.surface2, opacity: pressed ? 0.7 : 1 },
      ]}
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      accessibilityRole="button"
    >
      <Ionicons
        name={isDark ? 'sunny-outline' : 'moon-outline'}
        size={size}
        color={brand.primary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
