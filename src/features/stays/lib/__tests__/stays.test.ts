import type { BedBoard, BoardBed, RoomAvailability, StayReservation } from '@/types/stays';
import { bedCell, bedLegend, bedMapModel, bedTotalsText, columnDay } from '../board';
import { filterCount, NO_FILTERS, toQuery, withStay } from '../filters';
import { emptyProperty, emptyRoom, priceErrors, propertyErrors, refundLimitsOf, roomErrors, toPrices, toPropertyInput, toRoomInput } from '../forms';
import { canTakeWhole, clampUnits, freeBeds, spotFree, spotTotal, stayPickOf, stayPrice, unitsOf } from '../reserve';
import { bedsText, foodText, forText, kmText, noticeText, priceFromText, rulesList, stayText, stayTimeline } from '../stays';

const rules = { maxMonths: 1, maxNights: 30 };

describe('reserving', () => {
  it('offers months first, and only the units a room is let by', () => {
    expect(unitsOf({ month: 800000, night: 60000 })).toEqual(['month', 'night']);
    expect(unitsOf({ month: null, night: 60000 })).toEqual(['night']);
  });

  it('keeps months and nights inside the rules', () => {
    expect(clampUnits(3, 'month', rules)).toBe(1);
    expect(clampUnits(0, 'night', rules)).toBe(1);
    expect(clampUnits(45, 'night', rules)).toBe(30);
    expect(clampUnits(4.7, 'night', rules)).toBe(4);
  });

  it('sends months only for a monthly stay and nights only for nights', () => {
    expect(stayPickOf('2026-12-01', 'month', 1, { kind: 'bed', bedId: 'b1' })).toEqual({ moveIn: '2026-12-01', stay: 'month', months: 1, bedId: 'b1' });
    expect(stayPickOf('2026-12-01', 'night', 3, { kind: 'whole' })).toEqual({ moveIn: '2026-12-01', stay: 'night', nights: 3, whole: true });
    expect(stayPickOf('2026-12-01', 'night', 2)).toEqual({ moveIn: '2026-12-01', stay: 'night', nights: 2 });
  });

  const room = (extra: Partial<RoomAvailability> = {}): RoomAvailability => ({
    id: 'r1',
    name: 'Room 1',
    kind: 'shared',
    status: 'live',
    beds: [
      { id: 'a', label: 'A', state: 'free' },
      { id: 'b', label: 'B', state: 'taken' },
      { id: 'c', label: 'C', state: 'closed' },
    ],
    bedTotal: 800000,
    roomTotal: null,
    ...extra,
  });

  it('finds free beds, and none in a paused room', () => {
    expect(freeBeds(room()).map((b) => b.id)).toEqual(['a']);
    expect(freeBeds(room({ status: 'paused' }))).toEqual([]);
  });

  it('prices a bed or the whole room', () => {
    expect(spotTotal(room(), { kind: 'bed', bedId: 'a' })).toBe(800000);
    expect(spotTotal(room({ roomTotal: 2400000 }), { kind: 'whole' })).toBe(2400000);
    expect(spotTotal(room({ kind: 'private', roomTotal: 1200000 }), { kind: 'whole' })).toBe(1200000);
    expect(spotTotal(room(), null)).toBeNull();
  });

  it('drops a pick that is no longer free', () => {
    expect(spotFree(room(), { kind: 'bed', bedId: 'a' })).toBe(true);
    expect(spotFree(room(), { kind: 'bed', bedId: 'b' })).toBe(false);
    expect(spotFree(room(), { kind: 'whole' })).toBe(false);
    expect(spotFree(room({ roomTotal: 2400000 }), { kind: 'whole' })).toBe(true);
    expect(spotFree(undefined, { kind: 'whole' })).toBe(false);
  });

  it('lets a shared room go whole only when the owner allows it', () => {
    expect(canTakeWhole({ kind: 'private', wholeRoom: false })).toBe(true);
    expect(canTakeWhole({ kind: 'shared', wholeRoom: false })).toBe(false);
  });

  it('takes the coupon off the stay and adds the fee once', () => {
    expect(stayPrice(800000, 2000)).toEqual({ items: 800000, discount: 0, fee: 2000, total: 802000 });
    expect(stayPrice(800000, 2000, 50000).total).toBe(752000);
    expect(stayPrice(800000, 2000, 900000)).toMatchObject({ discount: 800000, total: 2000 });
    expect(stayPrice(0, 2000)).toMatchObject({ fee: 0, total: 0 });
  });
});

