/** `/v1/coaching`, `/v1/coaching/desk` and the owner's `/v1/vendor` course routes. Amounts are paise; days are India's `YYYY-MM-DD`. */
import type { AppliedCoupon, CouponCheck } from './coupon';
import type { InvoiceRef } from './invoice';
import type { Rating } from './review';

export type CourseCategory = 'tuition' | 'exam_prep' | 'music' | 'dance' | 'sports' | 'fitness' | 'art' | 'languages' | 'tech' | 'other';
/** `offline`: at the institute's venue. `online`: live classes on a meeting link. */
export type CourseMode = 'offline' | 'online';
/** `batch`: an enrolment. `demo`: one trial class. */
export type OrderKind = 'batch' | 'demo';
export type CoachingOrderStatus = 'awaiting_payment' | 'confirmed' | 'cancelled';
export type CourseStatus = 'draft' | 'live' | 'removed';
/** `open`: taking enrolments, until the first class starts. */
export type BatchStatus = 'open' | 'full' | 'started' | 'ended' | 'cancelled';
export type ClassStatus = 'upcoming' | 'done' | 'cancelled';

/** One weekly class time. `day` 0 is Sunday; `start` is India's `HH:MM` in 15-minute steps. */
export interface Slot {
  day: number;
  start: string;
  minutes: number;
}

export interface CoursePhoto {
  url: string;
  width: number;
  height: number;
}

export interface CourseVenue {
  name: string;
  address: string;
  city: string;
  point: { lat: number; lng: number } | null;
}

export interface CoachingRules {
  certificatePercent: number;
  minimumHours: number;
  maxBatchSize: number;
  maxClasses: number;
  maxBatches: number;
  maxDemoFee: number;
  maxDemoSeats: number;
  /** Online class links show this many minutes before the start. */
  joinMinutes: number;
  commissionBps: number;
  platformFee: number;
}

export interface CourseCard {
  id: string;
  title: string;
  category: CourseCategory;
  mode: CourseMode;
  business: { id: string; name: string };
  photo: CoursePhoto | null;
  city: string | null;
  venueName: string | null;
  /** The lowest fee of a batch open for enrolment. */
  feeFrom: number | null;
  openBatches: number;
  nextStart: string | null;
  /** Null when the course has no demo class. */
  demo: { fee: number; free: boolean } | null;
}

export interface CourseFilters {
  city?: string;
  category?: CourseCategory;
  /** true: online only. false: in person only. */
  online?: boolean;
  q?: string;
}

export interface BatchView {
  id: string;
  name: string;
  fee: number;
  capacity: number;
  seatsLeft: number;
  slots: Slot[];
  /** In words, like "Mon, Wed 5–6 pm". */
  schedule: string;
  startDate: string;
  firstAt: string;
  lastEndsAt: string;
  /** Classes not cancelled, extra ones included. */
  classes: number;
  minStudents: number | null;
  enrolled: number;
  coaches: { id: string; name: string }[];
  status: BatchStatus;
  cancelReason: string | null;
}

export interface DemoClass {
  sessionId: string;
  batchId: string;
  batchName: string;
  startsAt: string;
  endsAt: string;
  seatsLeft: number;
}

/** Who a place is for: `childId` null is the account holder. */
export interface StudentRef {
  childId: string | null;
  name: string;
}

export interface CourseDetail extends CourseCard {
  description: string | null;
  venue: CourseVenue | null;
  certificatePercent: number;
  batches: BatchView[];
  demoClasses: DemoClass[];
  refundRule: string;
  platformFee: number;
  status: CourseStatus;
  canEnrol: boolean;
  whyNot: string | null;
  myOrders: { id: string; orderNo: number; kind: OrderKind; status: CoachingOrderStatus; student: StudentRef; batchId: string }[];
  /** Students who have had, or booked, this course's demo. */
  demoTaken: StudentRef[];
  /** The business's rating across all its reviews. */
  rating?: Rating;
}

// Enrolling and demos.

export interface EnrolBody {
  student: { childId: string | null };
  coupon?: string;
  returnTo: string;
}

/** Coupons that work on a batch's fee. Demo classes take none. */
export type BatchOffers = CouponCheck;

export interface DemoBody {
  sessionId: string;
  student: { childId: string | null };
  returnTo: string;
}

export interface ClassView {
  id: string;
  startsAt: string;
  endsAt: string;
  status: ClassStatus;
  /** Added beyond the weekly schedule. */
  extra: boolean;
  /** When it was first meant to start. */
  movedFrom: string | null;
  cancelReason: string | null;
  attendance: 'present' | 'absent' | null;
  /** Online classes: given from `joinFrom` until the class ends. */
  joinLink: string | null;
  joinFrom: string | null;
}

export interface CertificateRef {
  id: string;
  code: string;
  issuedAt: string;
  /** Works for 10 minutes without signing in. */
  pdfUrl: string;
}

export interface CoachingOrder {
  id: string;
  orderNo: number;
  kind: OrderKind;
  status: CoachingOrderStatus;
  student: StudentRef;
  course: {
    id: string;
    title: string;
    category: CourseCategory;
    mode: CourseMode;
    photo: CoursePhoto | null;
    venueName: string | null;
    address: string | null;
    city: string | null;
    /** Taken down by Ruxstar. */
    removed: boolean;
  };
  batch: { id: string; name: string; schedule: string; firstAt: string; lastEndsAt: string; cancelled: boolean; cancelReason: string | null };
  business: { id: string; name: string };
  price: { items: number; discount: number; platformFee: number; total: number };
  coupon: AppliedCoupon | null;
  refund: { amount: number; status: 'pending' | 'done'; reason: string | null } | null;
  reason: string | null;
  canCancel: boolean;
  /** Cancel before this, the first class, for a full refund. */
  cancelUntil: string | null;
  /** Unpaid places go back after this. */
  payBy: string | null;
  /** Every class of the batch, or the demo class. */
  classes: ClassView[];
  attendance: { attended: number; held: number; percent: number; needed: number };
  certificate: CertificateRef | null;
  invoices?: InvoiceRef[];
  /** Open for a review now: write or change it. */
  canReview?: boolean;
  /** The last moment to write or change the review; null when it can't be reviewed now. */
  reviewUntil?: string | null;
  createdAt: string;
}

