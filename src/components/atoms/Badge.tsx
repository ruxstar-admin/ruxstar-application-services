/**
 * Badge — Atom
 *
 * Small label chip for roles, statuses, counts.
 *
 * Variants: role-user | role-vendor | success | error | warning | info | default
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Brand, Radius, Spacing } from '@/constants/theme';

type BadgeVariant =
  | 'role-user'
  | 'role-vendor'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const variantStyles: Record<
  BadgeVariant,
  { bg: string; border: string; text: string }
> = {
  'role-user': {
    bg: 'rgba(32,138,239,0.15)',
    border: 'rgba(32,138,239,0.4)',
    text: Brand.primary,
  },
  'role-vendor': {
    bg: Brand.glass,
    border: Brand.glassBorderStrong,
    text: Brand.primaryXLight,
  },
  success: {
    bg: 'rgba(52,199,89,0.15)',
    border: 'rgba(52,199,89,0.4)',
    text: Brand.success,
  },
  error: {
    bg: 'rgba(255,59,48,0.15)',
    border: 'rgba(255,59,48,0.4)',
    text: Brand.error,
  },
  warning: {
    bg: 'rgba(255,149,0,0.15)',
    border: 'rgba(255,149,0,0.4)',
    text: Brand.warning,
  },
  info: {
    bg: 'rgba(0,212,255,0.12)',
    border: 'rgba(0,212,255,0.35)',
    text: Brand.accentGlow,
  },
  default: {
    bg: Brand.surfaceCard,
    border: Brand.surfaceCardBorder,
    text: Brand.textOnDarkSecondary,
  },
};

export default function Badge({
  label,
  variant = 'default',
  icon,
  size = 'md',
  style,
}: BadgeProps) {
  const v = variantStyles[variant];
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingHorizontal: isSmall ? Spacing.two : Spacing.three,
          paddingVertical: isSmall ? 2 : Spacing.one,
          gap: isSmall ? 3 : Spacing.one,
        },
        style,
      ]}>
      {icon ? (
        <Text style={[styles.icon, { fontSize: isSmall ? 11 : 13 }]}>{icon}</Text>
      ) : null}
      <Text
        style={[
          styles.text,
          { color: v.text, fontSize: isSmall ? 10 : 12 },
        ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  icon: {
    lineHeight: 16,
  },
});
