import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/auth-store';
import { parseRecent, recentKey, withoutRecent, withRecent, type RecentPerson } from '../lib/recent-people';

/** People recently opened from Search on this device. Saving is best effort; a failure keeps the list in memory. */
export function useRecentPeople() {
  const userId = useAuthStore((s) => s.userId);
  const [people, setPeople] = useState<RecentPerson[]>([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    AsyncStorage.getItem(recentKey(userId))
      .then((raw) => !cancelled && setPeople(parseRecent(raw)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const save = useCallback(
    (next: (list: RecentPerson[]) => RecentPerson[]) =>
      setPeople((list) => {
        const updated = next(list);
        if (userId) {
          const write = updated.length ? AsyncStorage.setItem(recentKey(userId), JSON.stringify(updated)) : AsyncStorage.removeItem(recentKey(userId));
          write.catch(() => undefined);
        }
        return updated;
      }),
    [userId],
  );

  return {
    people,
    add: useCallback((person: RecentPerson) => save((list) => withRecent(list, person)), [save]),
    remove: useCallback((id: string) => save((list) => withoutRecent(list, id)), [save]),
    clear: useCallback(() => save(() => []), [save]),
  };
}
