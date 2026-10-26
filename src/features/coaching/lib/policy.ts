/**
 * Shown on the pay screen before a coaching batch is paid for (scope review #7). Keep it in sync with the
 * backend rules: full fee up front, refund until the first session, nothing after, batch cancel refunds all.
 */
export const COACHING_REFUND_POLICY =
  'The full batch fee is charged now. There are no instalments. You can cancel for a full refund until the first session starts. After that, dropping out is not refunded, and a cancelled or moved class is not refunded. If the whole batch is cancelled, every student is refunded.';

/** True while the first session has not started yet. */
export const isRefundable = (startsAt: string, now: number = Date.now()) => new Date(startsAt).getTime() > now;