export interface PlacedOrder {
  order: CoachingOrder;
  /** Null when it was free and is confirmed already. */
  checkoutUrl: string | null;
}

export type MyOrdersView = 'current' | 'past';

export interface TimetableEntry {
  orderId: string;
  kind: OrderKind;
  student: StudentRef;
  course: { id: string; title: string; mode: CourseMode };
  batchName: string;
  business: string;
  class: ClassView;
}

export interface Material {
  id: string;
  title: string;
  kind: 'file' | 'link';
  /** The link, or for a file a signed link that works for 10 minutes. */
  url: string;
  fileName: string | null;
  contentType: string | null;
  bytes: number | null;
  /** For every batch of the course. */
  wholeCourse: boolean;
  addedAt: string;
}

export interface BatchMessage {
  id: string;
  text: string;
  author: string;
  at: string;
}

export interface Child {
  id: string;
  name: string;
  birthYear: number | null;
  /** Open enrolments and demos; a child with any can't be removed. */
  enrolments: number;
}

export interface ChildInput {
  name: string;
  birthYear: number | null;
}

export interface Certificate extends CertificateRef {
  orderId: string;
  studentName: string;
  courseTitle: string;
  batchName: string;
  businessName: string;
  attended: number;
  classes: number;
}

// The institute's side.

export interface DemoSettings {
  /** Paise; 0 is a free demo. */
  fee: number;
  seats: number;
}

export interface CourseInput {
  title: string;
  description: string | null;
  category: CourseCategory;
  mode: CourseMode;
  venue: { name: string; address: string; city: string } | null;
  demo: DemoSettings | null;
  certificatePercent?: number;
}

export interface BatchInput {
  name: string;
  fee: number;
  capacity: number;
  minStudents: number | null;
  slots: Slot[];
  startDate: string;
  /** How many classes; or null with `endDate`. */
  classes: number | null;
  endDate: string | null;
  onlineLink: string | null;
  coachIds: string[];
}

export interface VendorBatch extends BatchView {
  /** Seats waiting for a payment. */
  held: number;
  onlineLink: string | null;
  coachIds: string[];
  /** When the minimum is checked. */
  minimumBy: string | null;
  certificatesAt: string | null;
  sales: number;
}

export interface VendorCourse extends CourseCard {
  description: string | null;
  venue: CourseVenue | null;
  demoSeats: number | null;
  certificatePercent: number;
  status: CourseStatus;
  publishedAt: string | null;
  removal: { reason: string; at: string } | null;
  batches: VendorBatch[];
  counts: { students: number; demos: number };
  money: { sales: number; share: number; commissionBps: number };
  /** What publishing still needs, in words. */
  missing: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentsFilter {
  batchId?: string;
  kind?: OrderKind;
  status?: 'confirmed' | 'cancelled';
}

export interface StudentRow {
  id: string;
  orderNo: number;
  kind: OrderKind;
  status: CoachingOrderStatus;
  student: { name: string; child: boolean };
  parent: { id: string; name: string; phone: string | null };
  batch: { id: string; name: string };
  /** Demo classes: when. */
  demoAt: string | null;
  total: number;
  share: number;
  refunded: number;
  attendance: { attended: number; held: number };
  createdAt: string;
}

// Classes, for the owner and coaches.

export interface DeskCan {
  attendance: boolean;
  message: boolean;
  materials: boolean;
  reschedule: boolean;
}

export interface DeskClass {
  id: string;
  startsAt: string;
  endsAt: string;
  status: ClassStatus;
  extra: boolean;
  movedFrom: string | null;
  cancelReason: string | null;
  /** Demo students booked. */
  demos: number;
  /** Attendance saved. */
  marked: boolean;
  present: number;
}

export interface DeskBatch {
  id: string;
  name: string;
  course: { id: string; title: string; mode: CourseMode };
  business: { id: string; name: string };
  schedule: string;
  slots: Slot[];
  firstAt: string;
  lastEndsAt: string;
  status: BatchStatus;
  onlineLink: string | null;
  students: number;
  nextClass: DeskClass | null;
  role: 'owner' | 'coach';
  can: DeskCan;
}

export interface DeskBatchDetail extends DeskBatch {
  classes: DeskClass[];
}

export interface TodayClass extends DeskClass {
  batch: { id: string; name: string };
  course: { id: string; title: string };
  students: number;
}

export interface RosterStudent {
  orderId: string;
  name: string;
  kind: OrderKind;
  child: boolean;
  /** Null: not marked. */
  present: boolean | null;
}

export interface ClassRoster {
  class: DeskClass;
  batch: { id: string; name: string };
  /** Attendance opens 30 minutes before the class and closes when certificates are issued. */
  canMark: boolean;
  students: RosterStudent[];
}

export interface DeskStudent {
  orderId: string;
  name: string;
  child: boolean;
  attended: number;
  /** Classes that have happened. */
  held: number;
  percent: number;
  /** The percent the course needs for the certificate. */
  certificateAt: number;
}

export interface MoveClassBody {
  startsAt: string;
  minutes?: number;
  reason?: string;
}

export interface LinkMaterialBody {
  title: string;
  url: string;
  /** Owner only: for every batch of the course. */
  wholeCourse?: boolean;
}
