import { clockText, isPickable, keepSelection, rangeText, selectionSummary, toggleSlot, type Slot, type SlotState } from '../slots';

const slot = (start: string, end: string, state: SlotState = 'free', price = 80_000): Slot => ({ key: start, start, end, state, price });

// 6–7 pm … 10–11 pm, with 9 pm booked.
const evening: Slot[] = [
  slot('18:00', '19:00'),
  slot('19:00', '20:00', 'peak', 120_000),
  slot('20:00', '21:00', 'few'),
  slot('21:00', '22:00', 'booked'),
  slot('22:00', '23:00'),
];

describe('toggleSlot', () => {
  it('starts a selection on a free slot', () => {
    expect(toggleSlot(evening, [], '19:00')).toEqual(['19:00']);
  });

  it('extends forwards and backwards when the slot is next to the selection', () => {
    expect(toggleSlot(evening, ['19:00'], '20:00')).toEqual(['19:00', '20:00']);
    expect(toggleSlot(evening, ['19:00', '20:00'], '18:00')).toEqual(['18:00', '19:00', '20:00']);
  });

  it('starts again when the slot is not next to the selection', () => {
    expect(toggleSlot(evening, ['18:00'], '20:00')).toEqual(['20:00']);
    expect(toggleSlot(evening, ['18:00', '19:00'], '22:00')).toEqual(['22:00']);
  });

  it('shrinks from either end and clears the last one', () => {
    expect(toggleSlot(evening, ['18:00', '19:00', '20:00'], '18:00')).toEqual(['19:00', '20:00']);
    expect(toggleSlot(evening, ['18:00', '19:00', '20:00'], '20:00')).toEqual(['18:00', '19:00']);
    expect(toggleSlot(evening, ['19:00'], '19:00')).toEqual([]);
  });

  it('ends the selection at a middle slot', () => {
    expect(toggleSlot(evening, ['18:00', '19:00', '20:00'], '19:00')).toEqual(['18:00']);
  });

  it('ignores booked and blocked slots', () => {
    expect(toggleSlot(evening, ['20:00'], '21:00')).toEqual(['20:00']);
    expect(toggleSlot([slot('06:00', '07:00', 'blocked')], [], '06:00')).toEqual([]);
  });

  it('does not join slots with a gap between them', () => {
    const split = [slot('11:00', '12:00'), slot('16:00', '17:00')];
    expect(toggleSlot(split, ['11:00'], '16:00')).toEqual(['16:00']);
  });

  it('treats a midnight end as the end of the day', () => {
    const late = [slot('23:00', '00:00'), slot('00:00', '01:00')];
    expect(toggleSlot(late, ['23:00'], '00:00')).toEqual(['00:00']);
    const lateDay = [slot('22:00', '23:00'), slot('23:00', '24:00')];
    expect(toggleSlot(lateDay, ['22:00'], '23:00')).toEqual(['22:00', '23:00']);
  });
});

describe('keepSelection', () => {
  it('returns the same array when every slot is still free', () => {
    const selected = ['18:00', '19:00'];
    expect(keepSelection(evening, selected)).toBe(selected);
  });

  it('drops slots that were booked meanwhile, keeping the first run', () => {
    const now = evening.map((s) => (s.key === '19:00' ? { ...s, state: 'booked' as const } : s));
    expect(keepSelection(now, ['18:00', '19:00', '20:00'])).toEqual(['18:00']);
  });

  it('clears slots that are no longer on the day', () => {
    expect(keepSelection(evening, ['05:00'])).toEqual([]);
  });
});

describe('isPickable', () => {
  it('lets free, few-left and peak slots be picked', () => {
    expect(evening.map(isPickable)).toEqual([true, true, true, false, true]);
  });
});

describe('time text', () => {
  it('writes clock times plainly', () => {
    expect(clockText('07:00')).toBe('7 am');
    expect(clockText('19:30')).toBe('7:30 pm');
    expect(clockText('12:00')).toBe('12 pm');
    expect(clockText('00:00')).toBe('12 am');
    expect(clockText('24:00')).toBe('12 am');
  });

  it('shares am/pm in a range when both ends have it', () => {
    expect(rangeText('19:00', '21:00')).toBe('7–9 pm');
    expect(rangeText('11:00', '13:00')).toBe('11 am–1 pm');
    expect(rangeText('22:30', '23:30')).toBe('10:30–11:30 pm');
  });
});

describe('selectionSummary', () => {
  it('counts, totals and describes the picked slots', () => {
    expect(selectionSummary(evening, ['19:00', '20:00'])).toEqual({ count: 2, total: 200_000, text: '2 slots · 7–9 pm' });
    expect(selectionSummary(evening, ['18:00']).text).toBe('1 slot · 6–7 pm');
    expect(selectionSummary(evening, [])).toEqual({ count: 0, total: 0, text: '' });
  });
});
