/** The Ruxstar console, `/v1/ruxstar` (Architecture decisions 41 to 43). */

import type { Business, BusinessModule, PayoutMethod } from './business';
import type { CourseCategory, CourseStatus } from './coaching';
import type { StaysRuleSettings } from './stays';
import type { GigsRuleSettings } from './gigs';
import type { ShopRuleSettings } from './store';
import type { TurfRuleSettings } from './turf';

export type Permission =
  | 'kyc.view'
  | 'kyc.review'
  | 'reports.view'
  | 'reports.act'
  | 'users.view'
  | 'users.manage'
  | 'modules.view'
  | 'modules.manage'
  | 'businesses.view'
  | 'businesses.manage'
  | 'orders.view'
  | 'orders.manage'
  | 'payouts.view'
  | 'payouts.manage'
  | 'coupons.view'
  | 'coupons.manage'
  | 'support.view'
  | 'support.manage'
  | 'audit.view';

export interface Access {
  /** Admins have every permission and manage staff. */
  admin: boolean;
  title: string | null;
  permissions: Permission[];
  /** Every permission staff can be given. */
  catalog: { key: Permission; label: string }[];
}

/** A section is null when this person may not see it. */
export interface Overview {
  /** `delivery` is how many of those waiting are delivery partners. */
  kyc: { waiting: number; delivery: number } | null;
  /** `people` and `reviews` count those with open reports. */
  reports: { posts: number; reports: number; people: number; reviews: number } | null;
  users: { total: number; newThisWeek: number; suspended: number } | null;
  businesses: { total: number; live: number; suspended: number } | null;
  modules: { module: ModuleName; live: boolean }[] | null;
  /** Order problems waiting for a decision. */
  orders: { problems: number } | null;
  staff: { active: number } | null;
  /** Help tickets waiting for Ruxstar. Missing on an older API. */
  support?: { open: number; overdue: number; unassigned: number } | null;
}

// Console stats: `GET /v1/ruxstar/stats`. Paise; days and weeks are India time, weeks from Monday.

/** A business module, or `delivery` for Ruxstar partners' trips. */
export type StatsModule = 'pod' | 'events' | 'coaching' | 'turf' | 'stays' | 'shop' | 'gigs' | 'delivery';

export interface StatsMoney {
  /** What customers paid through the gateway; coupons Ruxstar pays for are not in it. */
  collectedToday: number;
  collectedThisWeek: number;
  collectedThisMonth: number;
  refundsToday: number;
  refundsThisMonth: number;
  /** Vendors' and partners' shares not yet released. */
  held: number;
}

export interface PayoutTotal {
  count: number;
  /** The payout fee included. */
  amount: number;
}

/** Each part is null without its permission, or when the module has none (print and delivery have no listings). */
export interface StatsModuleBlock {
  module: StatsModule;
  /** `takenDown` is businesses on hold. */
  businesses: { total: number; live: number; drafts: number; takenDown: number } | null;
  listings: { kind: 'event' | 'course' | 'ground' | 'property' | 'product' | 'gig'; live: number; takenDown: number } | null;
  /** Paid or free; delivery counts trips. */
  orders: { today: number; thisWeek: number; open: number } | null;
  money: StatsMoney | null;
}

/** With `module`, `people`, `money` and `queues` are null and `modules` holds that one. */
export interface Stats {
  /** When the oldest number was counted; numbers are kept up to a minute. */
  asOf: string;
  module: StatsModule | null;
  people: { total: number; joinedToday: number; joinedThisWeek: number; verified: number; onHold: number } | null;
  modules: StatsModuleBlock[];
  money: (StatsMoney & { payouts: { pending: PayoutTotal; failed: PayoutTotal; paidThisMonth: PayoutTotal } }) | null;
  /** Work waiting for Ruxstar; each null without its permission. */
  queues: {
    kyc: number | null;
    helpTickets: number | null;
    reports: number | null;
    orderProblems: number | null;
    staysObjections: number | null;
    shopReturns: number | null;
    /** Missing from an API older than freelancers. */
    gigDisputes?: number | null;
  } | null;
}

// Verification.

export type ReviewStatus = 'submitted' | 'approved' | 'rejected' | 'locked';
export type CaseStatus = 'not_started' | 'in_progress' | ReviewStatus;
/** `base` is identity; `delivery` is a delivery partner's licence and vehicle. */
export type ReviewTrack = 'base' | 'delivery';

export interface ReviewCase {
  id: string;
  track: ReviewTrack;
  status: CaseStatus;
  rejections: number;
  user: { id: string; name: string; username: string; phone: string; avatarUrl: string | null; memberSince: string };
  identity: {
    aadhaarName: string | null;
    aadhaarLast4: string | null;
    panMasked: string | null;
    panName: string | null;
    nameMatch: string | null;
    livenessScore: number | null;
    faceMatchScore: number | null;
  };
  /** Delivery cases only. The photo links open without signing in and work for 10 minutes. */
  delivery: {
    licenceNumber: string | null;
    licencePhotoUrl: string | null;
    vehicleType: 'bike' | 'scooter' | null;
    vehicleNumber: string | null;
    vehiclePhotoUrl: string | null;
  } | null;
  submittedAt: string | null;
  review: { decision: 'approved' | 'rejected'; reason: string | null; at: string } | null;
}