describe('search filters', () => {
  it('sends only what is set, budgets in paise and lists as sorted csv', () => {
    const f = { ...NO_FILTERS, for: 'women' as const, budget: 10000, facilities: ['wifi', 'ac'], meals: ['dinner' as const, 'breakfast' as const], allows: ['guests' as const] };
    expect(toQuery(f, { q: ' Sunrise ', city: 'Pune', area: 'a', near: '' })).toEqual({
      q: 'Sunrise',
      city: 'Pune',
      for: 'women',
      priceMax: 1000000,
      facilities: 'ac,wifi',
      meals: 'breakfast,dinner',
      allows: 'guests',
    });
    expect(toQuery(NO_FILTERS)).toEqual({});
  });

  it('counts the filters that are set', () => {
    expect(filterCount(NO_FILTERS)).toBe(0);
    expect(filterCount({ ...NO_FILTERS, kind: 'pg', noticeMax: 0, facilities: ['wifi', 'ac'] })).toBe(4);
  });

  it('drops a monthly budget when switching to nights', () => {
    expect(withStay({ ...NO_FILTERS, budget: 10000 }, 'night').budget).toBeNull();
    expect(withStay({ ...NO_FILTERS, budget: 1000 }, 'night').budget).toBe(1000);
    expect(withStay({ ...NO_FILTERS, budget: 10000 }, 'month').budget).toBe(10000);
  });
});

const reservation = (extra: Partial<StayReservation> = {}) =>
  ({
    status: 'confirmed',
    moveIn: '2026-12-01',
    movedInAt: null,
    objectionUntil: null,
    objection: null,
    moveOut: null,
    stay: 'month',
    units: 1,
    payBy: null,
    ...extra,
  }) as StayReservation;

describe('stay timeline', () => {
  const now = Date.parse('2026-12-01T12:00:00+05:30');

  it('asks an unpaid reservation to pay', () => {
    const steps = stayTimeline(reservation({ status: 'awaiting_payment', payBy: '2026-12-01T07:00:00Z' }), now);
    expect(steps.map((s) => s.state)).toEqual(['now', 'todo', 'todo', 'todo']);
  });

  it('waits for move-in once paid', () => {
    expect(stayTimeline(reservation(), now).map((s) => s.state)).toEqual(['done', 'now', 'todo', 'todo']);
  });

  it('opens the check window after moving in, then settles', () => {
    const moved = { status: 'moved_in' as const, movedInAt: '2026-12-01T05:00:00Z', objectionUntil: '2026-12-02T05:00:00Z' };
    expect(stayTimeline(reservation(moved), now).map((s) => s.state)).toEqual(['done', 'done', 'now', 'todo']);
    expect(stayTimeline(reservation(moved), Date.parse('2026-12-03T00:00:00Z')).map((s) => s.state)).toEqual(['done', 'done', 'done', 'done']);
  });

  it('flags an open objection and keeps the stay from settling', () => {
    const r = reservation({
      status: 'moved_in',
      movedInAt: '2026-12-01T05:00:00Z',
      objectionUntil: '2026-12-02T05:00:00Z',
      objection: { reason: 'No water', at: '2026-12-01T06:00:00Z', status: 'open', note: null, resolvedAt: null },
    });
    const steps = stayTimeline(r, Date.parse('2026-12-03T00:00:00Z'));
    expect(steps[2]).toMatchObject({ state: 'problem' });
    expect(steps[3]).toMatchObject({ state: 'todo' });
  });

  it('shows the checkout day for nights and the move-out day once set', () => {
    expect(stayTimeline(reservation({ stay: 'night', units: 3 }), now)[3]?.detail).toBe('Check out Fri 4 Dec');
    expect(stayTimeline(reservation({ moveOut: { on: '2027-01-15', kind: 'notice', by: 'tenant' } }), now)[3]?.detail).toBe('Moving out Fri 15 Jan');
  });

  it('talks to the owner differently', () => {
    expect(stayTimeline(reservation(), now, true)[1]?.detail).toContain('Tap Moved in');
  });
});

