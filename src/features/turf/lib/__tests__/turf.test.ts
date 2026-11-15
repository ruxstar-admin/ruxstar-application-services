import { money } from '@/features/vendor/lib/pod';
import type { AddOn, Board, BoardSlot, DaySlot, DaySlots } from '@/types/turf';
import { boardLegend, boardModel, cellOf, totalsText } from '../board';
import { courtDraftOf, courtErrors, emptyCourt, groundErrors, emptyGround, hasCourtErrors, toCourtInput } from '../forms';
import { turfPrice, pickedAddOns } from '../price';
import { plusDays, repeatDays, weekLines, weekProblem } from '../repeat';
import { arrivalChoices, closedWeekdays, daysText, deskCan, hoursText, priceLines, refundTiers, slotsOf, sportKeyOf } from '../turf';

const daySlot = (start: string, end: string, extra: Partial<DaySlot> = {}): DaySlot => ({
  startAt: `2026-11-21T${start}:00+05:30`,
  endAt: `2026-11-21T${end}:00+05:30`,
  start,
  end,
  price: 80000,
  peak: false,
  state: 'free',
  ...extra,
});

const day = (slots: DaySlot[], extra: Partial<DaySlots> = {}): DaySlots => ({
  court: { id: 'c1', name: 'Court 1', slotMinutes: 60, status: 'live' },
  date: '2026-11-21',
  open: true,
  bookable: true,
  slots,
  ...extra,
});

describe('repeat weekly', () => {
  it('steps a week at a time across months and years', () => {
    expect(plusDays('2026-11-28', 7)).toBe('2026-12-05');
    expect(repeatDays('2026-12-26', 3)).toEqual(['2026-12-26', '2027-01-02', '2027-01-09']);
    expect(repeatDays('2026-11-21', 0)).toEqual(['2026-11-21']);
  });

  it('says what stops a later week: closed, not open then, booked or blocked', () => {
    const starts = ['19:00', '20:00'];
    expect(weekProblem(day([daySlot('19:00', '20:00'), daySlot('20:00', '21:00')]), starts)).toBeNull();
    expect(weekProblem(day([], { open: false }), starts)).toBe('The court is closed that day');
    expect(weekProblem(day([daySlot('19:00', '20:00')]), starts)).toBe('The court isn’t open at these times');
    expect(weekProblem(day([daySlot('19:00', '20:00'), daySlot('20:00', '21:00', { state: 'booked' })]), starts)).toBe('8–9 pm is already booked');
    expect(weekProblem(day([daySlot('19:00', '20:00', { state: 'blocked' })]), starts)).toBe('7–8 pm is blocked by the ground');
  });

  it('ignores how far ahead a later week is', () => {
    expect(weekProblem(day([daySlot('19:00', '20:00')], { bookable: false }), ['19:00'])).toBeNull();
  });

  it('lists each week, checking the ones not loaded yet', () => {
    const lines = weekLines('2026-11-21', 3, ['19:00'], { '2026-11-28': day([daySlot('19:00', '20:00', { state: 'booked' })]) });
    expect(lines).toEqual([
      { n: 1, day: '2026-11-21', problem: null, checking: false },
      { n: 2, day: '2026-11-28', problem: '7–8 pm is already booked', checking: false },
      { n: 3, day: '2026-12-05', problem: null, checking: true },
    ]);
  });
});

