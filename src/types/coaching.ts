export interface Course {
  id: string;
  title: string;
  coach: string;
  category: string;
  description: string;
  rating: number;
}

export type BatchStatus = 'open' | 'full' | 'started' | 'cancelled';

export interface Batch {
  id: string;
  courseId: string;
  label: string;
  /** When the first session starts; the full-refund window closes at this moment. */
  startsAt: string;
  sessions: number;
  schedule: string;
  /** Whole batch fee in rupees, paid up front. */
  fee: number;
  capacity: number;
  enrolled: number;
  status: BatchStatus;
}

export interface CourseDetail {
  course: Course;
  batches: Batch[];
  /** Batch ids the user is already enrolled in. */
  enrolledBatchIds: string[];
}

export type SessionStatus = 'upcoming' | 'attended' | 'missed' | 'cancelled';

export interface ClassSession {
  id: string;
  at: string;
  status: SessionStatus;
}

export interface Enrolment {
  id: string;
  batchId: string;
  courseTitle: string;
  batchLabel: string;
  fee: number;
  startsAt: string;
  schedule: string;
  status: 'active' | 'cancelled';
  /** True until the first session starts. */
  refundable: boolean;
  sessions: ClassSession[];
}

export interface Student {
  id: string;
  name: string;
}

export interface BatchRoster {
  batch: Batch;
  courseTitle: string;
  students: Student[];
  /** The next session that still needs attendance, if any. */
  nextSession?: ClassSession;
}

export interface NewCourse {
  title: string;
  description: string;
  category: string;
  fee: number;
  startsAt: string;
  sessions: number;
  schedule: string;
  capacity: number;
}
