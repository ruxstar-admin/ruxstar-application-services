import { apiPost } from '@/lib/api-client';
import type { Batch, BatchRoster, Course, CourseDetail, Enrolment, NewCourse } from '@/types/coaching';

/** Coaching: courses, batches, enrolment, attendance. Not in the backend yet — mocked (coaching.mocks.ts). */
export const CoachingService = {
  course: (token: string, id: string) => apiPost<CourseDetail>('/coaching/get', { id }, token),
  enrol: (token: string, batchId: string, paymentRef: string) => apiPost<Enrolment>('/coaching/enrol', { batchId, paymentRef }, token),
  enrolment: (token: string, id: string) => apiPost<Enrolment>('/coaching/enrolment', { id }, token),

  vendorBatches: (token: string) => apiPost<{ batch: Batch; courseTitle: string }[]>('/coaching/vendor/courses', undefined, token),
  create: (token: string, course: NewCourse) => apiPost<{ course: Course; batch: Batch }>('/coaching/vendor/create', { ...course }, token),
  roster: (token: string, batchId: string) => apiPost<BatchRoster>('/coaching/vendor/batch', { batchId }, token),
  saveAttendance: (token: string, batchId: string, sessionId: string, presentIds: string[]) =>
    apiPost<{ message: string }>('/coaching/vendor/attendance', { batchId, sessionId, presentIds }, token),
};
