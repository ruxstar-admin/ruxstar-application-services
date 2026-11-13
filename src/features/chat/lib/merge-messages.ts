import type { ChatMessage, PendingMessage } from '@/types/chat';

/**
 * Adds messages the server returned that we do not hold yet. Unsent local messages always stay last,
 * so a poll arriving mid-send never reorders the conversation.
 */
export const mergeIncoming = (current: PendingMessage[], incoming: ChatMessage[]): PendingMessage[] => {
  const known = new Set(current.map((m) => m.id));
  const fresh = incoming.filter((m) => !known.has(m.id));
  if (fresh.length === 0) return current;
  const confirmed = current.filter((m) => !m.sendState);
  const unsent = current.filter((m) => m.sendState);
  return [...confirmed, ...fresh, ...unsent];
};

/** Puts an older page (newest first, as the API sends it) before what is held. */
export const mergeOlder = (current: PendingMessage[], olderNewestFirst: ChatMessage[]): PendingMessage[] => {
  const known = new Set(current.map((m) => m.id));
  const older = olderNewestFirst.filter((m) => !known.has(m.id)).reverse();
  return older.length ? [...older, ...current] : current;
};

/** Swaps an optimistic message for the server's version, dropping the copy if a poll already delivered it. */
export const confirmSent = (current: PendingMessage[], tempId: string, saved: ChatMessage): PendingMessage[] => {
  const withoutTemp = current.filter((m) => m.id !== tempId);
  return withoutTemp.some((m) => m.id === saved.id) ? withoutTemp : [...withoutTemp, saved];
};

/** Removes messages their senders unsent. */
export const dropUnsent = (current: PendingMessage[], ids: string[]): PendingMessage[] => {
  if (ids.length === 0) return current;
  const gone = new Set(ids);
  const kept = current.filter((m) => !gone.has(m.id));
  return kept.length === current.length ? current : kept;
};

/** The message to show "Seen" under: the latest one, when it is yours and they have read it since. */
export const seenMessageId = (messages: PendingMessage[], seenAt: string | null): string | null => {
  const last = messages.at(-1);
  if (!seenAt || !last || !last.mine || last.sendState || last.kind === 'event') return null;
  return new Date(last.createdAt).getTime() <= new Date(seenAt).getTime() ? last.id : null;
};
