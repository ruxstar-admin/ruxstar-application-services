/**
 * MetricCard — Molecule
 * Stats card for vendor dashboard and payments screen.
 * Shows icon, label, and a large value.
 */

import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing } from '@/constants/theme';

interface MetricCardProps {
  label:   string;
  value:   string;
  icon:    keyof typeof Ionicons.glyphMap;
  color?:  string;
  flex?:   number;
}

export default function MetricCard({ label, value, icon, color, flex = 1 }: MetricCardProps) {
  const { brand } = useTheme();
  const accentColor = color ?? brand.primary;

  return (
    <View
      style={[
        styles.card,
        {
          flex,
          backgroundColor: brand.surface1,
          borderColor:     brand.border1,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}20` }]}>
        <Ionicons name={icon} size={18} color={accentColor} />
      </View>
      <Text style={[styles.value, { color: brand.cream }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.label, { color: brand.creamSub }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth:  1,
    padding:      Spacing.three,
    gap:          Spacing.one + 2,
  },
  iconWrap: {
    width:          36,
    height:         36,
    borderRadius:   Radius.sm,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   Spacing.one,
  },
  value: {
    fontSize:   20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  label: {
    fontSize:   12,
    fontWeight: '500',
  },
});
