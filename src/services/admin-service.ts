import { apiDelete, apiGet, apiGetPage, apiPatch, apiPost, apiPut } from '@/lib/api-client';
import type {
  Access,
  AccountDetail,
  AccountRow,
  AccountStatus,
  AuditEntry,
  AuditFilter,
  BusinessCase,
  BusinessFilter,
  BusinessRow,
  HeldOrder,
  ModuleName,
  ModulePatch,
  ModuleSettings,
  Overview,
  PayoutStatus,
  Permission,
  PersonCase,
  ReportCase,
  ReportStatus,
  ReviewCase,
  ReviewStatus,
  StaffMember,
  StaffPayout,
} from '@/types/admin';
import type { StaffOrder } from '@/types/order';

export type SettleOutcome = 'refund_full' | 'refund_partial' | 'dismiss';

const keyed = (idempotencyKey: string) => ({ idempotencyKey });

/**
 * The Ruxstar console, `/v1/ruxstar`. The API checks every permission itself; `getAccess` only tells
 * the app which sections to show. Every write takes an idempotency key, reused when that action is retried.
 */
export const AdminService = {
  getAccess: (token: string) => apiGet<Access>('/v1/ruxstar/access', token),
  getOverview: (token: string) => apiGet<Overview>('/v1/ruxstar/overview', token),

  reviewQueue: (token: string, status: ReviewStatus, cursor?: string) => apiGetPage<ReviewCase>('/v1/ruxstar/kyc', token, { status, cursor }),
  approveCase: (token: string, id: string, key: string) => apiPost<ReviewCase>(`/v1/ruxstar/kyc/${id}/approve`, undefined, token, keyed(key)),
  /** The reason (5 to 300 characters) is shown to the person, so it says what to fix. */
  rejectCase: (token: string, id: string, reason: string, key: string) =>
    apiPost<ReviewCase>(`/v1/ruxstar/kyc/${id}/reject`, { reason }, token, keyed(key)),

  reports: (token: string, status: ReportStatus, cursor?: string) => apiGetPage<ReportCase>('/v1/ruxstar/reports', token, { status, cursor }),
  keepPost: (token: string, postId: string, key: string) => apiPost<ReportCase>(`/v1/ruxstar/reports/${postId}/keep`, undefined, token, keyed(key)),
  /** The author is notified with the reason. */
  removePost: (token: string, postId: string, reason: string, key: string) =>
    apiPost<ReportCase>(`/v1/ruxstar/reports/${postId}/remove`, { reason }, token, keyed(key)),
  peopleReports: (token: string, status: ReportStatus, cursor?: string) =>
    apiGetPage<PersonCase>('/v1/ruxstar/reports/people', token, { status, cursor }),
  /** To act on the account instead, put it on hold; that closes these too. */
  dismissPerson: (token: string, userId: string, key: string) =>
    apiPost<PersonCase>(`/v1/ruxstar/reports/people/${userId}/dismiss`, undefined, token, keyed(key)),

  /** Print orders with a reported problem; `open` ones hold the shop's share. */
  orderProblems: (token: string, status: 'open' | 'resolved', cursor?: string) =>
    apiGetPage<StaffOrder>('/v1/ruxstar/reports/orders', token, { status, cursor }),
  /** `amount` (paise) is for `refund_partial` only. The note is shown to the customer and the shop. */
  settleOrder: (token: string, orderId: string, body: { outcome: SettleOutcome; amount?: number; note: string }, key: string) =>
    apiPost<StaffOrder>(`/v1/ruxstar/reports/orders/${orderId}/settle`, { ...body }, token, keyed(key)),

  findAccounts: (token: string, q: string, status?: AccountStatus, cursor?: string) =>
    apiGetPage<AccountRow>('/v1/ruxstar/users', token, { q: q.trim() || undefined, status, cursor }),
  getAccount: (token: string, id: string) => apiGet<AccountDetail>(`/v1/ruxstar/users/${id}`, token),
  suspend: (token: string, id: string, reason: string, key: string) =>
    apiPost<AccountDetail>(`/v1/ruxstar/users/${id}/suspend`, { reason }, token, keyed(key)),
  unlock: (token: string, id: string, key: string) => apiPost<AccountDetail>(`/v1/ruxstar/users/${id}/unlock`, undefined, token, keyed(key)),
  signOutEverywhere: (token: string, id: string, key: string) =>
    apiPost<AccountDetail>(`/v1/ruxstar/users/${id}/sign-out`, undefined, token, keyed(key)),

  staff: (token: string) => apiGet<StaffMember[]>('/v1/ruxstar/staff', token),
  saveStaff: (token: string, userId: string, title: string, permissions: Permission[], key: string) =>
    apiPut<StaffMember>(`/v1/ruxstar/staff/${userId}`, token, { title, permissions }, keyed(key)),
  removeStaff: (token: string, userId: string, key: string) => apiDelete<StaffMember>(`/v1/ruxstar/staff/${userId}`, token, undefined, keyed(key)),

  payouts: (token: string, status: PayoutStatus, cursor?: string) => apiGetPage<StaffPayout>('/v1/ruxstar/payouts', token, { status, cursor }),
  /** Asks Cashfree now; it is sent again only if Cashfree never got it. */
  checkPayout: (token: string, id: string) => apiPost<StaffPayout>(`/v1/ruxstar/payouts/${id}/check`, undefined, token),
  heldOrders: (token: string, orderNo?: number, cursor?: string) => apiGetPage<HeldOrder>('/v1/ruxstar/held-orders', token, { orderNo, cursor }),
  /** The reason (5 to 300 characters) goes to the audit log; the vendor is told it was released early. */
  releaseHeld: (token: string, id: string, reason: string, key: string) =>
    apiPost<{ id: string; orderNo: number; amount: number; releasedAt: string }>(`/v1/ruxstar/held-orders/${id}/release`, { reason }, token, keyed(key)),

  modules: (token: string) => apiGet<ModuleSettings[]>('/v1/ruxstar/modules', token),
  updateModule: (token: string, module: ModuleName, patch: ModulePatch, key: string) =>
    apiPatch<ModuleSettings>(`/v1/ruxstar/modules/${module}`, { ...patch }, token, keyed(key)),

  businesses: (token: string, filter: BusinessFilter, cursor?: string) =>
    apiGetPage<BusinessRow>('/v1/ruxstar/businesses', token, { ...filter, q: filter.q?.trim() || undefined, cursor }),
  getBusiness: (token: string, id: string) => apiGet<BusinessCase>(`/v1/ruxstar/businesses/${id}`, token),
  /** The vendor is told the reason. */
  holdBusiness: (token: string, id: string, reason: string, key: string) =>
    apiPost<BusinessCase>(`/v1/ruxstar/businesses/${id}/suspend`, { reason }, token, keyed(key)),
  restoreBusiness: (token: string, id: string, key: string) => apiPost<BusinessCase>(`/v1/ruxstar/businesses/${id}/restore`, undefined, token, keyed(key)),

  audit: (token: string, filter: AuditFilter, cursor?: string) => apiGetPage<AuditEntry>('/v1/ruxstar/audit', token, { ...filter, cursor }),
};
