import type { ModuleName, ReportReason } from '@/types/admin';

export const MODULE_LABEL: Record<ModuleName, string> = {
  pod: 'Print on demand',
  events: 'Events',
  coaching: 'Coaching',
  stays: 'PG and hostel stays',
  delivery: 'Delivery',
  ledger: 'Payments and ledger',
};

export const REASON_LABEL: Record<ReportReason, string> = {
  spam: 'Spam',
  fake: 'Fake or scam',
  abuse: 'Abuse',
  undelivered: 'Not delivered',
  other: 'Other',
};

export const KYC_LABEL: Record<string, string> = {
  none: 'Not started',
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted: 'Waiting for review',
  approved: 'Approved',
  rejected: 'Sent back',
  locked: 'On hold',
  expired: 'Expired',
};

export const ACTION_LABEL: Record<string, string> = {
  'kyc.approve': 'Approved verification',
  'kyc.reject': 'Sent verification back',
  'report.keep': 'Kept a reported post',
  'post.remove': 'Removed a post',
  'user.suspend': 'Put an account on hold',
  'user.unlock': 'Unlocked an account',
  'user.sign_out': 'Signed an account out everywhere',
  'user.password_reset': 'Reset their password',
  'user.password_change': 'Changed their password',
  'user.delete': 'Deleted their account',
  'admin.grant': 'Made an admin',
  'staff.grant': 'Added to staff',
  'staff.update': 'Changed staff access',
  'staff.revoke': 'Removed from staff',
  'module_settings.update': 'Changed module settings',
};

export const AREA_LABEL: Record<string, string> = {
  account: 'Accounts',
  kyc: 'Verification',
  social: 'Posts',
  ruxstar: 'Staff',
  ...MODULE_LABEL,
};

/** Permission groups, by the part before the dot. */
export const PERMISSION_AREA: Record<string, string> = {
  kyc: 'Verification',
  reports: 'Reported posts',
  users: 'People',
  modules: 'Modules',
  audit: 'Audit log',
};

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
