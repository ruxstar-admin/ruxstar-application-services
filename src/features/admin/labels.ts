import type { ModuleName, PersonReportReason, ReportReason } from '@/types/admin';

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

export const PERSON_REASON_LABEL: Record<PersonReportReason, string> = {
  spam: 'Spam',
  fake: 'Fake account',
  abuse: 'Abuse',
  scam: 'Scam',
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
  'kyc.reopen': 'Reopened verification',
  'report.keep': 'Kept a reported post',
  'post.remove': 'Removed a post',
  'user_report.dismiss': 'Dismissed reports about someone',
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
  'business.publish': 'Published a business',
  'business.suspend': 'Put a business on hold',
  'business.restore': 'Lifted a hold on a business',
  'payout_method.set': 'Set where they get paid',
  'pod_order.status': 'Moved a print order on',
  'pod_order.problem': 'Reported a problem with a print order',
  'pod_order.refund': 'Refunded part of a print order',
  'pod_order.settle': 'Settled a print order problem',
  'pod_order.release': "Released a shop's share early",
  'delivery.assign': 'Sent an order for delivery',
  'delivery.cancel': 'Cancelled a delivery',
  'payout.request': 'Asked for a withdrawal',
  'payout.check': 'Checked a withdrawal with Cashfree',
  'coupon.create': 'Created a coupon',
  'coupon.update': 'Changed a coupon',
  'review.create': 'Reviewed an order',
  'review.update': 'Changed a review',
  'review.delete': 'Deleted a review',
  'review.reply': 'Replied to a review',
  'review.reply_delete': 'Took down a reply to a review',
  'review_report.keep': 'Kept a reported review',
  'review.remove': 'Removed a review',
  'post.create': 'Posted',
  'business.update': "Changed a business's details",
  'business.catalog': "Changed a shop's products and prices",
  'business.photo_add': 'Added a business photo',
  'business.photo_remove': 'Removed a business photo',
  'business.open': 'Opened a shop',
  'business.close': 'Closed a shop',
  'team.invite': 'Invited someone to a team',
  'team.update': "Changed a team member's access",
  'team.remove': 'Removed someone from a team',
  'team.leave': 'Left a team',
  'team.join': 'Joined a team',
  'team.decline': 'Turned down a team invite',
  'support.reply': 'Replied to a help ticket',
  'support.note': 'Added a note to a help ticket',
  'support.update': 'Changed a help ticket',
  'support.settings': 'Changed help reply-by times',
};

export const BUSINESS_STATE_LABEL: Record<'draft' | 'live' | 'suspended', string> = {
  draft: 'Draft',
  live: 'Live',
  suspended: 'On hold',
};

export const AREA_LABEL: Record<string, string> = {
  account: 'Accounts',
  kyc: 'Verification',
  social: 'Posts',
  ruxstar: 'Staff',
  vendor: 'Vendor',
  support: 'Help desk',
  ...MODULE_LABEL,
};

/** Permission groups, by the part before the dot. */
export const PERMISSION_AREA: Record<string, string> = {
  kyc: 'Verification',
  reports: 'Reported posts',
  users: 'People',
  modules: 'Modules',
  businesses: 'Businesses',
  orders: 'Print orders',
  support: 'Help tickets',
  audit: 'Audit log',
};

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
