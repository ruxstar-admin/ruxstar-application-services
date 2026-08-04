/**
 * StatusBadge — Atom
 * Colored pill for booking/order/payment statuses.
 */

import { Text, View, StyleSheet } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';

type Status =
  | 'confirmed'
  | 'upcoming'
  | 'pending'
  | 'pending_payment'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'paid'
  | 'refunded'
  | 'expired'
  | string;

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  confirmed:       { bg: 'rgba(22,163,74,0.15)',  text: '#16A34A', label: 'Confirmed' },
  upcoming:        { bg: 'rgba(22,163,74,0.15)',  text: '#16A34A', label: 'Upcoming' },
  paid:            { bg: 'rgba(22,163,74,0.15)',  text: '#16A34A', label: 'Paid' },
  completed:       { bg: 'rgba(22,163,74,0.15)',  text: '#16A34A', label: 'Completed' },
  pending:         { bg: 'rgba(245,166,35,0.15)', text: '#D97706', label: 'Pending' },
  pending_payment: { bg: 'rgba(245,166,35,0.15)', text: '#D97706', label: 'Pay Now' },
  in_progress:     { bg: 'rgba(124,58,237,0.15)', text: '#7C3AED', label: 'In Progress' },
  cancelled:       { bg: 'rgba(220,38,38,0.15)',  text: '#DC2626', label: 'Cancelled' },
  rejected:        { bg: 'rgba(220,38,38,0.15)',  text: '#DC2626', label: 'Rejected' },
  expired:         { bg: 'rgba(220,38,38,0.15)',  text: '#DC2626', label: 'Expired' },
  refunded:        { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6', label: 'Refunded' },
};

interface StatusBadgeProps {
  status: Status;
  label?: string;
  size?:  'sm' | 'md';
}

export default function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const cfg = STATUS_MAP[status] ?? {
    bg:    'rgba(150,150,150,0.15)',
    text:  '#888888',
    label: status,
  };

  const displayLabel = label ?? cfg.label;
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor:  cfg.bg,
          paddingHorizontal: isSm ? Spacing.two : Spacing.three,
          paddingVertical:   isSm ? 2 : 4,
        },
      ]}
    >
      <Text style={[styles.text, { color: cfg.text, fontSize: isSm ? 11 : 12 }]}>
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: Radius.pill,
    alignSelf:    'flex-start',
  },
  text: {
    fontWeight:    '700',
    letterSpacing: 0.2,
  },
});
