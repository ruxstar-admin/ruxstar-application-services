import type { Ionicons } from '@expo/vector-icons';
import { dayLabel, dayText } from '@/features/events/lib/events';
import { money } from '@/features/vendor/lib/pod';
import type {
  BatchStatus,
  BatchView,
  Child,
  CoachingOrderStatus,
  CourseCard,
  CourseCategory,
  CourseDetail,
  CourseStatus,
  CourseMode,
  StudentRef,
} from '@/types/coaching';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'error';
type Icon = keyof typeof Ionicons.glyphMap;

export const CATEGORY_LABEL: Record<CourseCategory, string> = {
  tuition: 'Tuition',
  exam_prep: 'Exam prep',
  music: 'Music',
  dance: 'Dance',
  sports: 'Sports',
  fitness: 'Fitness & yoga',
  art: 'Art & craft',
  languages: 'Languages',
  tech: 'Coding & tech',
  other: 'Other',
};
export const CATEGORY_ICON: Record<CourseCategory, Icon> = {
  tuition: 'book-outline',
  exam_prep: 'school-outline',
  music: 'musical-notes-outline',
  dance: 'body-outline',
  sports: 'football-outline',
  fitness: 'barbell-outline',
  art: 'color-palette-outline',
  languages: 'language-outline',
  tech: 'code-slash-outline',
  other: 'sparkles-outline',
};
export const CATEGORIES = Object.keys(CATEGORY_LABEL) as CourseCategory[];

export const MODE_LABEL: Record<CourseMode, string> = { offline: 'In person', online: 'Online' };

export const ORDER_STATUS: Record<CoachingOrderStatus, { label: string; tone: Tone }> = {
  awaiting_payment: { label: 'Not paid yet', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};
export const COURSE_STATUS: Record<CourseStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'warning' },
  live: { label: 'Live', tone: 'success' },
  removed: { label: 'Taken down', tone: 'error' },
};
export const BATCH_STATUS: Record<BatchStatus, { label: string; tone: Tone }> = {
  open: { label: 'Taking students', tone: 'success' },
  full: { label: 'Full', tone: 'warning' },
  started: { label: 'Running', tone: 'accent' },
  ended: { label: 'Ended', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'error' },
};

const titleCase = (city: string) => city.replace(/\b\w/g, (c) => c.toUpperCase());

/** "Online", or the venue and city. */
export const placeLine = (card: Pick<CourseCard, 'mode' | 'venueName' | 'city'>) =>
  card.mode === 'online' ? 'Online' : [card.venueName, card.city ? titleCase(card.city) : null].filter(Boolean).join(', ') || 'In person';

/** "From ₹2,000", "Free", or that nothing is open. */
export function feeLine(card: Pick<CourseCard, 'feeFrom' | 'openBatches'>): string {
  if (!card.openBatches || card.feeFrom === null) return 'No batches open';
  return card.feeFrom === 0 ? 'Free' : `From ${money(card.feeFrom)}`;
}

/** "Free demo class", "Demo class ₹100". */
export const demoLine = (demo: CourseCard['demo']) => (!demo ? null : demo.free ? 'Free demo class' : `Demo class ${money(demo.fee)}`);

export const feeText = (paise: number) => (paise === 0 ? 'Free' : money(paise));

export function seatsLine(batch: Pick<BatchView, 'seatsLeft' | 'status'>): string {
  if (batch.status === 'full' || batch.seatsLeft <= 0) return 'Full';
  return batch.seatsLeft === 1 ? '1 seat left' : `${batch.seatsLeft} seats left`;
}

/** "24 classes · starts Mon 6 Jan". */
export const classesLine = (batch: Pick<BatchView, 'classes' | 'firstAt'>) =>
  `${batch.classes} ${batch.classes === 1 ? 'class' : 'classes'} · starts ${dayText(batch.firstAt)}`;

/** What the parent pays: the fee less any coupon, and the platform fee when there's a fee. The API prices it the same way. */
export function orderPrice(fee: number, platformFee: number, discount = 0) {
  const charge = fee > 0 ? platformFee : 0;
  const off = Math.min(Math.max(discount, 0), fee);
  return { items: fee, discount: off, fee: charge, total: fee - off + charge };
}
/** Batches a parent can still enrol in, soonest first. */
export const openBatches = (course: Pick<CourseDetail, 'batches'>) =>
  course.batches.filter((b) => b.status === 'open' && b.seatsLeft > 0).sort((a, b) => a.firstAt.localeCompare(b.firstAt));

// Who the place is for.

export const ME = 'me';
export const studentKey = (childId: string | null) => childId ?? ME;
export const childIdOf = (key: string) => (key === ME ? null : key);
const sameStudent = (a: StudentRef, key: string) => studentKey(a.childId) === key;

export interface StudentOption {
  key: string;
  label: string;
  /** Why they can't be picked. */
  taken: string | null;
}

/**
 * "Me" and each child. For a demo, anyone who had one already can't book another. For a batch, anyone with an open place in it
 * can't enrol twice.
 */
export function studentOptions(
  myName: string | null,
  children: readonly Child[],
  course: Pick<CourseDetail, 'demoTaken' | 'myOrders'>,
  target: { kind: 'demo' } | { kind: 'batch'; batchId: string },
): StudentOption[] {
  const people = [{ key: ME, label: myName ? `Me (${myName})` : 'Me' }, ...children.map((c) => ({ key: c.id, label: c.name }))];
  return people.map((p) => {
    if (target.kind === 'demo') {
      return { ...p, taken: course.demoTaken.some((t) => sameStudent(t, p.key)) ? 'Had a demo for this course already' : null };
    }
    const placed = course.myOrders.some((o) => o.kind === 'batch' && o.batchId === target.batchId && o.status !== 'cancelled' && sameStudent(o.student, p.key));
    return { ...p, taken: placed ? 'Already in this batch' : null };
  });
}

/** "Mon 6 Jan" for a `YYYY-MM-DD`. */
export { dayLabel };
