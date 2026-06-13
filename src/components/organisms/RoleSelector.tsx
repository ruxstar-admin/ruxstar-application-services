/**
 * RoleSelector — Organism
 *
 * Renders two RoleCard molecules side by side (Customer + Vendor)
 * with staggered entrance animation. Manages which card is "selected".
 *
 * Usage:
 *   <RoleSelector
 *     selected={role}
 *     onSelect={(r) => setRole(r)}
 *   />
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import RoleCard from '@/components/auth/RoleCard';
import { Spacing } from '@/constants/theme';
import type { UserRole } from '@/stores/auth-store';

interface RoleSelectorProps {
  selected: UserRole | null;
  onSelect: (role: UserRole) => void;
}

const ROLES: {
  role: UserRole;
  icon: string;
  title: string;
  subtitle: string;
}[] = [
  {
    role: 'user',
    icon: '👤',
    title: 'Customer',
    subtitle: 'Discover local\nbusinesses & deals',
  },
  {
    role: 'vendor',
    icon: '🏪',
    title: 'Vendor',
    subtitle: 'Grow your\nbusiness online',
  },
];

export default function RoleSelector({ selected, onSelect }: RoleSelectorProps) {
  return (
    <View style={styles.row}>
      {ROLES.map((item, index) => (
        <Animated.View
          key={item.role}
          entering={ZoomIn.delay(index * 120).springify().damping(14)}
          style={styles.cardWrapper}>
          <RoleCard
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            variant={item.role}
            selected={selected === item.role}
            onPress={() => onSelect(item.role)}
            style={styles.card}
          />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'center',
  },
  cardWrapper: {
    flex: 1,
    maxWidth: 180,
  },
  card: {
    width: '100%',
  },
});
