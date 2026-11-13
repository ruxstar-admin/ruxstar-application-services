import type { ChatMessage, PendingMessage } from '@/types/chat';
import { confirmSent, dropUnsent, mergeIncoming, mergeOlder, seenMessageId } from '../merge-messages';

const make = (id: string, extra: Partial<PendingMessage> = {}): PendingMessage => ({
  id,
  chatId: 'c',
  kind: 'text',
  sender: { id: 'a', name: 'A', username: 'a', isVendor: false, verified: false },
  mine: false,
  text: id,
  post: null,
  photo: null,
  createdAt: '2026-10-22T10:00:00Z',
  ...extra,
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