describe('turfPrice', () => {
  const addOns: AddOn[] = [
    { id: 'ball', name: 'Ball', price: 5000, per: 'booking' },
    { id: 'bibs', name: 'Bibs', price: 2000, per: 'slot' },
  ];

  it('adds slots and add-ons per date, times the weeks, with the fee once', () => {
    const price = turfPrice({ slotPrices: [80000, 120000], addOns, counts: { ball: 1, bibs: 2 }, weeks: 3, platformFee: 1000 });
    // Per date: 2,000 slots + 50 ball + 20 × 2 × 2 bibs = 2,130.
    expect(price).toEqual({ slots: 200000, extras: 13000, perDate: 213000, weeks: 3, items: 639000, discount: 0, fee: 1000, total: 640000 });
  });

  it('takes the coupon off the items, never below nothing', () => {
    expect(turfPrice({ slotPrices: [80000], addOns, counts: {}, weeks: 1, platformFee: 1000, discount: 20000 }).total).toBe(61000);
    expect(turfPrice({ slotPrices: [80000], addOns, counts: {}, weeks: 1, platformFee: 1000, discount: 900000 }).total).toBe(1000);
  });

  it('charges nothing with no slots picked', () => {
    expect(turfPrice({ slotPrices: [], addOns, counts: { ball: 2 }, weeks: 2, platformFee: 1000 }).total).toBe(0);
  });

  it('sends only add-ons with a quantity', () => {
    expect(pickedAddOns({ ball: 1, bibs: 0 })).toEqual([{ id: 'ball', quantity: 1 }]);
  });
});

const boardSlot = (start: string, end: string, extra: Partial<BoardSlot> = {}): BoardSlot => ({
  startAt: `2026-11-21T${start}:00+05:30`,
  endAt: `2026-11-21T${end}:00+05:30`,
  start,
  end,
  price: 80000,
  peak: false,
  past: false,
  state: 'free',
  booking: null,
  block: null,
  ...extra,
});

describe('boardModel', () => {
  const booking = { id: 'b1', orderNo: 70000001, n: 1, weeks: 1, customerName: 'Ravi Kumar', customerPhone: '9999999999', status: 'confirmed', arrival: null, startAt: '', endAt: '' } as const;
  const board: Board = {
    ground: { id: 'g1', name: 'Arena' },
    date: '2026-11-21',
    courts: [
      {
        id: 'c1',
        name: 'Court 1',
        slotMinutes: 60,
        status: 'live',
        open: true,
        slots: [boardSlot('18:00', '19:00', { past: true }), boardSlot('19:00', '20:00', { state: 'booked', booking }), boardSlot('20:00', '21:00', { peak: true, price: 120000 })],
      },
      { id: 'c2', name: 'Nets', slotMinutes: 90, status: 'paused', open: true, slots: [boardSlot('18:30', '20:00', { state: 'blocked', block: { note: 'Repairs today', by: null } })] },
    ],
    totals: { booked: 1, blocked: 1, free: 1, arrived: 0, noShow: 0 },
  };
  const model = boardModel(board);

  it('puts every start of any court across the top, in time order', () => {
    expect(model.columns.map((c) => c.key)).toEqual(['18:00', '18:30', '19:00', '20:00']);
    expect(model.columns[1]!.label).toBe('6:30 pm');
    expect(model.rows).toEqual([
      { key: 'c1', label: 'Court 1', subtitle: '1 hour' },
      { key: 'c2', label: 'Nets', subtitle: '1½ hours · Paused' },
    ]);
  });

  it('labels a slot where it starts and fills the rest of a longer slot', () => {
    expect(model.cells['c1|18:00']).toEqual({ state: 'past' });
    expect(model.cells['c1|18:30']).toEqual({ state: 'past' });
    expect(model.cells['c1|19:00']).toEqual({ state: 'booked', label: 'Ravi' });
    expect(model.cells['c1|20:00']).toEqual({ state: 'peak', label: money(120000) });
    expect(model.cells['c2|18:00']).toEqual({ state: 'closed' });
    expect(model.cells['c2|18:30']).toEqual({ state: 'blocked', label: 'Repairs' });
    expect(model.cells['c2|19:00']).toEqual({ state: 'blocked' });
    expect(model.cells['c2|20:00']).toEqual({ state: 'closed' });
    expect(model.slotAt['c2|19:00']!.slot.start).toBe('18:30');
    expect(model.slotAt['c2|20:00']).toBeUndefined();
  });

  it('marks arrivals and slots being paid for', () => {
    expect(cellOf(boardSlot('19:00', '20:00', { state: 'booked', booking: { ...booking, arrival: 'arrived' } })).label).toBe('✓ Ravi');
    expect(cellOf(boardSlot('19:00', '20:00', { state: 'booked', booking: { ...booking, arrival: 'no_show' } })).label).toBe('✗ Ravi');
    expect(cellOf(boardSlot('19:00', '20:00', { state: 'held' }))).toEqual({ state: 'held', label: 'Paying' });
    expect(cellOf(boardSlot('19:00', '20:00', { state: 'blocked', block: { note: null, by: null } })).label).toBe('Block');
  });

  it('keys only the states on the board, and sums the day', () => {
    expect(boardLegend(model.cells)).toEqual(['peak', 'booked', 'blocked', 'past', 'closed']);
    expect(totalsText(board.totals)).toBe('1 booked · 1 free · 1 blocked');
  });
});

