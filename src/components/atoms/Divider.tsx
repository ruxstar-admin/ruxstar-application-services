/**
 * Divider — Atom
 *
 * Horizontal rule with an optional centered label (e.g. "or").
 * Used between the OTP button and social login options.
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';

import { Brand, Spacing } from '@/constants/theme';

interface DividerProps {
  label?: string;
  style?: ViewStyle;
  color?: string;
}

export default function Divider({
  label,
  style,
  color = Brand.surfaceCardBorder,
}: DividerProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.line, { backgroundColor: color }]} />
      {label ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}
      {label ? (
        <View style={[styles.line, { backgroundColor: color }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  line: {
    flex: 1,
    height: 1,
  },
  label: {
    color: Brand.textOnDarkMuted,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
