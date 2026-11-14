import { money } from '@/features/vendor/lib/pod';
import type { MemberStatus, Pay, PayPer, PermissionInfo, TeamPermission, WorkAccess } from '@/types/team';

const DAY_MS = 24 * 60 * 60_000;

export const PAY_NOTE_MAX = 120;

export const PAY_PER: { key: PayPer; label: string; suffix: string }[] = [
  { key: 'month', label: 'Month', suffix: 'a month' },
  { key: 'week', label: 'Week', suffix: 'a week' },
  { key: 'day', label: 'Day', suffix: 'a day' },
  { key: 'hour', label: 'Hour', suffix: 'an hour' },
  { key: 'order', label: 'Order', suffix: 'per order or delivery' },
];

/** "₹15,000 a month", or null when there's no pay on the offer. */
export function payLine(pay: Pay | null): string | null {
  if (!pay) return null;
  return `${money(pay.amount)} ${PAY_PER.find((p) => p.key === pay.per)?.suffix ?? ''}`.trim();
}

/**
 * Switches one permission. Turning one on brings what it needs; turning one off drops what needs it, so
 * "Accept and move orders" can never be on without "See orders". Kept in the catalog's order.
 */
export function togglePermission(catalog: PermissionInfo[], current: TeamPermission[], key: TeamPermission, on: boolean): TeamPermission[] {
  const set = new Set(current);
  if (on) {
    set.add(key);
    const needs = catalog.find((p) => p.key === key)?.needs;
    if (needs) set.add(needs);
  } else {
    set.delete(key);
    for (const p of catalog) if (p.needs === key) set.delete(p.key);
  }
  return catalog.filter((p) => set.has(p.key)).map((p) => p.key);
}

/** "See orders, Open and close the shop" or "See orders and 3 more". */
export function permissionsLine(catalog: PermissionInfo[], permissions: TeamPermission[]): string {
  const labels = catalog.filter((p) => permissions.includes(p.key)).map((p) => p.label);
  if (!labels.length) return 'Nothing yet';
  if (labels.length <= 2) return labels.join(', ');
  return `${labels[0]} and ${labels.length - 1} more`;
}

/** "Invite ends today", "Invite ends tomorrow", "Invite ends in 5 days". */
export function inviteEnds(expiresAt: string, now = Date.now()): string {
  const days = Math.ceil((new Date(expiresAt).getTime() - now) / DAY_MS);
  if (days <= 0) return 'Invite ends today';
  if (days === 1) return 'Invite ends tomorrow';
  return `Invite ends in ${days} days`;
}

export const MEMBER_STATUS: Record<MemberStatus, { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  active: { label: 'Working', tone: 'success' },
  waiting: { label: 'Getting verified', tone: 'warning' },
  invited: { label: 'Invited', tone: 'neutral' },
};

export const ACCESS: Record<WorkAccess, { label: string; tone: 'success' | 'warning' | 'error'; note: string | null }> = {
  on: { label: 'Working', tone: 'success', note: null },
  verify: { label: 'Get verified', tone: 'warning', note: 'Nothing works here until your identity verification (Aadhaar, PAN and a selfie) is approved.' },
  on_hold: { label: 'On hold', tone: 'error', note: 'Ruxstar has this business on hold, so nothing works here for now.' },
};

/** "@kiran" when there is a username; the API takes either. */
export const cleanUsername = (value: string) => value.trim().replace(/^@/, '').toLowerCase();