// Reported posts.

export type ReportStatus = 'open' | 'closed';
export type ReportReason = 'spam' | 'fake' | 'abuse' | 'undelivered' | 'other';
export type AccountStatus = 'active' | 'locked' | 'deleted';

export interface ReportCase {
  postId: string;
  post: {
    id: string;
    kind: 'personal' | 'business';
    text: string;
    media: { url: string; width: number; height: number }[];
    status: 'live' | 'deleted' | 'removed';
    createdAt: string;
    author: { id: string; name: string; username: string; avatarUrl: string | null; status: AccountStatus } | null;
    removal: { reason: string; at: string } | null;
  } | null;
  status: ReportStatus;
  reports: number;
  reasons: Record<ReportReason, number>;
  firstAt: string;
  lastAt: string;
  outcome: 'kept' | 'removed' | null;
  closedAt: string | null;
}

// Reported people.

export type PersonReportReason = 'spam' | 'fake' | 'abuse' | 'scam' | 'other';

export interface PersonCase {
  userId: string;
  user: { id: string; name: string; username: string; avatarUrl: string | null; status: AccountStatus } | null;
  status: ReportStatus;
  reports: number;
  reasons: Record<PersonReportReason, number>;
  /** What reporters wrote, newest first, up to 5. */
  notes: string[];
  firstAt: string;
  lastAt: string;
  /** `held` when their account was put on hold. */
  outcome: 'dismissed' | 'held' | null;
  closedAt: string | null;
}

// People.

export interface AccountRoles {
  vendor: boolean;
  delivery: boolean;
  ruxstarStaff: boolean;
  admin: boolean;
}

export interface AccountRow {
  id: string;
  name: string;
  username: string;
  phone: string;
  avatarUrl: string | null;
  status: AccountStatus;
  roles: AccountRoles;
  kyc: { base: string };
  createdAt: string;
}

export interface AccountDetail extends AccountRow {
  email: string | null;
  emailVerified: boolean;
  city: string | null;
  bio: string | null;
  card: string | null;
  signInLockedUntil: string | null;
  suspension: { reason: string; at: string; by: { id: string; name: string } | null } | null;
  stats: { posts: number; engagements: number };
  /** Devices signed in now. */
  sessions: number;
  openReports: number;
  staff: { title: string; permissions: Permission[]; status: 'active' | 'revoked' } | null;
}

// Staff.

export interface StaffMember {
  user: { id: string; name: string; username: string; phone: string; avatarUrl: string | null };
  title: string;
  permissions: Permission[];
  status: 'active' | 'revoked';
  grantedAt: string;
  updatedAt: string;
}

// Vendors' businesses.

export type BusinessState = 'draft' | 'live' | 'suspended';

export interface BusinessOwner {
  id: string;
  name: string;
  username: string;
  phone: string;
  avatarUrl: string | null;
  status: AccountStatus;
}

export interface BusinessRow {
  business: Business;
  owner: BusinessOwner | null;
}

export interface BusinessCase extends BusinessRow {
  payoutMethod: PayoutMethod | null;
  suspendedBy: { id: string; name: string } | null;
}

export interface BusinessFilter {
  q?: string;
  module?: BusinessModule;
  state?: BusinessState;
}

// Modules.

export type ModuleName = 'pod' | 'events' | 'coaching' | 'stays' | 'turf' | 'shop' | 'gigs' | 'delivery' | 'ledger';

export interface ModuleSettings {
  module: ModuleName;
  live: boolean;
  signupsOpen: boolean;
  /** Basis points: 1000 is 10%. */
  commissionBps: number;
  /** Paise the customer pays Ruxstar on each order, on top of the price. */
  platformFee: number;
  /** Paise taken from each withdrawal, and the least that can be withdrawn: vendors' on the ledger, Ruxstar partners' on delivery. */
  payouts: { fee: number; minimum: number } | null;
  deliveryEnabled: boolean;
  /** Business modules: publishing needs a verified GSTIN. Null for other modules. */
  gstinRequired: boolean | null;
  /** The delivery module only. */
  delivery: DeliverySettings | null;
  /** The events module only. */
  eventRules: EventRuleSettings | null;
  /** The coaching module only. */
  coachingRules: CoachingRuleSettings | null;
  /** The turf module only. */
  turfRules: TurfRuleSettings | null;
  /** The stays module only. */
  staysRules: StaysRuleSettings | null;
  /** The shop module only. */
  shopRules: ShopRuleSettings | null;
  /** The gigs (freelancers) module only; missing from an older API. */
  gigsRules?: GigsRuleSettings | null;
  updatedAt: string;
}

