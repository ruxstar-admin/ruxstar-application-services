import type { Ionicons } from '@expo/vector-icons';
import type { Business, BusinessMissing, BusinessModule, BusinessType } from '@/types/business';

/** Icons and the short label for lists; the catalog has the full category names and descriptions. */
export const BUSINESS_MODULES: Record<BusinessModule, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pod: { label: 'Print on demand', icon: 'print-outline' },
  events: { label: 'Events', icon: 'calendar-outline' },
  coaching: { label: 'Coaching', icon: 'school-outline' },
  stays: { label: 'Stays', icon: 'bed-outline' },
};

export const TYPE_ICONS: Record<BusinessType, keyof typeof Ionicons.glyphMap> = {
  print_shop: 'print-outline',
  concert: 'musical-notes-outline',
  sports_event: 'trophy-outline',
  coaching: 'school-outline',
  pg: 'home-outline',
  hostel: 'bed-outline',
};

export const MISSING_LABEL: Record<BusinessMissing, string> = {
  photo: 'a cover photo',
  phone: 'a phone number',
  location: 'a location',
  products: 'the products you print',
  area: 'where you deliver',
  pricing: 'prices for every product',
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
