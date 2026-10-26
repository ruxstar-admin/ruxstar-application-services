import type { ChatMessage, PendingMessage } from '@/types/chat';
import { confirmSent, lastConfirmedId, mergeIncoming } from '../merge-messages';

const make = (id: string, extra: Partial<PendingMessage> = {}): PendingMessage => ({
  id,
  conversationId: 'c',
  author: { id: 'a', name: 'A' },
  text: id,
  createdAt: '2026-10-22T10:00:00Z',
  mine: false,
  ...extra,
});

describe('lastConfirmedId', () => {
  it('ignores unsent messages', () => {
    expect(lastConfirmedId([make('1'), make('2'), make('tmp', { sendState: 'sending' })])).toBe('2');
    expect(lastConfirmedId([make('tmp', { sendState: 'failed' })])).toBeUndefined();
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

describe('confirmSent', () => {
  it('replaces the temporary message with the saved one', () => {
    const result = confirmSent([make('1'), make('tmp', { sendState: 'sending' })], 'tmp', make('9'));
    expect(result.map((m) => m.id)).toEqual(['1', '9']);
  });

  it('does not duplicate a message a poll already delivered', () => {
    const result = confirmSent([make('1'), make('9'), make('tmp', { sendState: 'sending' })], 'tmp', make('9'));
    expect(result.map((m) => m.id)).toEqual(['1', '9']);
  });
});
