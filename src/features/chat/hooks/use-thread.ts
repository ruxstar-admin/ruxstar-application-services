import { useCallback, useEffect, useRef, useState } from 'react';
import { File } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { applyUpdated, confirmSent, dropUnsent, mergeIncoming, mergeOlder, withMyReaction } from '@/features/chat/lib/merge-messages';
import { quoteOf } from '@/features/chat/lib/thread-layout';
import { toUploadJpeg } from '@/features/profile/lib/profile-photo';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { createLogger } from '@/lib/logger';
import { ChatService, UPDATES_WAIT_S } from '@/services/chat-service';
import type { ChatDetail, ChatUpdates, PendingMessage } from '@/types/chat';
import type { Author } from '@/types/social';

/** After a failed check, wait this long before the next. */
const RETRY_MS = 3000;
/** Someone shows as typing… this long after the last answer that said so. */
const TYPING_SHOWN_MS = 6500;
/** While you type, "still typing" goes out this often, and stops after this long without a keystroke. */
const TYPING_REFRESH_MS = 4000;
const TYPING_IDLE_MS = 5000;
/** The API keeps chat photos at 1280 px on the long side. */
const PHOTO_SIDE = 1280;
const log = createLogger('chat');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface Recording {
  uri: string;
  durationMs: number;
  levels: number[];
}

/**
 * One chat: its details and messages. Loads the latest page, then keeps one /updates call open while the
 * screen is focused, which answers the moment anything changes (new messages, unsent ones, reactions, typing,
 * Seen, changes to a group). Sends optimistically: a failed send stays in the list with a retry that reuses
 * its idempotency key, so it is never sent twice.
 */