describe('ground and court text', () => {
  it('groups opening hours by the same times', () => {
    const hours = [1, 2, 3, 4, 5].map((d) => ({ day: d, open: '06:00', close: '23:00' })).concat([0, 6].map((d) => ({ day: d, open: '05:00', close: '24:00' })));
    expect(hoursText(hours)).toBe('Mon–Fri 6 am–11 pm · Sat, Sun 5 am–midnight');
    expect(hoursText([])).toBe('Closed every day');
    expect(daysText([0, 1, 2, 3, 4, 5, 6])).toBe('Every day');
    expect(daysText([1, 3, 5])).toBe('Mon, Wed, Fri');
    expect(closedWeekdays(hours.slice(0, 5))).toEqual([0, 6]);
  });

  it('lists base, weekend and peak prices', () => {
    const lines = priceLines({ slotMinutes: 60, prices: { base: 80000, weekend: 100000, peak: [{ days: [1, 2, 3, 4, 5], start: '18:00', end: '22:00', price: 120000 }] } });
    expect(lines).toEqual([`${money(80000)} per 1 hour slot`, `${money(100000)} on Sat and Sun`, `${money(120000)} at peak: Mon–Fri 6–10 pm`]);
  });

  it('turns the ground’s refund hours into tiers', () => {
    expect(refundTiers({ fullHours: 6, halfHours: 2, halfPercent: 50 })).toEqual([
      { hoursBefore: 6, percent: 100 },
      { hoursBefore: 2, percent: 50 },
    ]);
    expect(refundTiers({ fullHours: 6, halfHours: 6, halfPercent: 50 })).toEqual([{ hoursBefore: 6, percent: 100 }]);
  });

  it('shows peak slots as peak and hides a closed day', () => {
    expect(slotsOf(day([daySlot('19:00', '20:00', { peak: true }), daySlot('20:00', '21:00', { state: 'booked' })])).map((s) => s.state)).toEqual(['peak', 'booked']);
    expect(slotsOf(day([daySlot('19:00', '20:00')], { open: false }))).toEqual([]);
  });
});

