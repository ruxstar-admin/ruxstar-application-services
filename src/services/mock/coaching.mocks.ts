import { ApiError } from '@/lib/api-error';
import { isRefundable } from '@/features/coaching/lib/policy';
import type { Batch, BatchRoster, ClassSession, Course, CourseDetail, Enrolment, NewCourse, Student } from '@/types/coaching';
import { recordEngagement, registerCanceller, registerListings } from './commerce-state';
import { defineMocks } from './registry';

const DAY = 86_400_000;
const inDays = (days: number, hour: number) => {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

let courses: Course[] = [
  { id: 'co1', title: 'Wheel pottery basics', coach: 'Priya Nair', category: 'Arts & crafts', description: 'Learn centring, throwing and trimming. All materials and firing included.', rating: 4.8 },
  { id: 'co2', title: 'UPSC prelims crash course', coach: 'Dr. Anil Rao', category: 'Exam prep', description: 'Daily tests, concept classes and weekly mocks for the prelims.', rating: 4.6 },
];

let batches: Batch[] = [
  { id: 'b1', courseId: 'co1', label: 'Batch 4 · Weekends', startsAt: inDays(3, 10), sessions: 8, schedule: 'Sat & Sun · 10 am', fee: 6400, capacity: 10, enrolled: 8, status: 'open' },
  { id: 'b2', courseId: 'co1', label: 'Batch 5 · Evenings', startsAt: inDays(12, 18), sessions: 8, schedule: 'Tue & Thu · 6 pm', fee: 6000, capacity: 10, enrolled: 10, status: 'full' },
  { id: 'b3', courseId: 'co2', label: 'Batch 7 · Morning', startsAt: inDays(5, 7), sessions: 24, schedule: 'Mon to Fri · 7 am', fee: 18000, capacity: 40, enrolled: 34, status: 'open' },
];

let enrolments: Enrolment[] = [];
let counter = 700;

const field = (body: Record<string, unknown> | undefined, key: string) => String(body?.[key] ?? '');
const courseOf = (id: string) => {
  const found = courses.find((c) => c.id === id);
  if (!found) throw new ApiError(404, 'Course not found');
  return found;
};
const batchOf = (id: string) => {
  const found = batches.find((b) => b.id === id);
  if (!found) throw new ApiError(404, 'Batch not found');
  return found;
};
const enrolmentOf = (id: string) => {
  const found = enrolments.find((e) => e.id === id);
  if (!found) throw new ApiError(404, 'Enrolment not found');
  return found;
};

const sessionsFor = (batch: Batch): ClassSession[] =>
  Array.from({ length: batch.sessions }, (_, i) => ({
    id: `${batch.id}-s${i + 1}`,
    at: new Date(new Date(batch.startsAt).getTime() + i * 2 * DAY).toISOString(),
    status: 'upcoming' as const,
  }));

const view = (e: Enrolment): Enrolment => ({ ...e, refundable: e.status === 'active' && isRefundable(e.startsAt) });

registerCanceller('coaching', (refId) => {
  const enrolment = enrolmentOf(refId);
  return {
    completed: false,
    firstSessionStarted: !isRefundable(enrolment.startsAt),
    apply: () => {
      enrolment.status = 'cancelled';
      const batch = batches.find((b) => b.id === enrolment.batchId);
      if (batch) {
        batch.enrolled = Math.max(0, batch.enrolled - 1);
        if (batch.status === 'full' && batch.enrolled < batch.capacity) batch.status = 'open';
      }
    },
  };
});

registerListings(() =>
  courses.map((c) => {
    const open = batches.filter((b) => b.courseId === c.id && b.status !== 'cancelled');
    const next = [...open].sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
    const cheapest = open.length ? Math.min(...open.map((b) => b.fee)) : 0;
    return {
      id: c.id,
      module: 'coaching' as const,
      title: c.title,
      subtitle: `${c.coach} · ${c.category}`,
      price: cheapest ? `from ₹${cheapest.toLocaleString('en-IN')}` : 'No open batches',
      badge: next ? `${open.length} batch${open.length > 1 ? 'es' : ''}` : undefined,
    };
  }),
);

defineMocks({
  'POST /coaching/get': {
    mocked: true,
    handle: ({ body }): CourseDetail => {
      const course = courseOf(field(body, 'id'));
      return {
        course: { ...course },
        batches: batches.filter((b) => b.courseId === course.id).map((b) => ({ ...b })),
        enrolledBatchIds: enrolments.filter((e) => e.status === 'active').map((e) => e.batchId),
      };
    },
  },

  'POST /coaching/enrol': {
    mocked: true,
    latencyMs: 450,
    handle: ({ body }) => {
      const batch = batchOf(field(body, 'batchId'));
      if (batch.status === 'cancelled' || batch.status === 'started') throw new ApiError(409, 'This batch is not open');
      if (batch.enrolled >= batch.capacity) throw new ApiError(409, 'Batch is full');
      if (enrolments.some((e) => e.batchId === batch.id && e.status === 'active')) throw new ApiError(409, 'Already enrolled');
      if (!field(body, 'paymentRef')) throw new ApiError(402, 'Payment required');

      batch.enrolled += 1;
      if (batch.enrolled >= batch.capacity) batch.status = 'full';
      const course = courseOf(batch.courseId);
      const created: Enrolment = {
        id: `en${++counter}`,
        batchId: batch.id,
        courseTitle: course.title,
        batchLabel: batch.label,
        fee: batch.fee,
        startsAt: batch.startsAt,
        schedule: batch.schedule,
        status: 'active',
        refundable: true,
        sessions: sessionsFor(batch),
      };
      enrolments = [created, ...enrolments];
      recordEngagement({
        module: 'coaching',
        title: course.title,
        subtitle: `${batch.label} · starts ${new Date(batch.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        amount: batch.fee,
        status: 'confirmed',
        refId: created.id,
        paymentRef: field(body, 'paymentRef'),
      });
      return view(created);
    },
  },

  'POST /coaching/enrolment': { mocked: true, handle: ({ body }) => view(enrolmentOf(field(body, 'id'))) },

  'POST /coaching/vendor/courses': {
    mocked: true,
    handle: () => batches.map((b) => ({ batch: { ...b }, courseTitle: courseOf(b.courseId).title })),
  },

  'POST /coaching/vendor/create': {
    mocked: true,
    latencyMs: 500,
    handle: ({ body }) => {
      const input = body as unknown as NewCourse;
      if (!input.title?.trim()) throw new ApiError(400, 'Title is required');
      if (input.fee < 1 || input.sessions < 1 || input.capacity < 1) throw new ApiError(400, 'Fee, sessions and seats must be positive');
      if (new Date(input.startsAt).getTime() < Date.now()) throw new ApiError(400, 'Choose a future start date');
      const course: Course = { id: `co${courses.length + 1}`, title: input.title.trim(), coach: 'You', category: input.category || 'General', description: input.description, rating: 0 };
      const batch: Batch = { id: `b${batches.length + 1}`, courseId: course.id, label: 'Batch 1', startsAt: input.startsAt, sessions: input.sessions, schedule: input.schedule, fee: input.fee, capacity: input.capacity, enrolled: 0, status: 'open' };
      courses = [course, ...courses];
      batches = [batch, ...batches];
      return { course, batch };
    },
  },

  'POST /coaching/vendor/batch': {
    mocked: true,
    handle: ({ body }): BatchRoster => {
      const batch = batchOf(field(body, 'batchId'));
      const students: Student[] = enrolments.filter((e) => e.batchId === batch.id && e.status === 'active').map((e) => ({ id: e.id, name: 'You' }));
      const sessions = sessionsFor(batch);
      return { batch: { ...batch }, courseTitle: courseOf(batch.courseId).title, students, nextSession: sessions.find((s) => new Date(s.at).getTime() <= Date.now() + DAY) ?? sessions[0] };
    },
  },

  'POST /coaching/vendor/attendance': {
    mocked: true,
    handle: ({ body }) => {
      const present = (body?.presentIds as string[] | undefined) ?? [];
      const sessionId = field(body, 'sessionId');
      enrolments.forEach((e) => {
        if (e.batchId !== field(body, 'batchId')) return;
        e.sessions = e.sessions.map((s) => (s.id === sessionId ? { ...s, status: present.includes(e.id) ? 'attended' : 'missed' } : s));
      });
      return { message: 'Attendance saved' };
    },
  },
});
