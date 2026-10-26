import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { confirmSent, lastConfirmedId, mergeIncoming } from '@/features/chat/lib/merge-messages';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { createLogger } from '@/lib/logger';
import { ChatService } from '@/services/chat-service';
import type { PendingMessage } from '@/types/chat';

const POLL_MS = 4000;
const log = createLogger('chat');

/**
 * A conversation's messages: loads the latest, polls for newer ones while the screen is focused, and
 * sends optimistically (a failed send stays in the list with a retry). Transport is polling until the
 * real-time API exists; only this hook would change.
 */
export function useThread(id: string) {
  const token = useAuthToken();
  const [messages, setMessages] = useState<PendingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const latest = useRef<PendingMessage[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    latest.current = messages;
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    ChatService.messages(token, id)
      .then((list) => {
        if (cancelled) return;
        setMessages(list);
        setError(false);
        setLoading(false);
        ChatService.markRead(token, id).catch(() => undefined);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, id, attempt]);

  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => {
        ChatService.messages(token, id, lastConfirmedId(latest.current))
          .then((incoming) => {
            if (incoming.length === 0) return;
            setMessages((prev) => mergeIncoming(prev, incoming));
            ChatService.markRead(token, id).catch(() => undefined);
          })
          .catch(() => log.debug('poll failed'));
      }, POLL_MS);
      return () => clearInterval(timer);
    }, [token, id]),
  );

  const deliver = useCallback(
    async (tempId: string, text: string) => {
      try {
        const saved = await ChatService.send(token, id, text);
        setMessages((prev) => confirmSent(prev, tempId, saved));
      } catch {
        Feedback.error();
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, sendState: 'failed' as const } : m)));
      }
    },
    [token, id],
  );

  const send = useCallback(
    (text: string) => {
      const tempId = `tmp-${++counter.current}`;
      const optimistic: PendingMessage = {
        id: tempId,
        conversationId: id,
        author: { id: 'me', name: 'You' },
        text,
        createdAt: new Date().toISOString(),
        mine: true,
        sendState: 'sending',
      };
      setMessages((prev) => [...prev, optimistic]);
      deliver(tempId, text);
    },
    [id, deliver],
  );

  const retry = useCallback(
    (message: PendingMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, sendState: 'sending' as const } : m)));
      deliver(message.id, message.text);
    },
    [deliver],
  );

  const reload = useCallback(() => {
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  return { messages, loading, error, send, retry, reload };
}