describe('forms', () => {
  const rules = { refundFullHours: 6, refundHalfHours: 2, minFullHours: 2, maxFullHours: 72, maxAddOns: 2 };

  it('checks the ground', () => {
    const draft = { ...emptyGround(rules, 'Hyderabad'), name: 'Arena', address: '12 Lake Road' };
    expect(groundErrors(draft, rules)).toEqual({});
    expect(groundErrors({ ...draft, pincode: '0123', fullHours: 1 }, rules)).toEqual({ pincode: 'A pincode is 6 digits.', refunds: 'The full refund can be from 2 to 72 hours before.' });
  });

  it('checks a court and builds what the API takes', () => {
    const draft = { ...emptyCourt(1), sports: ['football'], base: '800', hours: emptyCourt(1).hours.map((h, d) => (d === 0 ? { ...h, open: false } : h)) };
    expect(hasCourtErrors(courtErrors(draft, rules))).toBe(false);
    const input = toCourtInput({ ...draft, peaks: [{ days: [5, 1], start: '18:00', end: '22:00', price: '1,200' }], addOns: [{ name: 'Ball', price: '50', per: 'booking' }] });
    expect(input.hours).toHaveLength(6);
    expect(input.prices).toEqual({ base: 80000, weekend: null, peak: [{ days: [1, 5], start: '18:00', end: '22:00', price: 120000 }] });
    expect(input.addOns).toEqual([{ name: 'Ball', price: 5000, per: 'booking' }]);
    expect(input.status).toBe('live');
  });

  it('catches overlapping peaks, short days and too many add-ons', () => {
    const draft = {
      ...emptyCourt(1),
      sports: ['football'],
      base: '800',
      slotMinutes: 90 as const,
      hours: emptyCourt(1).hours.map((h, d) => (d === 1 ? { ...h, from: '22:00', to: '23:00' } : h)),
      peaks: [
        { days: [1], start: '18:00', end: '21:00', price: '1000' },
        { days: [1, 2], start: '20:00', end: '22:00', price: '1000' },
      ],
      addOns: [
        { name: 'Ball', price: '50', per: 'booking' as const },
        { name: 'ball', price: '50', per: 'booking' as const },
        { name: 'Bibs', price: '20', per: 'slot' as const },
      ],
    };
    const e = courtErrors(draft, rules);
    expect(e.hours).toBe('Each open day needs room for at least one slot.');
    expect(e.peaks).toEqual({ 1: 'This overlaps another peak time.' });
    expect(e.addOns).toEqual({ 1: 'Another add-on has this name.' });
    expect(e.more).toBe('Add up to 2 add-ons.');
  });

  it('reads a saved court back into the form', () => {
    const draft = courtDraftOf({
      id: 'c1',
      name: 'Court 1',
      sports: [{ key: 'football', name: 'Football' }],
      slotMinutes: 60,
      hours: [{ day: 6, open: '05:00', close: '24:00' }],
      prices: { base: 80000, weekend: null, peak: [] },
      addOns: [{ id: 'a1', name: 'Ball', price: 5000, per: 'booking' }],
      status: 'paused',
    });
    expect(draft.hours[6]).toEqual({ open: true, from: '05:00', to: '24:00' });
    expect(draft.hours[0]!.open).toBe(false);
    expect(draft.base).toBe('800');
    expect(draft.addOns[0]).toEqual({ id: 'a1', name: 'Ball', price: '50', per: 'booking' });
    expect(draft.paused).toBe(true);
  });
});

describe('the desk', () => {
  const date = { startAt: '2026-11-21T19:00:00+05:30', endAt: '2026-11-21T20:00:00+05:30', status: 'booked' as const };
  const at = (iso: string) => Date.parse(iso);

  it('offers arrived from 30 minutes before, no-show from the start, until a day after', () => {
    expect(arrivalChoices(date, at('2026-11-21T18:20:00+05:30'))).toEqual({ arrived: false, noShow: false });
    expect(arrivalChoices(date, at('2026-11-21T18:30:00+05:30'))).toEqual({ arrived: true, noShow: false });
    expect(arrivalChoices(date, at('2026-11-21T19:05:00+05:30'))).toEqual({ arrived: true, noShow: true });
    expect(arrivalChoices(date, at('2026-11-22T19:59:00+05:30'))).toEqual({ arrived: true, noShow: true });
    expect(arrivalChoices(date, at('2026-11-22T20:01:00+05:30'))).toEqual({ arrived: false, noShow: false });
    expect(arrivalChoices({ ...date, status: 'cancelled' }, at('2026-11-21T19:05:00+05:30'))).toEqual({ arrived: false, noShow: false });
  });

  it('lets the owner do everything and staff only what they were given', () => {
    expect(deskCan({ owner: true, permissions: [] }, 'turf.cancel')).toBe(true);
    expect(deskCan({ owner: false, permissions: ['turf.bookings'] }, 'turf.cancel')).toBe(false);
    expect(deskCan({ owner: false, permissions: ['turf.cancel'] }, 'turf.cancel')).toBe(true);
    expect(deskCan(null, 'turf.cancel')).toBe(false);
  });

  it('makes a sport key from its name', () => {
    expect(sportKeyOf('Box Cricket')).toBe('box_cricket');
    expect(sportKeyOf('  5-a-side Football! ')).toBe('a_side_football');
    expect(sportKeyOf('Table tennis (TT)')).toBe('table_tennis_tt');
  });
});
