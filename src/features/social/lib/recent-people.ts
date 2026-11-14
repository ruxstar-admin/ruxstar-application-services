/** Someone opened from Search, kept on this device only. */
export interface RecentPerson {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  city: string;
}

export const RECENT_MAX = 10;

/** Each account has its own list, so a shared phone doesn't show one person's searches to another. */
export const recentKey = (userId: string) => `ruxstar.search.recent.${userId}`;

/** Newest first, without repeats, at most `RECENT_MAX`. */
export const withRecent = (list: RecentPerson[], person: RecentPerson) => [person, ...list.filter((p) => p.id !== person.id)].slice(0, RECENT_MAX);

export const withoutRecent = (list: RecentPerson[], id: string) => list.filter((p) => p.id !== id);

/** What was saved, or nothing when it is missing or unreadable. */
export function parseRecent(raw: string | null): RecentPerson[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter((p): p is RecentPerson => !!p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.username === 'string')
      .map((p) => ({ id: p.id, name: p.name, username: p.username, avatarUrl: typeof p.avatarUrl === 'string' ? p.avatarUrl : undefined, city: typeof p.city === 'string' ? p.city : '' }))
      .slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}
