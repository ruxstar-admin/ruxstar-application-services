import type { TimelineStep } from '@/components/ui/StatusTimeline';
import { money } from '@/features/vendor/lib/pod';
import type { GigActor, GigCard, GigOrder, GigOrderStatus, GigPackage, GigStatus, GigTier, QuoteCard, QuoteStatus } from '@/types/gigs';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'error';

export const TIERS: readonly GigTier[] = ['basic', 'standard', 'premium'];
export const TIER_LABEL: Record<GigTier, string> = { basic: 'Basic', standard: 'Standard', premium: 'Premium' };

export const GIG_STATUS: Record<GigStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  live: { label: 'Live', tone: 'success' },
  paused: { label: 'Paused', tone: 'warning' },
  removed: { label: 'Taken down', tone: 'error' },
};

const STATUS: Record<GigOrderStatus, { customer: string; freelancer: string; tone: Tone }> = {
  awaiting_payment: { customer: 'Waiting for payment', freelancer: 'Not paid yet', tone: 'warning' },
  paid: { customer: 'Waiting for the freelancer', freelancer: 'New: accept or decline', tone: 'accent' },
  in_progress: { customer: 'In progress', freelancer: 'In progress', tone: 'accent' },
  delivered: { customer: 'Delivered: check it', freelancer: 'Delivered', tone: 'success' },
  disputed: { customer: 'Problem reported', freelancer: 'Problem reported', tone: 'warning' },
  completed: { customer: 'Completed', freelancer: 'Completed', tone: 'success' },
  cancelled: { customer: 'Cancelled', freelancer: 'Cancelled', tone: 'neutral' },
};

/** The badge for an order, worded for whoever is looking. A late order says so. */
export function orderStatus(o: Pick<GigOrder, 'status' | 'role' | 'late'>): { label: string; tone: Tone } {
  if (o.late && (o.status === 'in_progress' || o.status === 'paid')) return { label: 'Late', tone: 'error' };
  const s = STATUS[o.status];
  return { label: o.role === 'freelancer' ? s.freelancer : s.customer, tone: s.tone };
}

/** Orders still moving; the rest are done with. */
export const isOpenOrder = (status: GigOrderStatus) => status !== 'completed' && status !== 'cancelled';

export const daysText = (n: number) => `${n} day${n === 1 ? '' : 's'}`;
export const revisionsText = (n: number) => (n === 0 ? 'No revisions' : `${n} revision${n === 1 ? '' : 's'}`);
/** "3 days delivery · 2 revisions" */
export const deliveryLine = (p: Pick<GigPackage, 'deliveryDays' | 'revisions'>) => `${daysText(p.deliveryDays)} delivery · ${revisionsText(p.revisions)}`;

/** "From ₹1,500 · 2 days" on a gig card. */
export const cardPriceLine = (g: Pick<GigCard, 'priceFrom' | 'fastestDays'>) => `From ${money(g.priceFrom)} · ${daysText(g.fastestDays)}`;

/** Packages in Basic, Standard, Premium order. */
export const sortedPackages = <P extends Pick<GigPackage, 'tier'>>(packages: readonly P[]) => [...packages].sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier));

/** The package a customer first sees: the one asked for if the gig has it, else the first. */
export function pickPackage<P extends Pick<GigPackage, 'tier'>>(packages: readonly P[], wanted?: string): P | undefined {
  const sorted = sortedPackages(packages);
  return sorted.find((p) => p.tier === wanted) ?? sorted[0];
}

/** What the customer pays: the package less a discount (never below nothing), plus Ruxstar's fee. */
export function orderPrice(price: number, platformFee: number, discount = 0) {
  const off = Math.min(Math.max(discount, 0), price);
  return { items: price, discount: off, platformFee, total: price - off + platformFee };
}

/** Of the order's files and links, what it adds up to, for the "up to N MB" check. */
export const totalBytes = (files: readonly { bytes: number }[]) => files.reduce((s, f) => s + f.bytes, 0);
export const megabytes = (mb: number) => mb * 1024 * 1024;

/** The most a part refund can be: out of the freelancer's share, and less than what is left of the payment. */
export function maxPartRefund(o: Pick<GigOrder, 'share' | 'price' | 'refunds'>): number {
  const refunded = o.refunds.reduce((s, r) => s + r.amount, 0);
  return Math.max(0, Math.min(o.share ?? 0, o.price.total - refunded - 1));
}

const hoursLeft = (iso: string, now: number) => (Date.parse(iso) - now) / 3_600_000;

/** "2 days left", "5 hours left", "Less than an hour left", or null once past. */
export function timeLeftText(iso: string, now: number = Date.now()): string | null {
  const hours = hoursLeft(iso, now);
  if (hours <= 0) return null;
  if (hours < 1) return 'Less than an hour left';
  if (hours < 48) return `${Math.floor(hours)} hour${Math.floor(hours) === 1 ? '' : 's'} left`;
  return `${Math.floor(hours / 24)} days left`;
}

