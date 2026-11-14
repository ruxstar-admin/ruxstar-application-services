import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuthToken } from '@/hooks/use-auth-token';
import { WorkService } from '@/services/team-service';

/** Open job offers (team invites), refreshed whenever the screen regains focus. Failures leave the last value. */
export function useOfferCount() {
  const token = useAuthToken();
  const [count, setCount] = useState(0);
  const latest = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const request = ++latest.current;
      WorkService.get(token)
        .then((work) => request === latest.current && setCount(work.invites.length))
        .catch(() => undefined);
    }, [token]),
  );

  return count;
}
