import type { PendingMessage } from '@/types/chat';
import { activeLabel, layoutThread, stampLabel } from '../thread-layout';

const at = (iso: string, mine: boolean, extra: Partial<PendingMessage> = {}): PendingMessage => ({
  id: iso,
  chatId: 'c',
  kind: 'text',
  sender: mine ? null : { id: 'a', name: 'A', username: 'a', isVendor: false, verified: false },
  mine,
  text: 'hi',
  post: null,
  photo: null,
  voice: null,
  replyTo: null,
  reactions: [],
  createdAt: iso,
  ...extra,
});

const NOW = new Date(2026, 10, 13, 15, 0).getTime();
const local = (day: number, h: number, m: number) => new Date(2026, 10, day, h, m).toISOString();

describe('stampLabel', () => {
  it('names today, yesterday, this week and older days', () => {
    expect(stampLabel(local(13, 9, 5), NOW)).toBe('Today 09:05');
    expect(stampLabel(local(12, 22, 30), NOW)).toBe('Yesterday 22:30');
    expect(stampLabel(local(10, 8, 0), NOW)).toMatch(/^Tue 08:00$/);
    expect(stampLabel(local(1, 8, 0), NOW)).toBe('1 Nov, 08:00');
    expect(stampLabel(new Date(2025, 0, 2, 8, 0).toISOString(), NOW)).toBe('2 Jan 2025, 08:00');
  });
});

describe('activeLabel', () => {
  const ago = (ms: number) => new Date(NOW - ms).toISOString();
  it('says now, minutes, hours, yesterday, and nothing after a week', () => {
    expect(activeLabel(null, NOW)).toBeNull();
    expect(activeLabel(ago(60_000), NOW)).toBe('Active now');
    expect(activeLabel(ago(5 * 60_000), NOW)).toBe('Active 5m ago');
    expect(activeLabel(ago(3 * 3_600_000), NOW)).toBe('Active 3h ago');
    expect(activeLabel(ago(30 * 3_600_000), NOW)).toBe('Active yesterday');
    expect(activeLabel(ago(3 * 86_400_000), NOW)).toBe('Active 3d ago');
    expect(activeLabel(ago(9 * 86_400_000), NOW)).toBeNull();
  });
});

describe('layoutThread', () => {
  it('joins a run from one person and starts a new one when the sender changes', () => {
    const rows = layoutThread([at(local(13, 10, 0), true), at(local(13, 10, 1), true), at(local(13, 10, 2), true), at(local(13, 10, 3), false)], NOW);
    expect(rows.map((r) => r.position)).toEqual(['first', 'middle', 'last', 'single']);
    expect(rows.map((r) => r.header)).toEqual(['Today 10:00', null, null, null]);
  });

  it('puts a time line after an hour of quiet and breaks the run there', () => {
    const rows = layoutThread([at(local(13, 10, 0), true), at(local(13, 11, 30), true)], NOW);
    expect(rows.map((r) => r.header)).toEqual(['Today 10:00', 'Today 11:30']);
    expect(rows.map((r) => r.position)).toEqual(['single', 'single']);
  });

  it('never joins group lines to bubbles', () => {
    const rows = layoutThread([at(local(13, 10, 0), true), at(local(13, 10, 1), true, { kind: 'event' }), at(local(13, 10, 2), true)], NOW);
    expect(rows.map((r) => r.position)).toEqual(['single', 'single', 'single']);
  });
});
