import { parseRecent, RECENT_MAX, recentKey, withoutRecent, withRecent, type RecentPerson } from '../recent-people';

const person = (id: string): RecentPerson => ({ id, name: `Person ${id}`, username: `p${id}`, city: '' });

describe('recent people', () => {
  it('puts the newest first without repeats, up to the limit', () => {
    const list = [person('a'), person('b')];
    expect(withRecent(list, person('b')).map((p) => p.id)).toEqual(['b', 'a']);
    const full = Array.from({ length: RECENT_MAX }, (_, i) => person(String(i)));
    const next = withRecent(full, person('new'));
    expect(next).toHaveLength(RECENT_MAX);
    expect(next[0].id).toBe('new');
    expect(next.some((p) => p.id === String(RECENT_MAX - 1))).toBe(false);
  });

  it('removes one person', () => {
    expect(withoutRecent([person('a'), person('b')], 'a').map((p) => p.id)).toEqual(['b']);
  });

  it('reads back what was saved and ignores anything broken', () => {
    expect(parseRecent(JSON.stringify([person('a')]))).toEqual([person('a')]);
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent('not json')).toEqual([]);
    expect(parseRecent(JSON.stringify({ id: 'a' }))).toEqual([]);
    expect(parseRecent(JSON.stringify([{ id: 1 }, person('b')]))).toEqual([person('b')]);
  });

  it('keeps each account separate', () => {
    expect(recentKey('u1')).not.toBe(recentKey('u2'));
  });
});
