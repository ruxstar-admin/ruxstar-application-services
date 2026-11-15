import type { VendorBatch } from '@/types/coaching';
import { batchChanges, batchDraftOf, batchErrors, draftPlan, emptyBatch, scheduleLocked, toBatchInput, type BatchDraft } from '../forms';

const RULES = { maxBatchSize: 100, maxClasses: 200 };
const TODAY = '2026-11-15';

const draft = (extra: Partial<BatchDraft> = {}): BatchDraft => ({
  ...emptyBatch('2026-11-16'),
  name: 'Evening',
  fee: '2000',
  slots: [{ day: 1, start: '17:00', minutes: 60 }],
  ...extra,
});

const batch: VendorBatch = {
  id: 'b1',
  name: 'Evening',
  fee: 200000,
  capacity: 20,
  seatsLeft: 20,
  slots: [{ day: 1, start: '17:00', minutes: 60 }],
  schedule: 'Mon 5–6 pm',
  startDate: '2026-11-16',
  firstAt: '2026-11-16T11:30:00.000Z',
  lastEndsAt: '2027-04-26T12:30:00.000Z',
  classes: 24,
  minStudents: null,
  enrolled: 0,
  coaches: [],
  status: 'open',
  cancelReason: null,
  held: 0,
  onlineLink: null,
  coachIds: [],
  minimumBy: null,
  certificatesAt: null,
  sales: 0,
};

describe('batchErrors', () => {
  it('passes a complete batch', () => {
    expect(batchErrors(draft(), RULES, 'offline', TODAY)).toEqual({});
  });

  it('needs a time on the grid, a start from today, and a number of classes', () => {
    const errors = batchErrors(draft({ slots: [], startDate: '2026-11-14', classes: '0' }), RULES, 'offline', TODAY);
    expect(Object.keys(errors).sort()).toEqual(['classes', 'slots', 'startDate']);
    expect(batchErrors(draft({ classes: '201' }), RULES, 'offline', TODAY).classes).toBe('Up to 200 classes');
  });

  it("skips the schedule once it's fixed", () => {
    expect(batchErrors(draft({ slots: [], startDate: '2026-01-01' }), RULES, 'offline', TODAY, 5, false)).toEqual({});
  });

  it('keeps seats at or above those taken, and the minimum within the seats', () => {
    expect(batchErrors(draft({ capacity: '4' }), RULES, 'offline', TODAY, 5).capacity).toBe('5 seats are taken already');
    expect(batchErrors(draft({ capacity: '10', minimum: '12' }), RULES, 'offline', TODAY).minimum).toBe('Can’t be more than the seats');
    expect(batchErrors(draft({ minimum: '1' }), RULES, 'offline', TODAY).minimum).toBeDefined();
    expect(batchErrors(draft({ capacity: '101' }), RULES, 'offline', TODAY).capacity).toBe('Up to 100 students');
  });

  it('needs a meeting link for online courses', () => {
    expect(batchErrors(draft(), RULES, 'online', TODAY).onlineLink).toBeDefined();
    expect(batchErrors(draft({ onlineLink: 'https://meet.example.com/abc' }), RULES, 'online', TODAY)).toEqual({});
  });
});

describe('batchErrors by end date', () => {
  const byDate = (endDate: string) => draft({ planBy: 'date', classes: '', endDate });

  it('passes a last day that gives some classes, whatever the number box says', () => {
    expect(batchErrors(byDate('2027-02-07'), RULES, 'offline', TODAY)).toEqual({});
  });

  it('needs a last day on or after the first, within a year', () => {
    expect(batchErrors(byDate(''), RULES, 'offline', TODAY).endDate).toBe('Pick the last day');
    expect(batchErrors(byDate('2026-11-15'), RULES, 'offline', TODAY).endDate).toBe('Can’t be before the first day');
    expect(batchErrors(byDate('2027-11-17'), RULES, 'offline', TODAY).endDate).toBe('A batch runs for up to a year');
  });

  it('refuses days with no class, or more classes than allowed', () => {
    expect(batchErrors(draft({ planBy: 'date', startDate: '2026-11-17', endDate: '2026-11-22' }), RULES, 'offline', TODAY).endDate).toBe(
      'No class falls between the first and last day',
    );
    expect(batchErrors(byDate('2027-02-07'), { ...RULES, maxClasses: 5 }, 'offline', TODAY).endDate).toBe('That gives more than 5 classes. Pick an earlier day.');
  });
});

describe('draftPlan', () => {
  it('plans a number of classes, or every class up to the last day', () => {
    expect(draftPlan(draft({ classes: '3' }), 200)).toHaveLength(3);
    const plan = draftPlan(draft({ planBy: 'date', endDate: '2026-11-30' }), 200);
    expect(plan.map((c) => c.day)).toEqual(['2026-11-16', '2026-11-23', '2026-11-30']);
  });

  it('stops one past the most, so the screen can say it is too many', () => {
    expect(draftPlan(draft({ planBy: 'date', endDate: '2027-11-15' }), 5)).toHaveLength(6);
  });
});

describe('toBatchInput', () => {
  it('sends paise, a number of classes and no end date', () => {
    expect(toBatchInput(draft({ minimum: '' }), 'offline')).toMatchObject({ fee: 200000, capacity: 20, minStudents: null, classes: 24, endDate: null, onlineLink: null });
  });

  it('sends the last day and no number when planned by end date', () => {
    expect(toBatchInput(draft({ planBy: 'date', endDate: '2027-02-07' }), 'offline')).toMatchObject({ classes: null, endDate: '2027-02-07' });
  });
});

describe('batchChanges', () => {
  it('sends only what changed', () => {
    expect(batchChanges(batchDraftOf(batch), batch, 'offline')).toEqual({});
    expect(batchChanges({ ...batchDraftOf(batch), name: 'Late evening' }, batch, 'offline')).toEqual({ name: 'Late evening' });
  });

  it('sends the days, times and dates together when any of them changes', () => {
    expect(batchChanges({ ...batchDraftOf(batch), classes: '30' }, batch, 'offline')).toEqual({
      slots: batch.slots,
      startDate: '2026-11-16',
      classes: 30,
      endDate: null,
    });
  });

  it('switching to an end date sends the schedule with the last day instead of a number', () => {
    expect(batchChanges({ ...batchDraftOf(batch), planBy: 'date', endDate: '2027-03-01' }, batch, 'offline')).toEqual({
      slots: batch.slots,
      startDate: '2026-11-16',
      classes: null,
      endDate: '2027-03-01',
    });
  });

  it('starts an edit by number of classes, with the last day the batch has now', () => {
    expect(batchDraftOf(batch)).toMatchObject({ planBy: 'count', classes: '24', endDate: '2027-04-26' });
  });
});

describe('scheduleLocked', () => {
  it('fixes the schedule once anyone holds or has a seat', () => {
    expect(scheduleLocked(null)).toBe(false);
    expect(scheduleLocked(batch)).toBe(false);
    expect(scheduleLocked({ ...batch, held: 1 })).toBe(true);
  });
});
