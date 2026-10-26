import type { ChatMessage, PendingMessage } from '@/types/chat';

/** The newest message the server has confirmed (skips unsent local ones). Used as the polling cursor. */
export const lastConfirmedId = (messages: PendingMessage[]): string | undefined => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (!messages[i].sendState) return messages[i].id;
  }
  return undefined;
};

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

/** Swaps an optimistic message for the server's version, dropping the copy if a poll already delivered it. */
export const confirmSent = (current: PendingMessage[], tempId: string, saved: ChatMessage): PendingMessage[] => {
  const withoutTemp = current.filter((m) => m.id !== tempId);
  return withoutTemp.some((m) => m.id === saved.id) ? withoutTemp : [...withoutTemp, saved];
};
