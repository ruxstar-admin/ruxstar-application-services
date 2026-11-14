import type { Ionicons } from '@expo/vector-icons';
import { money } from '@/features/vendor/lib/pod';
import type { PodTerms } from '@/types/shop';

export interface Term {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

/** 1000 → "10%", 1250 → "12.5%". */
export const percentOf = (bps: number) => `${Number((bps / 100).toFixed(2))}%`;

/** What a customer agrees to by paying for a print order. */
export const customerTerms = (t: PodTerms): Term[] => [
  {
    icon: 'card-outline',
    text: t.platformFee
      ? `You pay the full amount now, including Ruxstar's ${money(t.platformFee)} platform fee.`
      : 'You pay the full amount now.',
  },
  { icon: 'time-outline', text: `The shop has ${t.acceptHours} hours to accept. If it doesn't, or turns the order down, you get all of it back.` },
  { icon: 'close-circle-outline', text: "You can cancel for a full refund until the shop accepts. After that, it can't be cancelled." },
  { icon: 'alert-circle-outline', text: `After delivery you have ${t.reportHours} hours to report a problem.` },
  { icon: 'return-down-back-outline', text: `Refunds go back to how you paid. Banks take up to ${t.refundDays} days to show them.` },
];

/** What a vendor agrees to by opening a print shop. */
export const vendorTerms = (t: PodTerms): Term[] => [
  { icon: 'pie-chart-outline', text: `Ruxstar keeps ${percentOf(t.commissionBps)} of each order's item price, after any discount. The rest is your share.` },
  ...(t.platformFee
    ? [{ icon: 'receipt-outline' as const, text: `Customers also pay Ruxstar a ${money(t.platformFee)} platform fee on each order. It doesn't come out of your share.` }]
    : []),
  { icon: 'card-outline', text: `Customers pay in full before an order reaches you. Accept it within ${t.acceptHours} hours, or it's cancelled and refunded.` },
  { icon: 'close-circle-outline', text: 'If you turn an order down, or the customer cancels before you accept, they get all of it back and you get nothing for it.' },
  { icon: 'pricetag-outline', text: "A coupon you create comes out of your share. Ruxstar's commission is on the price after it." },
  {
    icon: 'hourglass-outline',
    text: `Your share is ready to withdraw ${t.reportHours} hours after delivery, so the customer can report a problem first. A report holds it until Ruxstar settles it.`,
  },
  { icon: 'wallet-outline', text: `You can withdraw once ${money(t.minPayout)} is available. Each withdrawal costs ${money(t.payoutFee)}.` },
  { icon: 'document-outline', text: `Customers' print files are kept for ${t.filesDays} days after delivery, then deleted.` },
];
