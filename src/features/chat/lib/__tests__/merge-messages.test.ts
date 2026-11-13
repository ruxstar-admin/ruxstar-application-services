import type { ChatMessage, PendingMessage } from '@/types/chat';
import { applyUpdated, confirmSent, dropUnsent, mergeIncoming, mergeOlder, seenMessageId, withMyReaction } from '../merge-messages';

const make = (id: string, extra: Partial<PendingMessage> = {}): PendingMessage => ({
  id,
  chatId: 'c',
  kind: 'text',
  sender: { id: 'a', name: 'A', username: 'a', isVendor: false, verified: false },
  mine: false,
  text: id,
  post: null,
  photo: null,
  voice: null,
  replyTo: null,
  reactions: [],
  createdAt: '2026-10-22T10:00:00Z',
  ...extra,
});

describe('applyUpdated', () => {
  it('swaps in newer copies of held messages and keeps the array when none match', () => {
    const current = [make('1'), make('2', { idempotencyKey: 'k' })];
    const heart = [{ emoji: '❤️', count: 1, mine: false }];
    const next = applyUpdated(current, [make('2', { reactions: heart })]);
    expect(next[1]).toMatchObject({ reactions: heart, idempotencyKey: 'k' });
    expect(applyUpdated(current, [make('x')])).toBe(current);
  });
});

describe('withMyReaction', () => {
  const heart = { emoji: '❤️', count: 2, mine: false };
  it('adds yours, swaps it, and takes it back', () => {
    const added = withMyReaction([heart], '❤️');
    expect(added).toEqual([{ emoji: '❤️', count: 3, mine: true }]);
    const swapped = withMyReaction(added, '😂');
    expect(swapped).toEqual([heart, { emoji: '😂', count: 1, mine: true }]);
    expect(withMyReaction(swapped, '😂')).toEqual([heart]);
  });
});

describe('mergeIncoming', () => {
  it('appends only unseen messages and keeps unsent ones last', () => {
    const current = [make('1'), make('tmp', { sendState: 'sending', mine: true })];
    const result = mergeIncoming(current, [make('1'), make('2')] as ChatMessage[]);
    expect(result.map((m) => m.id)).toEqual(['1', '2', 'tmp']);
  });

  it('returns the same array when nothing is new', () => {
    const current = [make('1')];
    expect(mergeIncoming(current, [make('1')] as ChatMessage[])).toBe(current);
  });
});

describe('mergeOlder', () => {
  it('puts an older page first, oldest at the top', () => {
    const result = mergeOlder([make('3'), make('4')], [make('2'), make('1'), make('3')]);
    expect(result.map((m) => m.id)).toEqual(['1', '2', '3', '4']);
  });
});

describe('confirmSent', () => {
  it('swaps the optimistic copy for the saved one', () => {
    const current = [make('1'), make('tmp', { sendState: 'sending', mine: true })];
    expect(confirmSent(current, 'tmp', make('9', { mine: true })).map((m) => m.id)).toEqual(['1', '9']);
  });

  it('keeps the send key so the row stays the same on screen', () => {
    const current = [make('tmp', { sendState: 'sending', mine: true, idempotencyKey: 'k' })];
    expect(confirmSent(current, 'tmp', make('9', { mine: true }))[0].idempotencyKey).toBe('k');
  });

  it('drops the copy when a poll already delivered it', () => {
    const current = [make('1'), make('9', { mine: true }), make('tmp', { sendState: 'sending', mine: true })];
    expect(confirmSent(current, 'tmp', make('9', { mine: true })).map((m) => m.id)).toEqual(['1', '9']);
  });
});

describe('dropUnsent', () => {
  it('removes unsent messages and keeps the array when none match', () => {
    const current = [make('1'), make('2')];
    expect(dropUnsent(current, ['2']).map((m) => m.id)).toEqual(['1']);
    expect(dropUnsent(current, ['x'])).toBe(current);
  });
});

describe('seenMessageId', () => {
  it('marks your latest message once they read it', () => {
    const mine = make('2', { mine: true, createdAt: '2026-10-22T10:05:00Z' });
    expect(seenMessageId([make('1'), mine], '2026-10-22T10:06:00Z')).toBe('2');
    expect(seenMessageId([make('1'), mine], '2026-10-22T10:04:00Z')).toBeNull();
    expect(seenMessageId([mine, make('3')], '2026-10-22T11:00:00Z')).toBeNull();
    expect(seenMessageId([mine], null)).toBeNull();
  });
});
