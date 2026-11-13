import { useCallback, useEffect, useRef, useState } from 'react';
import type { ImagePickerAsset } from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { confirmSent, dropUnsent, mergeIncoming, mergeOlder } from '@/features/chat/lib/merge-messages';
import { toUploadJpeg } from '@/features/profile/lib/profile-photo';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { createLogger } from '@/lib/logger';
import { ChatService } from '@/services/chat-service';
import type { ChatDetail, PendingMessage } from '@/types/chat';

const POLL_MS = 3000;
/** The API keeps chat photos at 1280 px on the long side. */
const PHOTO_SIDE = 1280;
const log = createLogger('chat');

/**
 * One chat: its details and messages. Loads the latest page, polls every few seconds while the screen is
 * focused (new messages, unsent ones, Seen, and changes to a group), and sends optimistically: a failed
 * send stays in the list with a retry that reuses its idempotency key, so it is never sent twice.
 */
export function useThread(id: string) {
  const token = useAuthToken();
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [messages, setMessages] = useState<PendingMessage[]>([]);
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const since = useRef<string | null>(null);
  const polling = useRef(false);
  const latest = useRef<PendingMessage[]>([]);
  const photos = useRef(new Map<string, Uint8Array<ArrayBuffer>>());
  const counter = useRef(0);

  useEffect(() => {
    latest.current = messages;
  }, [messages]);

  const markRead = useCallback(() => {
    ChatService.markRead(token, id).catch(() => undefined);
  }, [token, id]);

  const refreshChat = useCallback(() => {
    ChatService.get(token, id)
      .then(setChat)
      .catch(() => log.debug('chat refresh failed'));
  }, [token, id]);

  useEffect(() => {
    let cancelled = false;
    since.current = null;
    Promise.all([ChatService.get(token, id), ChatService.messages(token, id)])
      .then(([detail, page]) => {
        if (cancelled) return;
        setChat(detail);
        setMessages([...page.items].reverse());
        setOlderCursor(page.nextCursor);
        // Server time, so a phone clock that is off never skips messages.
        since.current = page.items[0]?.createdAt ?? detail.createdAt;
        setError(false);
        setLoading(false);
        markRead();
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, id, attempt, markRead]);

  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => {
        if (!since.current || polling.current) return;
        polling.current = true;
        ChatService.updates(token, id, since.current)
          .then((update) => {
            since.current = update.now;
            const known = new Set(latest.current.map((m) => m.id));
            const fromOthers = update.messages.some((m) => !m.mine && !known.has(m.id));
            setMessages((prev) => dropUnsent(mergeIncoming(prev, update.messages), update.unsent));
            setChat((prev) => (prev && prev.seenAt !== update.seenAt ? { ...prev, seenAt: update.seenAt } : prev));
            if (update.changed) refreshChat();
            if (fromOthers) markRead();
          })
          .catch(() => log.debug('poll failed'))
          .finally(() => {
            polling.current = false;
          });
      }, POLL_MS);
      return () => clearInterval(timer);
    }, [token, id, refreshChat, markRead]),
  );

  const deliver = async (message: PendingMessage) => {
    const key = message.idempotencyKey!;
    try {
      const jpeg = photos.current.get(message.id);
      const saved = jpeg ? await ChatService.sendPhoto(token, id, jpeg, key) : await ChatService.send(token, id, { text: message.text }, key);
      photos.current.delete(message.id);
      // A first message or a reply to a request changes what this chat allows next.
      const firstFromMe = !latest.current.some((m) => m.mine && !m.sendState && m.kind !== 'event');
      setMessages((prev) => confirmSent(prev, message.id, saved));
      if (firstFromMe || chat?.state === 'request') refreshChat();
    } catch (err) {
      Feedback.error();
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, sendState: 'failed' as const } : m)));
      if (err instanceof ApiError && (err.code === 'CHAT_REQUEST_PENDING' || err.status === 403 || err.status === 404)) refreshChat();
    }
  };

  const optimistic = (fields: Partial<PendingMessage>): PendingMessage => ({
    id: `tmp-${++counter.current}`,
    chatId: id,
    kind: 'text',
    sender: null,
    mine: true,
    text: '',
    post: null,
    photo: null,
    createdAt: new Date().toISOString(),
    sendState: 'sending',
    idempotencyKey: newIdempotencyKey(),
    ...fields,
  });

  const send = (text: string) => {
    const message = optimistic({ text });
    setMessages((prev) => [...prev, message]);
    deliver(message);
  };

  const sendPhoto = async (asset: ImagePickerAsset) => {
    const scale = Math.min(1, PHOTO_SIDE / Math.max(asset.width, asset.height));
    const message = optimistic({
      kind: 'photo',
      upload: { uri: asset.uri, width: Math.round(asset.width * scale), height: Math.round(asset.height * scale) },
    });
    setMessages((prev) => [...prev, message]);
    try {
      photos.current.set(message.id, await toUploadJpeg(asset, PHOTO_SIDE));
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, sendState: 'failed' as const } : m)));
      return;
    }
    deliver(message);
  };

  const retry = (message: PendingMessage) => {
    if (message.kind === 'photo' && !photos.current.has(message.id)) return;
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, sendState: 'sending' as const } : m)));
    deliver({ ...message, sendState: 'sending' });
  };

  /** Your own message, gone for everyone. One that never reached the server is just dropped. */
  const unsend = async (message: PendingMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    photos.current.delete(message.id);
    if (message.sendState) return true;
    try {
      await ChatService.unsend(token, id, message.id);
      return true;
    } catch {
      Feedback.error();
      setMessages((prev) => mergeIncoming(prev, [message]).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      return false;
    }
  };

  const loadOlder = useCallback(() => {
    if (!olderCursor || loadingOlder) return;
    setLoadingOlder(true);
    ChatService.messages(token, id, olderCursor)
      .then((page) => {
        setMessages((prev) => mergeOlder(prev, page.items));
        setOlderCursor(page.nextCursor);
      })
      .catch(() => log.debug('older messages failed'))
      .finally(() => setLoadingOlder(false));
  }, [token, id, olderCursor, loadingOlder]);

  const reload = useCallback(() => {
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  return { chat, setChat, refreshChat, messages, loading, error, reload, send, sendPhoto, retry, unsend, loadOlder, loadingOlder };
}
