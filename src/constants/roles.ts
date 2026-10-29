/**
 * Mirrors the API's `user.roles` object (Architecture decision 34). Every account is a User; these
 * stack on top. Vendor staff is not a role here: it comes from a vendor's team (employments).
 */
export const ROLES = {
  VENDOR: 'vendor',
  DELIVERY: 'delivery',
  RUXSTAR_STAFF: 'ruxstarStaff',
  ADMIN: 'admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export type RoleFlags = Record<Role, boolean>;

export const rolesFrom = (flags: RoleFlags): Role[] => Object.values(ROLES).filter((role) => flags[role]);
