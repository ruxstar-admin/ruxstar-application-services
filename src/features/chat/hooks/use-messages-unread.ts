import { useEffect, useState } from 'react';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ChatService } from '@/services/chat-service';

const REFRESH_MS = 15_000;

/** Total unread chat messages for the tab badge, refreshed periodically. Failures keep the last value. */
export function useMessagesUnread() {
  const token = useAuthToken();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      ChatService.unreadTotal(token)
        .then((res) => !cancelled && setCount(res.count))
        .catch(() => undefined);
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token]);

  return count;
}
