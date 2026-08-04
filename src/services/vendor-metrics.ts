/**
 * Vendor Metrics
 * Client-side aggregation of earnings data from VendorBooking[].
 * Mirrors ruxstar-frontend-services/lib/vendor-metrics.ts
 */

import type { VendorBooking } from './booking-service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true when the booking counts as paid revenue.
 * Mirrors web: a confirmed booking is settled/paid (Cashfree settled).
 */
export function isPaid(b: VendorBooking): boolean {
  return b.status === 'confirmed';
}

/** Settled amount — falls back to pricePerSlot if amount not set. */
export function bookingAmount(b: VendorBooking): number {
  return (typeof b.amount === 'number' ? b.amount : b.pricePerSlot) ?? 0;
}

/** Transaction timestamp in ms (IST-aware). */
export function paymentTime(b: VendorBooking): number {
  const iso = b.createdAt ?? b.startAt;
  return iso ? new Date(iso).getTime() : 0;
}

/** YYYY-MM-DD in IST for a ms timestamp. */
function istDayKey(ms: number): string {
  return new Date(ms + 5.5 * 3600_000).toISOString().slice(0, 10);
}

/** YYYY-MM in IST for a ms timestamp. */
function istMonthKey(ms: number): string {
  return new Date(ms + 5.5 * 3600_000).toISOString().slice(0, 7);
}

/** Format a number as ₹X,XXX (Indian locale). */
export function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DayBucket {
  key:     string;   // YYYY-MM-DD
  label:   string;   // 2-char weekday, e.g. "Mo"
  revenue: number;
  count:   number;
}

export interface VendorMetrics {
  totalRevenue:    number;
  monthRevenue:    number;
  paidCount:       number;
  upcomingCount:   number;
  upcomingRevenue: number;
  avgBooking:      number;
  cancelledCount:  number;
  last7:           DayBucket[];
  peakDayRevenue:  number;
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

export function computeVendorMetrics(bookings: VendorBooking[]): VendorMetrics {
  const now    = Date.now();
  const nowIST = now + 5.5 * 3600_000;
  const thisMonth = new Date(nowIST).toISOString().slice(0, 7);

  // Build last-7-day buckets (today + 6 days before)
  const last7: DayBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const d     = new Date(nowIST - i * 86_400_000);
    const key   = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2);
    last7.push({ key, label, revenue: 0, count: 0 });
  }
  const dayMap = new Map(last7.map((b) => [b.key, b]));

  let totalRevenue    = 0;
  let monthRevenue    = 0;
  let paidCount       = 0;
  let upcomingCount   = 0;
  let upcomingRevenue = 0;
  let cancelledCount  = 0;

  for (const b of bookings) {
    if (b.status === 'cancelled') {
      cancelledCount++;
      continue;
    }

    const amount = bookingAmount(b);
    const t      = paymentTime(b);

    if (isPaid(b)) {
      totalRevenue += amount;
      paidCount++;
      if (istMonthKey(t) === thisMonth) monthRevenue += amount;
      const bucket = dayMap.get(istDayKey(t));
      if (bucket) { bucket.revenue += amount; bucket.count++; }
    } else if (new Date(b.startAt).getTime() > now) {
      upcomingCount++;
      upcomingRevenue += amount;
    }
  }

  const peakDayRevenue = last7.reduce((m, b) => Math.max(m, b.revenue), 0);

  return {
    totalRevenue,
    monthRevenue,
    paidCount,
    upcomingCount,
    upcomingRevenue,
    avgBooking:    paidCount > 0 ? totalRevenue / paidCount : 0,
    cancelledCount,
    last7,
    peakDayRevenue,
  };
}
