import { findMock, runMock } from '..';
import { isRefundable } from '@/features/coaching/lib/policy';
import type { BatchRoster, CourseDetail, Enrolment } from '@/types/coaching';

const call = <T = unknown>(path: string, body?: Record<string, unknown>) => {
  const route = findMock('POST', path, 'auto');
  if (!route) throw new Error(`no mock for ${path}`);
  return runMock({ ...route, latencyMs: 0 }, { path, body }) as Promise<T>;
};

describe('policy', () => {
  it('is refundable only until the first session starts', () => {
    const now = new Date('2026-10-22T12:00:00Z').getTime();
    expect(isRefundable('2026-10-23T10:00:00Z', now)).toBe(true);
    expect(isRefundable('2026-10-22T11:00:00Z', now)).toBe(false);
  });
});

describe('enrolment', () => {
  it('needs payment, then enrols once and records the full fee', async () => {
    await expect(call('/coaching/enrol', { batchId: 'b1' })).rejects.toMatchObject({ status: 402 });
    const enrolment = await call<Enrolment>('/coaching/enrol', { batchId: 'b1', paymentRef: 'P1' });
    expect(enrolment).toMatchObject({ fee: 6400, refundable: true, status: 'active' });
    expect(enrolment.sessions).toHaveLength(8);
    await expect(call('/coaching/enrol', { batchId: 'b1', paymentRef: 'P2' })).rejects.toMatchObject({ kind: 'conflict' });

    const detail = await call<CourseDetail>('/coaching/get', { id: 'co1' });
    expect(detail.enrolledBatchIds).toContain('b1');
  });

  it('refuses a full batch', async () => {
    await expect(call('/coaching/enrol', { batchId: 'b2', paymentRef: 'P3' })).rejects.toMatchObject({ kind: 'conflict' });
  });
});

describe('organiser tools', () => {
  it('validates a new course and lists it in Discover', async () => {
    const base = {
      title: 'Sketching',
      description: '',
      category: 'Arts',
      fee: 3000,
      sessions: 6,
      schedule: 'Sat · 4 pm',
      capacity: 12,
      startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    };
    await expect(call('/coaching/vendor/create', { ...base, title: ' ' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(call('/coaching/vendor/create', { ...base, startsAt: new Date(Date.now() - 1000).toISOString() })).rejects.toMatchObject({ kind: 'validation' });
    await call('/coaching/vendor/create', base);
    const listings = await call<{ title: string }[]>('/discover/list', { module: 'coaching' });
    expect(listings.some((l) => l.title === 'Sketching')).toBe(true);
  });

  it('returns the roster with enrolled students and saves attendance', async () => {
    const roster = await call<BatchRoster>('/coaching/vendor/batch', { batchId: 'b1' });
    expect(roster.students.length).toBeGreaterThan(0);
    await expect(call('/coaching/vendor/attendance', { batchId: 'b1', sessionId: 'b1-s1', presentIds: [] })).resolves.toEqual({
      message: 'Attendance saved',
    });
  });
});