describe('words', () => {
  it('describes prices, food, who and notice', () => {
    expect(priceFromText({ month: 800000, night: null })).toBe('From ₹8,000 a month');
    expect(priceFromText({ month: null, night: null })).toBe('Full right now');
    expect(foodText({ type: 'veg', meals: ['dinner', 'breakfast'] })).toBe('Veg food · breakfast and dinner included');
    expect(foodText({ type: 'none', meals: [] })).toBe('No food');
    expect(forText('women', ['students', 'working'])).toBe('Women only · students and working people');
    expect(noticeText(30)).toBe('30 days’ notice to move out');
    expect(noticeText(0)).toBe('No notice period');
    expect(kmText(0.4)).toBe('400 m');
    expect(kmText(2.25)).toBe('2.3 km');
  });

  it('describes the stay and the beds', () => {
    expect(stayText({ stay: 'night', units: 2, moveIn: '2026-12-30' })).toBe('Wed 30 Dec – Fri 1 Jan · 2 nights');
    expect(stayText({ stay: 'month', units: 1, moveIn: '2026-12-01' })).toBe('From Tue 1 Dec · 1 month paid');
    expect(bedsText({ whole: false, beds: [{ label: 'B' }], room: { name: 'Room 2', kind: 'shared' } })).toBe('Room 2 · bed B');
    expect(bedsText({ whole: false, beds: [{ label: 'A' }], room: { name: 'Suite', kind: 'private' } })).toBe('Suite · whole room');
  });

  it('lists the house rules with the entry time first', () => {
    const list = rulesList({ curfew: '22:30', guests: true, smoking: false, alcohol: false, pets: false, notes: null });
    expect(list[0]).toEqual({ text: 'Be in by 10:30 pm', ok: false });
    expect(list[1]).toEqual({ text: 'Guests allowed', ok: true });
  });
});

const bed = (id: string, label: string, extra: Partial<BoardBed> = {}): BoardBed => ({ id, label, status: 'open', state: 'free', reservation: null, next: null, ...extra });
const board = (date: string, beds: BoardBed[]): BedBoard => ({
  property: { id: 'p1', name: 'Sunrise PG' },
  date,
  rooms: [{ id: 'r1', name: 'Room 1', kind: 'shared', status: 'live', prices: { month: 800000, night: null }, beds }],
  totals: { beds: 2, free: 1, held: 0, reserved: 0, occupied: 1, closed: 0 },
});
const tenant = (name: string) => ({ id: 'o1', orderNo: 80000001, tenantName: name, status: 'moved_in' as const, moveIn: '2026-12-01', until: null });

