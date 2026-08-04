/**
 * SectionHeader — Atom
 * Row with a bold title on the left and an optional "View all" link on the right.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';

interface SectionHeaderProps {
  title:      string;
  onViewAll?: () => void;
}

export default function SectionHeader({ title, onViewAll }: SectionHeaderProps) {
  const { brand } = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: brand.cream }]}>{title}</Text>
      {onViewAll && (
        <Pressable
          onPress={onViewAll}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <View style={styles.viewAll}>
            <Text style={[styles.viewAllText, { color: brand.primary }]}>View all</Text>
            <Ionicons name="chevron-forward" size={13} color={brand.primary} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   Spacing.two + 4,
  },
  title: {
    fontSize:   16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           2,
  },
  viewAllText: {
    fontSize:   13,
    fontWeight: '600',
  },
});
