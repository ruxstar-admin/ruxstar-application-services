/** Mirrors ruxstar-backend-services/constants/roles.js */
export const ROLES = {
  ADMIN: 'admin',
  VENDOR: 'vendor',
  EMPLOYEE: 'employee',
  DELIVERY: 'delivery',
  CUSTOMER: 'customer',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
