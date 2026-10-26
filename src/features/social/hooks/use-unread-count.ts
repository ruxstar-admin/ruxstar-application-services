import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuthToken } from '@/hooks/use-auth-token';
import { SocialService } from '@/services/social-service';

/** Unread notification count, refreshed whenever the screen regains focus. Failures leave the last value. */
export function useUnreadCount() {
  const token = useAuthToken();
  const [count, setCount] = useState(0);
  const latest = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const request = ++latest.current;
      SocialService.unreadCount(token)
        .then((res) => request === latest.current && setCount(res.count))
        .catch(() => undefined);
    }, [token]),
  );

  return count;
}
