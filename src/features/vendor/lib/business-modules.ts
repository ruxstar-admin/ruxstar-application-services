import type { Ionicons } from '@expo/vector-icons';
import type { Business, BusinessMissing, BusinessModule } from '@/types/business';

export const BUSINESS_MODULES: Record<BusinessModule, { label: string; icon: keyof typeof Ionicons.glyphMap; blurb: string }> = {
  pod: { label: 'Print on demand', icon: 'print-outline', blurb: 'T-shirts, mugs and posters printed to order.' },
  events: { label: 'Events', icon: 'calendar-outline', blurb: 'Run events, sell tickets and check people in.' },
  coaching: { label: 'Coaching', icon: 'school-outline', blurb: 'Courses and batches, with attendance.' },
  stays: { label: 'Stays', icon: 'bed-outline', blurb: 'PGs, hostels and rooms to book.' },
};

export const MISSING_LABEL: Record<BusinessMissing, string> = {
  description: 'a description of at least 20 characters',
  phone: 'a phone number',
  address: 'an address',
  photo: 'a photo',
};

/** The one badge a business shows: on hold beats everything, then draft, then paused, open or closed. */
export function statusOf(b: Business): { label: string; tone: 'neutral' | 'success' | 'warning' | 'error' } {
  if (b.suspension) return { label: 'On hold', tone: 'error' };
  if (b.status === 'draft') return { label: 'Draft', tone: 'neutral' };
  if (!b.moduleLive) return { label: 'Paused', tone: 'warning' };
  return b.open ? { label: 'Open', tone: 'success' } : { label: 'Closed', tone: 'neutral' };
}

/** "a, b and c" */
export const listOf = (items: string[]) => (items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);
