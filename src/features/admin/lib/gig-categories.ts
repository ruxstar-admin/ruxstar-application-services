import type { GigCategory } from '@/types/gigs';

const KEY = /^[a-z][a-z0-9_]{1,29}$/;
export const MAX_CATEGORIES = 30;

/** A new category's key from its label, like "Voice overs" → "voice_overs"; a number is added when it's taken. */
export function categoryKeyOf(label: string, taken: readonly string[]): string {
  let base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .replace(/_+$/, '')
    .slice(0, 26);
  if (base.length < 2) base = 'category';
  let key = base;
  for (let n = 2; taken.includes(key); n += 1) key = `${base}_${n}`;
  return key;
}

/** What's wrong with the list, as the API would say it, or null. */
export function categoriesProblem(list: readonly GigCategory[]): string | null {
  if (!list.length) return 'Add at least one category.';
  if (list.length > MAX_CATEGORIES) return `Up to ${MAX_CATEGORIES} categories.`;
  if (list.some((c) => !c.label.trim() || c.label.trim().length > 40)) return 'Each category needs a name of up to 40 characters.';
  if (list.some((c) => !KEY.test(c.key))) return 'A category’s key isn’t valid.';
  if (new Set(list.map((c) => c.key)).size !== list.length) return 'Each category needs its own key.';
  if (list.every((c) => c.hidden)) return 'Keep at least one category showing.';
  return null;
}

/** Whether the list differs from the saved one: a label, a hidden switch, the order, or a new category. */
export const categoriesChanged = (list: readonly GigCategory[], saved: readonly GigCategory[]) =>
  list.length !== saved.length || list.some((c, i) => c.key !== saved[i]?.key || c.label.trim() !== saved[i]?.label || c.hidden !== saved[i]?.hidden);