describe('bed map', () => {
  it('labels days short enough for a column', () => {
    expect(columnDay('2026-11-21')).toBe('Sat 21');
  });

  it('shows tenants, payers and full beds', () => {
    expect(bedCell({ state: 'occupied', reservation: tenant('Ravi Kumar') })).toEqual({ state: 'booked', label: '✓ Ravi' });
    expect(bedCell({ state: 'reserved', reservation: tenant('Asha') })).toEqual({ state: 'booked', label: 'Asha' });
    expect(bedCell({ state: 'held', reservation: null })).toEqual({ state: 'held', label: 'Paying' });
    expect(bedCell({ state: 'closed', reservation: null })).toEqual({ state: 'blocked', label: 'Full' });
    expect(bedCell({ state: 'free', reservation: null })).toEqual({ state: 'free' });
  });

  it('puts beds down the side and days across', () => {
    const model = bedMapModel([
      board('2026-12-01', [bed('a', 'A', { state: 'occupied', reservation: tenant('Ravi') }), bed('b', 'B')]),
      board('2026-12-02', [bed('a', 'A'), bed('b', 'B', { state: 'closed', status: 'closed' })]),
    ]);
    expect(model.rows.map((r) => `${r.label}/${r.subtitle}`)).toEqual(['Room 1/Bed A', 'Room 1/Bed B']);
    expect(model.columns.map((c) => c.label)).toEqual(['Tue 1', 'Wed 2']);
    expect(model.cells['a|2026-12-01']).toEqual({ state: 'booked', label: '✓ Ravi' });
    expect(model.cells['b|2026-12-02']).toEqual({ state: 'blocked', label: 'Full' });
    expect(model.at['b|2026-12-02']?.date).toBe('2026-12-02');
    expect(bedLegend(model.cells)).toEqual(['free', 'booked', 'blocked']);
  });

  it('is empty without days', () => {
    expect(bedMapModel([])).toEqual({ rows: [], columns: [], cells: {}, at: {} });
  });

  it('sums up the day', () => {
    expect(bedTotalsText({ beds: 12, free: 3, held: 0, reserved: 2, occupied: 5, closed: 1 })).toBe('12 beds · 3 free · 5 moved in · 2 reserved · 1 marked full');
  });
});

describe('owner forms', () => {
  const limits = { min: 3, max: 30 };

  it('lets a new property pick from Ruxstar’s refund days to the most it allows', () => {
    expect(refundLimitsOf({ refundDays: 3, maxRefundDays: 30 })).toEqual({ min: 3, max: 30 });
    expect(refundLimitsOf({ refundDays: 7, maxRefundDays: 5 })).toEqual({ min: 7, max: 7 });
  });

  it('asks for a name, address and city', () => {
    const e = propertyErrors(emptyProperty({ refundDays: 3 }), limits);
    expect(Object.keys(e).sort()).toEqual(['city', 'line', 'name']);
  });

  it('checks the refund days, deposit and nearby places', () => {
    const d = { ...emptyProperty({ refundDays: 3 }, 'Pune'), name: 'Sunrise PG', line: '12 MG Road', refundDays: 1, deposit: 'abc', nearby: [{ kind: 'college' as const, name: 'COEP', km: '' }] };
    const e = propertyErrors(d, limits);
    expect(e.refund).toBe('Pick from 3 to 30 days.');
    expect(e.deposit).toBeDefined();
    expect(e.nearby).toContain('Place 1');
  });

  it('builds the property body, with no meals when there is no food', () => {
    const d = { ...emptyProperty({ refundDays: 3 }, 'Pune'), name: ' Sunrise PG ', line: '12 MG Road', deposit: '15,000', meals: ['dinner' as const], nearby: [{ kind: 'metro' as const, name: 'PCMC', km: '1.5' }] };
    const input = toPropertyInput(d);
    expect(input).toMatchObject({ name: 'Sunrise PG', deposit: { amount: 1500000, note: null }, food: { type: 'none', meals: [] }, nearby: [{ kind: 'metro', name: 'PCMC', km: 1.5 }] });
    expect(input.address).toEqual({ line: '12 MG Road', area: null, city: 'Pune', pincode: null });
  });

  it('needs at least one room price, each from ₹1', () => {
    expect(priceErrors({ month: '', night: '' }).prices).toBeDefined();
    expect(priceErrors({ month: '0.5', night: '' }).month).toBe('From ₹1 to ₹5,00,000');
    expect(priceErrors({ month: '8000', night: '' })).toEqual({});
    expect(toPrices({ month: '8,000', night: '' })).toEqual({ month: 800000, night: null });
  });

  it('checks beds against the rules and sends whole-room only for shared rooms', () => {
    expect(roomErrors({ ...emptyRoom(1), beds: 20, month: '8000' }, { maxBeds: 12 }).beds).toBe('From 1 to 12 beds.');
    expect(toRoomInput({ ...emptyRoom(1), month: '8000' })).toMatchObject({ name: 'Room 1', kind: 'shared', wholeRoom: true, status: 'live' });
    expect(toRoomInput({ ...emptyRoom(1), kind: 'private', night: '900' })).not.toHaveProperty('wholeRoom');
  });
});
