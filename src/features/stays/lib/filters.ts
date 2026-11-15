import type { Allowance, Meal, Occupant, PropertiesQuery, PropertyKind, RoomKind, StayUnit } from '@/types/stays';

/** Budgets in rupees, per month or (for nights) per night. */
export const BUDGETS: Record<StayUnit, readonly number[]> = { month: [6000, 10000, 15000, 25000], night: [500, 1000, 2000] };
/** The most days of notice to move out. */
export const NOTICES = [0, 15, 30] as const;
export const ALLOWS: readonly { key: Allowance; label: string }[] = [
  { key: 'late_entry', label: 'No entry time' },
  { key: 'guests', label: 'Guests allowed' },
  { key: 'pets', label: 'Pets allowed' },
  { key: 'smoking', label: 'Smoking allowed' },
  { key: 'alcohol', label: 'Alcohol allowed' },
];

export interface StayFilters {
  kind: PropertyKind | null;
  for: 'men' | 'women' | null;
  occupant: Occupant | null;
  stay: StayUnit | null;
  /** Rupees, per month or per night by `stay`. */
  budget: number | null;
  /** `any`: food is served; `veg`: veg only. */
  food: 'any' | 'veg' | null;
  meals: Meal[];
  facilities: string[];
  room: RoomKind | null;
  noticeMax: number | null;
  allows: Allowance[];
}

export const NO_FILTERS: StayFilters = {
  kind: null,
  for: null,
  occupant: null,
  stay: null,
  budget: null,
  food: null,
  meals: [],
  facilities: [],
  room: null,
  noticeMax: null,
  allows: [],
};

/** How many filters are set, for the "Filters · 3" button. */
export const filterCount = (f: StayFilters) =>
  [f.kind, f.for, f.occupant, f.stay, f.budget, f.food, f.room, f.noticeMax].filter((v) => v !== null).length + f.meals.length + f.facilities.length + f.allows.length;

/** A budget that no longer fits after switching between months and nights is dropped. */
export function withStay(f: StayFilters, stay: StayUnit | null): StayFilters {
  const budget = f.budget !== null && BUDGETS[stay ?? 'month'].includes(f.budget) ? f.budget : null;
  return { ...f, stay, budget };
}

const csv = (items: readonly string[]) => (items.length ? [...items].sort().join(',') : undefined);
const text = (value: string | undefined) => {
  const t = value?.trim() ?? '';
  return t.length >= 2 ? t : undefined;
};

/** The search the API takes. Words shorter than 2 letters are left out, as the API refuses them. */
export function toQuery(f: StayFilters, words: { q?: string; city?: string; area?: string; near?: string } = {}): PropertiesQuery {
  const q: PropertiesQuery = {
    q: words.q?.trim() || undefined,
    city: text(words.city),
    area: text(words.area),
    near: text(words.near),
    kind: f.kind ?? undefined,
    for: f.for ?? undefined,
    occupant: f.occupant ?? undefined,
    stay: f.stay ?? undefined,
    priceMax: f.budget !== null ? f.budget * 100 : undefined,
    food: f.food ?? undefined,
    meals: csv(f.meals),
    facilities: csv(f.facilities),
    room: f.room ?? undefined,
    noticeMax: f.noticeMax ?? undefined,
    allows: csv(f.allows),
  };
  return Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined)) as PropertiesQuery;
}
