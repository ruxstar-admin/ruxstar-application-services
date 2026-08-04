/**
 * StarRating — Atom
 * Display-only star rating with optional review count.
 */

import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

const GOLD = '#F5A623';

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'md';
}

export default function StarRating({ rating, count, size = 'sm' }: StarRatingProps) {
  const { brand } = useTheme();
  const iconSize  = size === 'sm' ? 11 : 14;
  const fontSize  = size === 'sm' ? 11 : 13;
  const clamped   = Math.min(5, Math.max(0, rating));

  return (
    <View style={styles.row}>
      <Ionicons name="star" size={iconSize} color={GOLD} />
      <Text style={[styles.rating, { fontSize, color: brand.cream }]}>
        {clamped.toFixed(1)}
      </Text>
      {count !== undefined && (
        <Text style={[styles.count, { fontSize: fontSize - 1, color: brand.creamMuted }]}>
          ({count})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           3,
  },
  rating: {
    fontWeight: '700',
  },
  count: {
    fontWeight: '400',
  },
});
