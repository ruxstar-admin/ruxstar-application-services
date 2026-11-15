import type { ClassView, CoachingOrder, TimetableEntry } from '@/types/coaching';
import { byDay, cancelText, certificateLine, certificateProgress, joinState, percentOf } from '../classes';

const NOW = Date.parse('2026-11-16T10:00:00Z');
const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

const cls = (startsInHours: number, extra: Partial<ClassView> = {}): ClassView => ({
  id: `c${startsInHours}`,
  startsAt: iso(NOW + startsInHours * HOUR),
  endsAt: iso(NOW + (startsInHours + 1) * HOUR),
  status: startsInHours < 0 ? 'done' : 'upcoming',
  extra: false,
  movedFrom: null,
  cancelReason: null,
  attendance: null,
  joinLink: null,
  joinFrom: null,
  ...extra,
});

describe('joinState', () => {
  const online = cls(1, { joinFrom: iso(NOW + 0.75 * HOUR), joinLink: null });

  it('shows nothing for in-person, cancelled or finished classes', () => {
    expect(joinState(online, 'offline', NOW)).toEqual({ kind: 'none' });
    expect(joinState({ ...online, status: 'cancelled' }, 'online', NOW)).toEqual({ kind: 'none' });
    expect(joinState(online, 'online', NOW + 3 * HOUR)).toEqual({ kind: 'none' });
  });

  it('says when joining opens, then gives the link', () => {
    expect(joinState(online, 'online', NOW)).toEqual({ kind: 'later', opensAt: online.joinFrom });
    expect(joinState({ ...online, joinLink: 'https://meet.example/x' }, 'online', NOW + 0.8 * HOUR)).toEqual({ kind: 'open', link: 'https://meet.example/x' });
  });

  it('asks for the link again when it is time but the copy on screen has none', () => {
    expect(joinState(online, 'online', NOW + 0.8 * HOUR)).toEqual({ kind: 'open', link: null });
  });
});

describe('certificateProgress', () => {
  const order = (attended: number, needed = 75): Pick<CoachingOrder, 'classes' | 'attendance'> => ({
    classes: [-5, -4, -3, -2, -1, 1, 2, 3, 4].map((h) => cls(h)).concat(cls(5, { status: 'cancelled' })),
    attendance: { attended, held: 5, percent: percentOf(attended, 5), needed },
  });

  it('counts the classes still needed out of those not cancelled', () => {
    expect(certificateProgress(order(3), NOW)).toEqual({ total: 9, required: 7, more: 4, left: 4, reachable: true });
  });

  it('says when it can no longer be reached, and when enough are done', () => {
    expect(certificateProgress(order(2), NOW).reachable).toBe(false);
    expect(certificateProgress(order(5, 50), NOW).more).toBe(0);
  });

  it('words it for the parent', () => {
    expect(certificateLine(certificateProgress(order(3), NOW), 75)).toBe('4 more classes to reach 75% for the certificate.');
    expect(certificateLine(certificateProgress(order(2), NOW), 75)).toContain("aren't enough classes left");
  });
});

describe('percentOf', () => {
  it('rounds and never divides by zero', () => {
    expect(percentOf(3, 4)).toBe(75);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(0, 0)).toBe(0);
  });
});

describe('cancelText', () => {
  const base = { status: 'confirmed', canCancel: true, cancelUntil: null, kind: 'batch', price: { items: 200000, discount: 0, platformFee: 0, total: 200000 } } as const;

  it('offers a full refund until the first class', () => {
    expect(cancelText(base)).toBe('Full refund, platform fee included, if you cancel before the first class.');
    expect(cancelText({ ...base, price: { ...base.price, items: 0, total: 0 } })).toBe('Cancel any time before the first class.');
  });

  it('says there are no refunds once classes start', () => {
    expect(cancelText({ ...base, canCancel: false })).toBe('Classes have started, so there are no refunds now.');
    expect(cancelText({ ...base, canCancel: false, kind: 'demo' })).toContain('demo class has started');
  });

  it('lets an unpaid place go', () => {
    expect(cancelText({ ...base, status: 'awaiting_payment' })).toContain('Not paid yet');
  });
});

describe('byDay', () => {
  const entry = (startsAt: string): TimetableEntry => ({
    orderId: startsAt,
    kind: 'batch',
    student: { childId: null, name: 'Asha' },
    course: { id: 'c1', title: 'Maths', mode: 'offline' },
    batchName: 'Evening',
    business: 'Bright Minds',
    class: { ...cls(0), startsAt },
  });

  it('groups classes by the day in India, in time order', () => {
    const days = byDay([entry('2026-11-16T20:00:00Z'), entry('2026-11-16T04:00:00Z'), entry('2026-11-16T10:00:00Z')]);
    expect(days.map((d) => d.day)).toEqual(['2026-11-16', '2026-11-17']);
    expect(days[0]!.entries.map((e) => e.orderId)).toEqual(['2026-11-16T04:00:00Z', '2026-11-16T10:00:00Z']);
  });
});
