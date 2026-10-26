export type ModuleKey = 'pod' | 'events' | 'coaching' | 'pg';

export interface VendorBusiness {
  id: string;
  name: string;
  modules: ModuleKey[];
  open: boolean;
}

export interface Earnings {
  total: number;
  withdrawable: number;
  withdrawn: number;
}

export interface AuditEntry {
  id: string;
  /** Who did it: "You" or a staff member's name. */
  actor: string;
  action: string;
  at: string;
}

export interface VendorSummary {
  business: VendorBusiness;
  earnings: Earnings;
  openOrders: number;
  registrations: number;
  students: number;
  activity: AuditEntry[];
}

/**
 * `invited`: waiting for the user to accept · `requested`: the user asked to join, waiting for the owner ·
 * `pending_kyc`: accepted, but the grant stays off until the person's base KYC is approved · `active`.
 */
export type StaffStatus = 'invited' | 'requested' | 'pending_kyc' | 'active';

export interface Staff {
  id: string;
  name: string;
  username: string;
  module: ModuleKey;
  status: StaffStatus;
  /** Capability keys granted for the module. Never includes owner-only actions. */
  capabilities: string[];
}
