import type { BusinessModule } from '@/types/business';

/** What an owner can give a team member at one business. Withdrawals, payment details, publishing, deleting and the team stay with the owner. */
export type TeamPermission =
  | 'orders.view'
  | 'orders.move'
  | 'orders.reject'
  | 'orders.refund'
  | 'earnings.view'
  | 'shop.open'
  | 'shop.catalog'
  | 'shop.details'
  | 'coupons.manage'
  | 'posts.create';

/** One permission as the API describes it. `needs` is given along with it. */
export interface PermissionInfo {
  key: TeamPermission;
  label: string;
  hint: string | null;
  needs: TeamPermission | null;
}

/** `waiting`: joined, but nothing works until their identity verification is approved. */
export type MemberStatus = 'invited' | 'waiting' | 'active';

export interface TeamMember {
  id: string;
  person: { id: string; name: string; username: string | null; avatar: string | null };
  status: MemberStatus;
  permissions: TeamPermission[];
  invitedAt: string;
  /** While invited. */
  expiresAt: string | null;
  joinedAt: string | null;
}

/** GET /v1/vendor/businesses/:id/team. Invites count towards `max`. */
export interface Team {
  members: TeamMember[];
  permissions: PermissionInfo[];
  max: number;
}

export interface WorkBusiness {
  id: string;
  name: string;
  module: BusinessModule;
  type: string;
  city: string | null;
  photo: string | null;
  status: 'draft' | 'live';
  open: boolean;
}

export interface WorkInvite {
  id: string;
  business: WorkBusiness;
  owner: { name: string };
  permissions: TeamPermission[];
  invitedAt: string;
  expiresAt: string;
}

/** `verify`: get verified first. `on_hold`: Ruxstar has the business on hold. */
export type WorkAccess = 'on' | 'verify' | 'on_hold';

export interface WorkPlace {
  id: string;
  business: WorkBusiness;
  owner: { name: string };
  permissions: TeamPermission[];
  joinedAt: string;
  access: WorkAccess;
}

/** GET /v1/employment: your invites and the businesses you work at. */
export interface Work {
  invites: WorkInvite[];
  places: WorkPlace[];
  permissions: PermissionInfo[];
}
