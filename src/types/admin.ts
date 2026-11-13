/** The Ruxstar console, `/v1/ruxstar` (Architecture decisions 41 to 43). */

import type { Business, BusinessModule, PayoutMethod } from './business';

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
  kyc: { waiting: number } | null;
  reports: { posts: number; reports: number; people: number } | null;
  users: { total: number; newThisWeek: number; suspended: number } | null;
  businesses: { total: number; live: number; suspended: number } | null;
  modules: { module: ModuleName; live: boolean }[] | null;
  /** Order problems waiting for a decision. */
  orders: { problems: number } | null;
  staff: { active: number } | null;
}

// Verification.

export type ReviewStatus = 'submitted' | 'approved' | 'rejected' | 'locked';
export type CaseStatus = 'not_started' | 'in_progress' | ReviewStatus;

export interface ReviewCase {
  id: string;
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

export type ModuleName = 'pod' | 'events' | 'coaching' | 'stays' | 'delivery' | 'ledger';

export interface ModuleSettings {
  module: ModuleName;
  live: boolean;
  signupsOpen: boolean;
  /** Basis points: 1000 is 10%. */
  commissionBps: number;
  /** Paise the customer pays Ruxstar on each order, on top of the price. */
  platformFee: number;
  deliveryEnabled: boolean;
  updatedAt: string;
}

export type ModulePatch = Partial<Pick<ModuleSettings, 'live' | 'signupsOpen' | 'commissionBps' | 'platformFee' | 'deliveryEnabled'>>;

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
}
