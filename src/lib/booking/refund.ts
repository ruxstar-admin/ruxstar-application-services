/** "Get `percent` back when cancelling at least `hoursBefore` hours ahead." 0 hours means any time before it starts. */
export interface RefundTier {
  hoursBefore: number;
  percent: number;
}

const duration = (hours: number): string => {
  if (hours < 1) return `${Math.round(hours * 60)} minutes`;
  if (hours % 24 === 0) return hours === 24 ? '1 day' : `${hours / 24} days`;
  return hours === 1 ? '1 hour' : `${hours} hours`;
};

const share = (percent: number, first: boolean) => (percent >= 100 ? (first ? 'Full refund' : 'full refund') : `${percent}% back`);

const paying = (tiers: readonly RefundTier[]) => tiers.filter((t) => t.percent > 0).sort((a, b) => b.hoursBefore - a.hoursBefore);

/**
 * The refund rule in one sentence, for above a Pay button. `what` finishes "before …": "it starts", "move-in", "the first class".
 * [{6,100},{2,50}] → "Full refund if you cancel at least 6 hours before it starts, 50% back if at least 2 hours before, and no refund after that."
 */
export function refundLine(tiers: readonly RefundTier[], what = 'it starts'): string {
  const steps = paying(tiers);
  if (!steps.length) return 'No refund if you cancel.';
  const items = steps.map((t, i) => {
    if (i === 0) return `${share(t.percent, true)} if you cancel ${t.hoursBefore > 0 ? `at least ${duration(t.hoursBefore)} before ${what}` : `any time before ${what}`}`;
    return t.hoursBefore > 0 ? `${share(t.percent, false)} if at least ${duration(t.hoursBefore)} before` : `${share(t.percent, false)} after that, until ${what}`;
  });
  if (steps[steps.length - 1]!.hoursBefore > 0) items.push('no refund after that');
  if (items.length === 1) return `${items[0]}.`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}.`;
}

/** The percent refunded when cancelling `hoursLeft` hours before the start; 0 once it has started. */
export function refundPercentAt(tiers: readonly RefundTier[], hoursLeft: number): number {
  if (hoursLeft <= 0) return 0;
  return paying(tiers).reduce((best, t) => (hoursLeft >= t.hoursBefore ? Math.max(best, t.percent) : best), 0);
}
