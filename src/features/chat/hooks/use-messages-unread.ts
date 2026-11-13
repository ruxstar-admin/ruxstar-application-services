import { useEffect, useState } from 'react';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ChatService } from '@/services/chat-service';
import type { ChatUnread } from '@/types/chat';

const REFRESH_MS = 15_000;

/** Unread messages (muted chats left out) and waiting requests, for the tab badge. Failures keep the last value. */
export function useMessagesUnread(): ChatUnread {
  const token = useAuthToken();
  const [counts, setCounts] = useState<ChatUnread>({ unread: 0, requests: 0 });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () =>
      ChatService.unread(token)
        .then((next) => !cancelled && setCounts((prev) => (prev.unread === next.unread && prev.requests === next.requests ? prev : next)))
        .catch(() => undefined);
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token]);

  return counts;
}
