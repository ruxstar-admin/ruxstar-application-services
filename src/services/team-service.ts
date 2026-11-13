import { apiDelete, apiGet, apiGetPage, apiPatch, apiPost, apiPostBytes, newIdempotencyKey } from '@/lib/api-client';
import type { Business, BusinessUpdate, PodSetupUpdate } from '@/types/business';
import type { CouponPatch, ManagedCoupon, NewCoupon } from '@/types/coupon';
import type { ActivityEntry, Team, TeamMember, TeamPermission, Work, WorkPlace } from '@/types/team';

type Done = { done: true };
const team = (businessId: string) => `/v1/vendor/businesses/${encodeURIComponent(businessId)}/team`;
const work = (id: string) => `/v1/employment/${encodeURIComponent(id)}`;

/** An owner's team at one business (`/v1/vendor/businesses/:id/team`). Only the owner manages it. */
export const TeamService = {
  get: (token: string, businessId: string) => apiGet<Team>(team(businessId), token),
  invite: (token: string, businessId: string, username: string, permissions: TeamPermission[], idempotencyKey = newIdempotencyKey()) =>
    apiPost<TeamMember>(team(businessId), { username, permissions }, token, { idempotencyKey }),
  setPermissions: (token: string, businessId: string, memberId: string, permissions: TeamPermission[]) =>
    apiPatch<TeamMember>(`${team(businessId)}/${encodeURIComponent(memberId)}`, { permissions }, token),
  /** Removes a member or cancels an invite. */
  remove: (token: string, businessId: string, memberId: string) => apiDelete<Done>(`${team(businessId)}/${encodeURIComponent(memberId)}`, token),
  /** What happened at the business, newest first; `by` is one person's (a user id). */
  activity: (token: string, businessId: string, by?: string, cursor?: string) =>
    apiGetPage<ActivityEntry>(`/v1/vendor/businesses/${encodeURIComponent(businessId)}/activity`, token, { by, cursor }),
};

/** The Work area (`/v1/employment`): team invites and the businesses you work at. */
export const WorkService = {
  get: (token: string) => apiGet<Work>('/v1/employment', token),
  accept: (token: string, id: string) => apiPost<WorkPlace>(`${work(id)}/accept`, undefined, token),
  decline: (token: string, id: string) => apiPost<Done>(`${work(id)}/decline`, undefined, token),
  leave: (token: string, id: string) => apiPost<Done>(`${work(id)}/leave`, undefined, token),
};

/**
 * The shop someone works at (`/v1/employment/:id/shop`), by their place id, with the same calls as `BusinessService`.
 * Each needs its permission; the GSTIN stays with the owner.
 */
export const TeamShopService = {
  get: (token: string, placeId: string) => apiGet<Business>(`${work(placeId)}/shop`, token),
  update: (token: string, placeId: string, changes: BusinessUpdate) => apiPatch<Business>(`${work(placeId)}/shop`, { ...changes }, token),
  updatePod: (token: string, placeId: string, changes: PodSetupUpdate) => apiPatch<Business>(`${work(placeId)}/shop/pod`, { ...changes }, token),
  addPhoto: (token: string, placeId: string, jpeg: Uint8Array<ArrayBuffer>) =>
    apiPostBytes<Business>(`${work(placeId)}/shop/photos`, { data: jpeg, type: 'image/jpeg' }, token),
  removePhoto: (token: string, placeId: string, photoId: string) =>
    apiDelete<Business>(`${work(placeId)}/shop/photos/${encodeURIComponent(photoId)}`, token),
  setOpen: (token: string, placeId: string, open: boolean) => apiPost<Business>(`${work(placeId)}/shop/${open ? 'open' : 'close'}`, undefined, token),
};

/** The shop's coupons for someone on its team. New ones work at this shop alone; ones for several shops stay with the owner. */
export const TeamCouponService = {
  list: (token: string, placeId: string, cursor?: string) => apiGetPage<ManagedCoupon>(`${work(placeId)}/coupons`, token, { cursor }),
  create: (token: string, placeId: string, body: NewCoupon, idempotencyKey = newIdempotencyKey()) =>
    apiPost<ManagedCoupon>(`${work(placeId)}/coupons`, { ...body }, token, { idempotencyKey }),
  update: (token: string, placeId: string, id: string, patch: CouponPatch) =>
    apiPatch<ManagedCoupon>(`${work(placeId)}/coupons/${encodeURIComponent(id)}`, { ...patch }, token),
};
