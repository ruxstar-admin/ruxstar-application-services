import type { Ionicons } from '@expo/vector-icons';
import { Brand } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import type { Payout, StatementLine } from '@/types/business';

type Look = { icon: keyof typeof Ionicons.glyphMap; title: string; color: string; tint: string; note: string };

/** How each kind of statement line looks, and what it means for the vendor. */
export const LINE_LOOK: Record<StatementLine['kind'], Look> = {
  paid: {
    icon: 'arrow-down',
    title: 'Order payment',
    color: Brand.warning,
    tint: 'rgba(255,176,32,0.14)',
    note: 'Your share of this order. You can withdraw it 48 hours after delivery.',
  },
  available: {
    icon: 'checkmark',
    title: 'Ready to withdraw',
    color: Brand.success,
    tint: 'rgba(52,199,89,0.14)',
    note: 'The hold after delivery ended, so this can be withdrawn.',
  },
  refund: {
    icon: 'arrow-undo',
    title: 'Refund to customer',
    color: Brand.error,
    tint: 'rgba(255,69,58,0.14)',
    note: 'Sent back to the customer out of your share.',
  },
  delivery: {
    icon: 'bicycle',
    title: 'Delivery partner pay',
    color: Brand.textMuted,
    tint: 'rgba(158,156,176,0.14)',
    note: 'Paid to the Ruxstar partner who delivered it, out of your share.',
  },
  withdrawal: {
    icon: 'arrow-up',
    title: 'Withdrawal',
    color: Brand.primarySoft,
    tint: 'rgba(180,92,242,0.16)',
    note: 'Sent from your balance to your account.',
  },
  returned: {
    icon: 'refresh',
    title: 'Withdrawal returned',
    color: Brand.success,
    tint: 'rgba(52,199,89,0.14)',
    note: "The bank couldn't complete the withdrawal, so it's back in your balance.",
  },
};

/** "+₹3,240", "−₹500"; moving to available isn't new money, so it has no sign. */
export function signedAmount(line: Pick<StatementLine, 'kind' | 'amount'>) {
  const sign = line.kind === 'available' ? '' : line.amount > 0 ? '+' : line.amount < 0 ? '−' : '';
  return `${sign}${money(Math.abs(line.amount))}`;
}

export const REFUNDED_BY: Record<NonNullable<StatementLine['refund']>['by'], string> = {
  vendor: 'You',
  customer: 'The customer, before you accepted',
  staff: 'Ruxstar, after a reported problem',
  system: 'Automatically',
};

export const PAYOUT_STATUS: Record<Payout['status'], { label: string; tone: 'success' | 'warning' | 'error' }> = {
  paid: { label: 'Paid', tone: 'success' },
  pending: { label: 'On the way', tone: 'warning' },
  failed: { label: 'Failed', tone: 'error' },
};
