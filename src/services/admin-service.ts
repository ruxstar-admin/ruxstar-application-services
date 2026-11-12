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
  ModuleName,
  ModulePatch,
  ModuleSettings,
  Overview,
  Permission,
  PersonCase,
  ReportCase,
  ReportStatus,
  ReviewCase,
  ReviewStatus,
  StaffMember,
} from '@/types/admin';

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
