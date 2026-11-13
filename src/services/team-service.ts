import { apiDelete, apiGet, apiPatch, apiPost, newIdempotencyKey } from '@/lib/api-client';
import type { Team, TeamMember, TeamPermission, Work, WorkPlace } from '@/types/team';

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
};

/** The Work area (`/v1/employment`): team invites and the businesses you work at. */
export const WorkService = {
  get: (token: string) => apiGet<Work>('/v1/employment', token),
  accept: (token: string, id: string) => apiPost<WorkPlace>(`${work(id)}/accept`, undefined, token),
  decline: (token: string, id: string) => apiPost<Done>(`${work(id)}/decline`, undefined, token),
  leave: (token: string, id: string) => apiPost<Done>(`${work(id)}/leave`, undefined, token),
};
