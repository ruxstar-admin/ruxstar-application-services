import { paiseOf } from '@/features/events/lib/events';
import { istDayKey } from '@/lib/booking/days';
import type { BatchInput, CoachingRules, CourseCategory, CourseInput, CourseMode, Slot, VendorBatch, VendorCourse } from '@/types/coaching';
import { addDay, planClasses, slotClash, sortSlots } from './schedule';

const whole = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : null);
const rupees = (paise: number) => String(paise / 100);

// A course.

export interface CourseDraft {
  title: string;
  description: string;
  category: CourseCategory;
  mode: CourseMode;
  venueName: string;
  address: string;
  city: string;
  demo: boolean;
  /** Rupees as typed; 0 is free. */
  demoFee: string;
  demoSeats: string;
  certificatePercent: string;
}

export const emptyCourse = (rules: Pick<CoachingRules, 'certificatePercent'> | null, city = ''): CourseDraft => ({
  title: '',
  description: '',
  category: 'tuition',
  mode: 'offline',
  venueName: '',
  address: '',
  city,
  demo: false,
  demoFee: '0',
  demoSeats: '5',
  certificatePercent: String(rules?.certificatePercent ?? 75),
});

export const courseDraftOf = (course: VendorCourse): CourseDraft => ({
  title: course.title,
  description: course.description ?? '',
  category: course.category,
  mode: course.mode,
  venueName: course.venue?.name ?? '',
  address: course.venue?.address ?? '',
  city: course.venue?.city ?? '',
  demo: !!course.demo,
  demoFee: course.demo ? rupees(course.demo.fee) : '0',
  demoSeats: String(course.demoSeats ?? 5),
  certificatePercent: String(course.certificatePercent),
});

/** What's wrong with a course, by field. */
export function courseErrors(draft: CourseDraft, rules: Pick<CoachingRules, 'maxDemoFee' | 'maxDemoSeats'>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (draft.title.trim().length < 3) errors.title = 'At least 3 letters, like “Class 10 Maths”';
  if (draft.description.trim().length > 2000) errors.description = 'Up to 2,000 letters';
  if (draft.mode === 'offline') {
    if (draft.venueName.trim().length < 2) errors.venueName = 'The centre’s name';
    if (draft.address.trim().length < 5) errors.address = 'Street and area, so parents can find it';
    if (draft.city.trim().length < 2) errors.city = 'The city';
  }
  if (draft.demo) {
    const fee = paiseOf(draft.demoFee);
    if (fee === null) errors.demoFee = 'Rupees, or 0 for a free demo';
    else if (fee > rules.maxDemoFee) errors.demoFee = `Up to ₹${rules.maxDemoFee / 100}`;
    const seats = whole(draft.demoSeats);
    if (!seats || seats < 1) errors.demoSeats = 'At least 1';
    else if (seats > rules.maxDemoSeats) errors.demoSeats = `Up to ${rules.maxDemoSeats}`;
  }
  const percent = whole(draft.certificatePercent);
  if (!percent || percent < 1 || percent > 100) errors.certificatePercent = '1 to 100';
  return errors;
}

export const toCourseInput = (draft: CourseDraft): CourseInput => ({
  title: draft.title.trim(),
  description: draft.description.trim() || null,
  category: draft.category,
  mode: draft.mode,
  venue: draft.mode === 'offline' ? { name: draft.venueName.trim(), address: draft.address.trim(), city: draft.city.trim() } : null,
  demo: draft.demo ? { fee: paiseOf(draft.demoFee) ?? 0, seats: Number(draft.demoSeats) } : null,
  certificatePercent: Number(draft.certificatePercent),
});

// A batch.

export interface BatchDraft {
  name: string;
  /** Rupees as typed. */
  fee: string;
  capacity: string;
  /** Empty: no minimum. */
  minimum: string;
  slots: Slot[];
  /** Length for new classes on the grid. */
  minutes: number;
  startDate: string;
  /** How the batch ends: after a number of classes, or on a last day. */
  planBy: PlanBy;
  classes: string;
  endDate: string;
  onlineLink: string;
  coachIds: string[];
}

export type PlanBy = 'count' | 'date';
/** A new batch's last day starts 12 weeks on from its first. */
const DEFAULT_WEEKS = 12;
/** A batch runs for up to a year from its first day. */
const MAX_RUN_DAYS = 365;

export const emptyBatch = (startDate: string): BatchDraft => ({
  name: '',
  fee: '',
  capacity: '20',
  minimum: '',
  slots: [],
  minutes: 60,
  startDate,
  planBy: 'count',
  classes: '24',
  endDate: addDay(startDate, DEFAULT_WEEKS * 7 - 1),
  onlineLink: 'https://',
  coachIds: [],
});

/** The classes the draft's timetable gives. By a last day, up to one past `max` so the screen can say it's too many. */
export const draftPlan = (draft: Pick<BatchDraft, 'slots' | 'startDate' | 'planBy' | 'classes' | 'endDate'>, max: number) =>
  draft.planBy === 'count'
    ? planClasses(draft.slots, draft.startDate, Math.min(whole(draft.classes) ?? 0, max))
    : planClasses(draft.slots, draft.startDate, max + 1, draft.endDate || draft.startDate);

