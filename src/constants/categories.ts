import { Ionicons } from '@expo/vector-icons';

export interface CategoryDef {
  short: string;
  icon:  keyof typeof Ionicons.glyphMap;
  match: RegExp;
}

export const CATEGORY_DEFS: CategoryDef[] = [
  { short: 'Venues',       icon: 'business-outline',      match: /venue|hall|banquet|party|wedding|function|event.?space/i },
  { short: 'Sports',       icon: 'football-outline',       match: /sport|turf|ground|court|cricket|football|badminton|tennis|play/i },
  { short: 'Salon',        icon: 'rose-outline',           match: /salon|spa|beauty|hair|nail|groom|makeup/i },
  { short: 'Gym',          icon: 'barbell-outline',        match: /gym|fitness|yoga|workout|crossfit|pilates/i },
  { short: 'Coaching',     icon: 'school-outline',         match: /tutor|class|school|education|coach|mentor|learn|training/i },
  { short: 'Studio',       icon: 'camera-outline',         match: /photo|studio|creator|record|shoot/i },
  { short: 'Restaurant',   icon: 'restaurant-outline',     match: /food|caf[eé]|restaurant|kitchen|chef|baker|bistro/i },
  { short: 'Clinic',       icon: 'medical-outline',        match: /clinic|doctor|health|dental|medical|hospital|therapy|physio/i },
  { short: 'Services',     icon: 'briefcase-outline',      match: /service|appoint|booking|consult/i },
  { short: 'Prints',       icon: 'print-outline',          match: /print|banner|poster|sticker|flex|merch/i },
];

const FALLBACK_MATCH = /.*/;

export function resolveCategoryDef(label: string): CategoryDef {
  const l = label.toLowerCase();
  for (const def of CATEGORY_DEFS) {
    if (def.match.test(l)) return def;
  }
  // fallback — use the full first word (no truncation), with a generic icon
  const short = label.split(/[\s&,]/)[0];
  return { short, icon: 'grid-outline', match: FALLBACK_MATCH };
}

/**
 * Resolves a business's filter category from its specific type label first
 * (e.g. "Sports turf & courts"), only falling back to the broader parent
 * category label (e.g. "Bookings & venues") when the type label alone
 * doesn't match anything.
 *
 * The parent category label is a generic umbrella and can leak misleading
 * keywords — "Bookings & venues" contains the word "venue", which used to
 * make every turf/court business match the Venues bucket instead of Sports
 * whenever both labels were concatenated before matching.
 */
export function resolveBizCategoryDef(typeLabel: string, categoryLabel: string): CategoryDef {
  const fromType = resolveCategoryDef(typeLabel);
  if (fromType.match !== FALLBACK_MATCH) return fromType;
  const combined = `${typeLabel} ${categoryLabel}`.trim();
  return resolveCategoryDef(combined || typeLabel);
}
