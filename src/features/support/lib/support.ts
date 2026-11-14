import type { Href } from 'expo-router';
import { ApiError } from '@/lib/api-error';
import type { SupportCategory, SupportContextRef, SupportPass, SupportPriority, SupportStatus } from '@/types/support';

export const SUBJECT_MIN = 3;
export const SUBJECT_MAX = 80;
export const TEXT_MAX = 2000;
export const PHOTOS_MAX = 3;
/** The API keeps help photos at 1600 px on the long side. */
export const PHOTO_SIDE = 1600;

export const CATEGORY_LABEL: Record<SupportCategory, string> = {
  orders: 'Orders & payments',
  refunds: 'Refunds',
  verification: 'Verification',
  business: 'My business',
  delivery: 'Delivery',
  account: 'Account & sign-in',
  safety: 'Safety & reports',
  app: 'App problem',
  other: 'Other',
};

export const CATEGORIES = (Object.keys(CATEGORY_LABEL) as SupportCategory[]).map((key) => ({ key, label: CATEGORY_LABEL[key] }));

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'error';

/** How a ticket reads to the person who opened it. */
export const STATUS: Record<SupportStatus, { label: string; tone: Tone }> = {
  open: { label: 'With Ruxstar', tone: 'accent' },
  waiting: { label: 'Replied', tone: 'warning' },
  resolved: { label: 'Solved', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
};

/** How a ticket reads to the Ruxstar team. */
export const DESK_STATUS: Record<SupportStatus, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'accent' },
  waiting: { label: 'Waiting on them', tone: 'neutral' },
  resolved: { label: 'Resolved', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
};

export const PRIORITY: Record<SupportPriority, { label: string; tone: Tone }> = {
  urgent: { label: 'Urgent', tone: 'error' },
  high: { label: 'High', tone: 'warning' },
  normal: { label: 'Normal', tone: 'neutral' },
  low: { label: 'Low', tone: 'neutral' },
};

export const PRIORITIES = (Object.keys(PRIORITY) as SupportPriority[]).map((key) => ({ key, label: PRIORITY[key].label }));

/** The API's own message when it sent one; a 401 here means a support pass ran out. */
export const supportErrorText = (err: unknown) =>
  err instanceof ApiError && err.status === 401
    ? 'Your support access ended. Log in again to keep messaging support.'
    : err instanceof ApiError && err.status > 0 && err.kind !== 'server'
      ? err.message
      : 'Could not reach Ruxstar. Check your connection and try again.';

/** The pass a login hands back for an account on hold, or null for any other failure. */
export function holdPassOf(err: unknown): SupportPass | null {
  if (!(err instanceof ApiError) || err.code !== 'ACCOUNT_ON_HOLD') return null;
  const detail = err.details.find((d) => typeof d.supportToken === 'string');
  if (!detail) return null;
  return { token: detail.supportToken as string, expiresAt: String(detail.expiresAt ?? ''), message: detail.message || err.message };
}

/** Where the help screens live: in the app, or on the screens an account on hold can reach. */
export const supportRoutes = (hold: boolean) => ({
  list: (hold ? '/(auth)/hold' : '/(customer)/support') as Href,
  ticket: (id: string): Href => (hold ? { pathname: '/(auth)/hold/[id]', params: { id } } : { pathname: '/(customer)/support/[id]', params: { id } }),
  create: (params: NewTicketParams = {}): Href => ({ pathname: hold ? '/(auth)/hold/new' : '/(customer)/support/new', params: { ...params } }),
});

export interface NewTicketParams {
  category?: SupportCategory;
  contextType?: SupportContextRef['type'];
  contextId?: string;
  /** Shown on the form only; the API writes its own. */
  contextLabel?: string;
}

/** A "Contact support" link: a new ticket with the topic, and what it is about, filled in. */
export const contactSupport = (category: SupportCategory, context?: SupportContextRef & { label: string }): Href =>
  supportRoutes(false).create({ category, ...(context ? { contextType: context.type, contextId: context.id, contextLabel: context.label } : {}) });

/** "Reply to reopen until 21 Nov", or why it can't be. */
export function reopenLine(status: SupportStatus, reopenUntil: string | null): string | null {
  if (status === 'closed') return 'This ticket is closed. Open a new one if you still need help.';
  if (status === 'resolved' && reopenUntil) {
    return `Solved. Reply by ${new Date(reopenUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} to reopen it.`;
  }
  return null;
}