export const batchDraftOf = (batch: VendorBatch): BatchDraft => ({
  name: batch.name,
  fee: rupees(batch.fee),
  capacity: String(batch.capacity),
  minimum: batch.minStudents ? String(batch.minStudents) : '',
  slots: sortSlots(batch.slots),
  minutes: batch.slots[0]?.minutes ?? 60,
  startDate: batch.startDate,
  planBy: 'count',
  classes: String(batch.classes),
  endDate: istDayKey(Date.parse(batch.lastEndsAt)),
  onlineLink: batch.onlineLink ?? 'https://',
  coachIds: batch.coachIds,
});

/** Once anyone has a seat, the days, times and dates stay as they are. */
export const scheduleLocked = (batch: Pick<VendorBatch, 'enrolled' | 'held'> | null) => !!batch && batch.enrolled + batch.held > 0;

/** What's wrong with a batch, by field. `taken` is seats sold or held: capacity can't go below it. */
export function batchErrors(
  draft: BatchDraft,
  rules: Pick<CoachingRules, 'maxBatchSize' | 'maxClasses'>,
  mode: CourseMode,
  today: string,
  taken = 0,
  checkSchedule = true,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (draft.name.trim().length < 2) errors.name = 'Name it, like “Morning batch” or “Weekend”';
  const fee = paiseOf(draft.fee);
  if (fee === null) errors.fee = 'The whole course fee in rupees, or 0 for free';
  else if (fee > 200_000_00) errors.fee = 'Up to ₹2,00,000';
  const capacity = whole(draft.capacity);
  if (!capacity || capacity < 1) errors.capacity = 'How many students';
  else if (capacity > rules.maxBatchSize) errors.capacity = `Up to ${rules.maxBatchSize} students`;
  else if (capacity < taken) errors.capacity = `${taken} seats are taken already`;
  if (draft.minimum.trim()) {
    const min = whole(draft.minimum);
    if (!min || min < 2) errors.minimum = 'At least 2, or leave it empty';
    else if (capacity && min > capacity) errors.minimum = 'Can’t be more than the seats';
  }
  if (checkSchedule) {
    if (!draft.slots.length) errors.slots = 'Tap the grid to pick at least one day and time';
    else if (draft.slots.length > 14) errors.slots = 'Up to 14 class times a week';
    else if (slotClash(draft.slots)) errors.slots = 'Two class times on the same day overlap';
    if (!draft.startDate) errors.startDate = 'Pick the start date';
    else if (draft.startDate < today) errors.startDate = 'Pick a date from today on';
    if (draft.planBy === 'count') {
      const classes = whole(draft.classes);
      if (!classes || classes < 1) errors.classes = 'How many classes in all';
      else if (classes > rules.maxClasses) errors.classes = `Up to ${rules.maxClasses} classes`;
    } else if (!draft.endDate) errors.endDate = 'Pick the last day';
    else if (draft.startDate && draft.endDate < draft.startDate) errors.endDate = 'Can’t be before the first day';
    else if (draft.startDate && draft.endDate > addDay(draft.startDate, MAX_RUN_DAYS)) errors.endDate = 'A batch runs for up to a year';
    else if (draft.slots.length && !errors.slots) {
      const planned = draftPlan(draft, rules.maxClasses).length;
      if (!planned) errors.endDate = 'No class falls between the first and last day';
      else if (planned > rules.maxClasses) errors.endDate = `That gives more than ${rules.maxClasses} classes. Pick an earlier day.`;
    }
  }
  if (mode === 'online' && !/^https:\/\/\S+\.\S+/.test(draft.onlineLink.trim())) errors.onlineLink = 'The meeting link, starting https://';
  return errors;
}

export const toBatchInput = (draft: BatchDraft, mode: CourseMode): BatchInput => ({
  name: draft.name.trim(),
  fee: paiseOf(draft.fee) ?? 0,
  capacity: Number(draft.capacity),
  minStudents: draft.minimum.trim() ? Number(draft.minimum) : null,
  slots: sortSlots(draft.slots),
  startDate: draft.startDate,
  classes: draft.planBy === 'count' ? Number(draft.classes) : null,
  endDate: draft.planBy === 'date' ? draft.endDate : null,
  onlineLink: mode === 'online' ? draft.onlineLink.trim() : null,
  coachIds: draft.coachIds,
});

const SCHEDULE = ['slots', 'startDate', 'classes', 'endDate'] as const;

/** Only what changed. The days, times and dates go together, so the API plans the classes again. */
export function batchChanges(draft: BatchDraft, batch: VendorBatch, mode: CourseMode): Partial<BatchInput> {
  const next = toBatchInput(draft, mode);
  const before: BatchInput = {
    name: batch.name,
    fee: batch.fee,
    capacity: batch.capacity,
    minStudents: batch.minStudents,
    slots: sortSlots(batch.slots),
    startDate: batch.startDate,
    classes: batch.classes,
    endDate: null,
    onlineLink: batch.onlineLink,
    coachIds: batch.coachIds,
  };
  const changes: Partial<BatchInput> = {};
  const same = (k: keyof BatchInput) => JSON.stringify(next[k]) === JSON.stringify(before[k]);
  for (const k of ['name', 'fee', 'capacity', 'minStudents', 'onlineLink', 'coachIds'] as const) {
    if (!same(k)) Object.assign(changes, { [k]: next[k] });
  }
  if (SCHEDULE.some((k) => !same(k))) Object.assign(changes, { slots: next.slots, startDate: next.startDate, classes: next.classes, endDate: next.endDate });
  return changes;
}