export function useThread(id: string) {
  const token = useAuthToken();
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [messages, setMessages] = useState<PendingMessage[]>([]);
  const [typing, setTyping] = useState<Author[]>([]);
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const since = useRef<string | null>(null);
  const latest = useRef<PendingMessage[]>([]);
  const files = useRef(new Map<string, Uint8Array<ArrayBuffer>>());
  const counter = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const apply = useCallback(
    (update: ChatUpdates) => {
      since.current = update.now;
      const known = new Set(latest.current.map((m) => m.id));
      const fromOthers = update.messages.some((m) => !m.mine && !known.has(m.id));
      setMessages((prev) => dropUnsent(applyUpdated(mergeIncoming(prev, update.messages), update.updated), update.unsent));
      setChat((prev) => (prev && (prev.seenAt !== update.seenAt || prev.activeAt !== update.activeAt) ? { ...prev, seenAt: update.seenAt, activeAt: update.activeAt } : prev));
      setTyping((prev) => (prev.length === 0 && update.typing.length === 0 ? prev : update.typing));
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (update.typing.length) typingTimer.current = setTimeout(() => setTyping([]), TYPING_SHOWN_MS);
      if (update.changed) refreshChat();
      if (fromOthers) markRead();
    },
    [refreshChat, markRead],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        while (active) {
          if (!since.current) {
            await sleep(300);
            continue;
          }
          try {
            const update = await ChatService.updates(token, id, since.current, UPDATES_WAIT_S);
            if (active) apply(update);
          } catch {
            log.debug('updates failed');
            await sleep(RETRY_MS);
          }
        }
      })();
      return () => {
        active = false;
        if (typingTimer.current) clearTimeout(typingTimer.current);
      };
    }, [token, id, apply]),
  );

  // Telling the others you're typing.
  const typingSince = useRef(0);
  const typingIdle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTyping = useCallback(
    (tell = true) => {
      if (typingIdle.current) clearTimeout(typingIdle.current);
      typingIdle.current = null;
      if (typingSince.current && tell) ChatService.typing(token, id, false).catch(() => undefined);
      typingSince.current = 0;
    },
    [token, id],
  );
  const noteTyping = useCallback(
    (draft: string) => {
      if (!draft.trim()) return stopTyping();
      if (Date.now() - typingSince.current > TYPING_REFRESH_MS) {
        typingSince.current = Date.now();
        ChatService.typing(token, id, true).catch(() => undefined);
      }
      if (typingIdle.current) clearTimeout(typingIdle.current);
      typingIdle.current = setTimeout(() => stopTyping(), TYPING_IDLE_MS);
    },
    [token, id, stopTyping],
  );
  useEffect(() => () => stopTyping(), [stopTyping]);

  const deliver = async (message: PendingMessage) => {
    const key = message.idempotencyKey!;
    const replyToId = message.replyTo?.id;
    try {
      const file = files.current.get(message.id);
      const saved =
        message.kind === 'voice' && file && message.recording
          ? await ChatService.sendVoice(token, id, file, message.recording, key, replyToId)
          : file
            ? await ChatService.sendPhoto(token, id, file, key, replyToId)
            : await ChatService.send(token, id, { text: message.text, replyToId }, key);
      files.current.delete(message.id);
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

  const optimistic = (fields: Partial<PendingMessage>, replyTo?: PendingMessage | null): PendingMessage => ({
    id: `tmp-${++counter.current}`,
    chatId: id,
    kind: 'text',
    sender: null,
    mine: true,
    text: '',
    post: null,
    photo: null,
    voice: null,
    replyTo: replyTo ? quoteOf(replyTo) : null,
    reactions: [],
    createdAt: new Date().toISOString(),
    sendState: 'sending',
    idempotencyKey: newIdempotencyKey(),
    ...fields,
  });

  const failed = (message: PendingMessage) => setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, sendState: 'failed' as const } : m)));

  const send = (text: string, replyTo?: PendingMessage | null) => {
    stopTyping(false);
    const message = optimistic({ text }, replyTo);
    setMessages((prev) => [...prev, message]);
    deliver(message);
  };

  const sendPhoto = async (asset: ImagePickerAsset, replyTo?: PendingMessage | null) => {
    const scale = Math.min(1, PHOTO_SIDE / Math.max(asset.width, asset.height));
    const message = optimistic(
      { kind: 'photo', upload: { uri: asset.uri, width: Math.round(asset.width * scale), height: Math.round(asset.height * scale) } },
      replyTo,
    );
    setMessages((prev) => [...prev, message]);
    try {
      files.current.set(message.id, await toUploadJpeg(asset, PHOTO_SIDE));
    } catch {
      return failed(message);
    }
    deliver(message);
  };

  const sendVoice = async (recording: Recording, replyTo?: PendingMessage | null) => {
    const message = optimistic({ kind: 'voice', recording }, replyTo);
    setMessages((prev) => [...prev, message]);
    try {
      files.current.set(message.id, await new File(recording.uri).bytes());
    } catch {
      return failed(message);
    }
    deliver(message);
  };

  const retry = (message: PendingMessage) => {
    if ((message.kind === 'photo' || message.kind === 'voice') && !files.current.has(message.id)) return;
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, sendState: 'sending' as const } : m)));
    deliver({ ...message, sendState: 'sending' });
  };

  /** Your own message, gone for everyone. One that never reached the server is just dropped. */
  const unsend = async (message: PendingMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    files.current.delete(message.id);
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

  /** Sets your reaction, or takes it back when it's the one you already gave. Shows at once; undone if the API says no. */
  const react = async (message: PendingMessage, emoji: string) => {
    if (message.sendState || message.kind === 'event') return;
    const takeBack = message.reactions.some((r) => r.mine && r.emoji === emoji);
    const before = message.reactions;
    const set = (reactions: PendingMessage['reactions']) => setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, reactions } : m)));
    set(withMyReaction(before, emoji));
    try {
      const saved = takeBack ? await ChatService.unreact(token, id, message.id) : await ChatService.react(token, id, message.id, emoji);
      setMessages((prev) => applyUpdated(prev, [saved]));
    } catch {
      Feedback.error();
      set(before);
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

  return {
    chat,
    setChat,
    refreshChat,
    messages,
    typing,
    loading,
    error,
    reload,
    send,
    sendPhoto,
    sendVoice,
    retry,
    unsend,
    react,
    noteTyping,
    loadOlder,
    loadingOlder,
  };
}