/** Rules every institute's courses follow. `maxDemoFee` is paise. */
export interface CoachingRuleSettings {
  /** 1 to 100. Courses can set their own. */
  certificatePercent: number;
  /** 1 to 168. */
  minimumHours: number;
  maxBatchSize: number;
  maxClasses: number;
  maxBatches: number;
  maxDemoFee: number;
  maxDemoSeats: number;
  /** 0 to 120. */
  joinMinutes: number;
}

/** Rules every organiser's events follow. */
export interface EventRuleSettings {
  /** Customers can cancel for a full refund until this many hours before the start (0 to 720). */
  refundHours: number;
  /** How long someone offered seats from the waitlist has to pay (1 to 48). */
  waitlistHours: number;
  /** 1 to 10. */
  maxTicketTypes: number;
  /** Questions an organiser can ask each ticket holder (0 to 10). */
  maxQuestions: number;
}

/** Paise. `riderRate` is what a Ruxstar partner is paid for one trip, out of the shop's share; `shopFeeMax` caps what shops charge. */
export interface DeliverySettings {
  riderRate: { base: number; includedKm: number; perKm: number };
  shopFeeMax: { base: number; perKm: number };
  /** A partner offer nobody accepts is cancelled after this. */
  offerMinutes: number;
}

export type ModulePatch = Partial<Pick<ModuleSettings, 'live' | 'signupsOpen' | 'commissionBps' | 'platformFee' | 'deliveryEnabled'>> &
  Partial<Pick<DeliverySettings, 'riderRate' | 'shopFeeMax' | 'offerMinutes'>> & {
    /** Ledger only, paise. The minimum must be at least ₹1 more than the fee. */
    payoutFee?: number;
    minPayout?: number;
    /** Business modules only. Live businesses without one stay live. */
    gstinRequired?: boolean;
    /** Events only. Send only what changes. */
    eventRules?: Partial<EventRuleSettings>;
    /** Coaching only. Send only what changes. */
    coachingRules?: Partial<CoachingRuleSettings>;
    /** Turf only. Send only what changes. */
    turfRules?: Partial<TurfRuleSettings>;
    /** Stays only. Send only what changes. */
    staysRules?: Partial<StaysRuleSettings>;
    /** Shop only. Send only what changes. */
    shopRules?: Partial<ShopRuleSettings>;
    /** Freelancers only. Send only what changes; `categories` goes whole. */
    gigsRules?: Partial<GigsRuleSettings>;
  };

/** Console events list: `q` matches the title or the organiser's name. */
export interface EventFilter {
  q?: string;
  status?: 'draft' | 'live' | 'cancelled';
}

/** Console courses list: `q` matches the title or the institute's name. */
export interface CourseFilter {
  q?: string;
  status?: CourseStatus;
  category?: CourseCategory;
}

// Payouts and held money.

export type PayoutStatus = 'pending' | 'failed' | 'paid';

export interface StaffPayout {
  id: string;
  /** `partner` is a Ruxstar delivery partner's withdrawal; `vendor` is then the partner. */
  payee: 'vendor' | 'partner';
  vendor: { id: string; name: string };
  /** Paise taken from the payee's balance; the bank gets `amount - fee`. */
  amount: number;
  fee: number;
  status: PayoutStatus;
  to: string;
  /** Cashfree's transfer_id. */
  transferId: string;
  utr: string | null;
  /** `text` is what the payee was told. */
  failure: { code: string; text: string } | null;
  /** Times it was sent to Cashfree. */
  attempts: number;
  checkedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

/** A delivered order whose share is still on hold. */
export interface HeldOrder {
  id: string;
  orderNo: number;
  module: ModuleName;
  business: { id: string; name: string } | null;
  vendor: { id: string; name: string };
  /** Paise: the shop's share left after partial refunds. */
  amount: number;
  deliveredAt: string | null;
  releaseAt: string;
  /** A reported problem waits for a decision; it can't be released until then. */
  problemOpen: boolean;
  /**
   * A Ruxstar partner delivered it and their pay (already out of the shop's share) is on hold until `releaseAt`.
   * `held`: the customer said it never arrived, so it waits until that is settled.
   */
  partner: { rider: { id: string; name: string }; amount: number; releaseAt: string; held: boolean } | null;
}

// Audit log.

export interface AuditEntry {
  id: string;
  at: string;
  actor: { id: string | null; kind: 'user' | 'staff' | 'admin' | 'system'; name: string | null; username: string | null };
  module: string;
  action: string;
  target: { type: string; id: string };
  diff: Record<string, { from?: unknown; to?: unknown }>;
  ip: string | null;
}

export interface AuditFilter {
  module?: string;
  action?: string;
  actor?: string;
  target?: string;
  /** ISO date-time, inclusive. */
  from?: string;
  /** ISO date-time, exclusive. */
  to?: string;
}