const QUOTE_STATUS: Record<QuoteStatus, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'accent' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'neutral' },
  paid: { label: 'Paid', tone: 'success' },
};

/** An offer past its pay-by time reads as expired even before the next refresh says so. */
export function quoteStatus(q: Pick<QuoteCard, 'status' | 'expiresAt'>, now: number = Date.now()): QuoteStatus {
  return q.status === 'open' && Date.parse(q.expiresAt) <= now ? 'expired' : q.status;
}

export const quoteBadge = (q: Pick<QuoteCard, 'status' | 'expiresAt'>, now: number = Date.now()) => QUOTE_STATUS[quoteStatus(q, now)];

/** Under an open offer: "3 days left to pay"; otherwise what happened. */
export function quoteNote(q: Pick<QuoteCard, 'status' | 'expiresAt'>, now: number = Date.now()): string {
  const status = quoteStatus(q, now);
  if (status === 'paid') return 'Paid. The order has started.';
  if (status === 'withdrawn') return 'The freelancer withdrew this offer.';
  const left = timeLeftText(q.expiresAt, now);
  return status === 'open' && left ? `${left} to pay` : 'This offer has expired.';
}

const BY_RUXSTAR = (by: GigActor) => by === 'system' || by === 'staff';

/** The order so far: paid, accepted, each delivery and its answer, then how it ended. */
export function orderTimeline(o: GigOrder): TimelineStep[] {
  const steps: TimelineStep[] = [{ key: 'paid', label: o.quoteId ? 'Offer paid' : 'Paid', at: o.paidAt ?? undefined }];
  if (o.cancellation) {
    if (o.acceptedAt) steps.push({ key: 'accepted', label: 'The freelancer started', at: o.acceptedAt });
    const declined = o.cancellation.by === 'vendor' && !o.acceptedAt;
    steps.push({ key: 'cancelled', label: declined ? 'Declined' : `Cancelled${BY_RUXSTAR(o.cancellation.by) ? ' by Ruxstar' : ''}`, at: o.cancellation.at });
    return steps;
  }
  steps.push({ key: 'accepted', label: o.quoteId ? 'The freelancer started' : 'The freelancer accepted', at: o.acceptedAt ?? undefined });
  o.deliveries.forEach((d, i) => {
    steps.push({ key: `delivery-${d.id}`, label: i === 0 ? 'Delivered' : `Delivered again (${i + 1})`, at: d.at });
    if (d.answer?.kind === 'revision') steps.push({ key: `revision-${d.id}`, label: 'Changes asked for', at: d.answer.at });
  });
  if (!o.deliveries.length) steps.push({ key: 'delivery', label: 'Delivered' });
  if (o.dispute) {
    steps.push({ key: 'dispute', label: 'Problem reported', at: o.dispute.openedAt });
    steps.push({ key: 'decided', label: 'Ruxstar decided', at: o.dispute.decision?.at });
    return steps;
  }
  const completed = [...o.timeline].reverse().find((t) => t.status === 'completed');
  steps.push({ key: 'completed', label: completed?.by === 'system' ? 'Completed by itself' : 'Completed', at: completed?.at ?? o.completedAt ?? undefined });
  return steps;
}

/** "Basic · 3 days · 2 revisions" for an order's package, or "Custom offer · …". */
export function packageLine(o: Pick<GigOrder, 'package' | 'quoteId'>): string {
  const name = o.quoteId ? 'Custom offer' : o.package.name;
  return [name, daysText(o.package.deliveryDays), revisionsText(o.package.revisions)].join(' · ');
}

/** Under the badge on a list row or the order's head: the next deadline, in plain words. */
export function deadlineText(o: Pick<GigOrder, 'status' | 'acceptBy' | 'dueAt' | 'autoCompleteAt' | 'payBy' | 'late'>, now: number = Date.now()): string | null {
  if (o.status === 'awaiting_payment' && o.payBy) return timeLeftText(o.payBy, now) ? 'Pay soon to keep this order' : null;
  if (o.status === 'paid' && o.acceptBy) {
    const left = timeLeftText(o.acceptBy, now);
    return left ? `${left} to accept` : null;
  }
  if (o.status === 'in_progress' && o.dueAt) {
    if (o.late) return 'Past its due date';
    const left = timeLeftText(o.dueAt, now);
    return left ? `Due: ${left}` : null;
  }
  if (o.status === 'delivered' && o.autoCompleteAt) {
    const left = timeLeftText(o.autoCompleteAt, now);
    return left ? `Completes by itself: ${left}` : null;
  }
  return null;
}

/** A category's label from the rules, or the key tidied up for one no longer shown. */
export const categoryLabel = (categories: readonly { key: string; label: string }[], key: string) =>
  categories.find((c) => c.key === key)?.label ?? key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** "₹1,500 to ₹5,00,000" from the rules, for hints. */
export const priceRangeText = (min: number, max: number) => `${money(min)} to ${money(max)}`;
