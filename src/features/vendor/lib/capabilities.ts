import type { ModuleKey } from '@/types/vendor';

export interface Capability {
  key: string;
  label: string;
}

export interface ModuleInfo {
  key: ModuleKey;
  label: string;
  capabilities: Capability[];
}

/** What an owner may hand to staff, per business module (scope review #1: a subset of that module's capabilities). */
export const MODULES: Record<ModuleKey, ModuleInfo> = {
  pod: {
    key: 'pod',
    label: 'Print on demand',
    capabilities: [
      { key: 'view_orders', label: 'View orders' },
      { key: 'update_status', label: 'Update order status' },
      { key: 'assign_delivery', label: 'Assign delivery' },
      { key: 'manage_coupons', label: 'Manage coupons' },
    ],
  },
  events: {
    key: 'events',
    label: 'Events',
    capabilities: [
      { key: 'manage_events', label: 'Create and edit events' },
      { key: 'scan_attendance', label: 'Scan attendance' },
      { key: 'manage_registrations', label: 'Manage registrations' },
    ],
  },
  coaching: {
    key: 'coaching',
    label: 'Coaching',
    capabilities: [
      { key: 'manage_batches', label: 'Manage batches' },
      { key: 'mark_attendance', label: 'Mark attendance' },
      { key: 'post_updates', label: 'Post class updates' },
    ],
  },
  pg: {
    key: 'pg',
    label: 'PG / hostel',
    capabilities: [
      { key: 'manage_rooms', label: 'Manage rooms and beds' },
      { key: 'manage_bookings', label: 'Manage bookings' },
      { key: 'update_availability', label: 'Update availability' },
    ],
  },
};

/** Never delegable: they stay with the owner and the admin. Shown to staff as locked. */
export const OWNER_ONLY_ACTIONS = ['Payout account', 'Delete the module', 'Transfer ownership', 'Turn the module off'] as const;

export const isGrantable = (module: ModuleKey, capability: string) => MODULES[module].capabilities.some((c) => c.key === capability);

export const labelFor = (module: ModuleKey, capability: string) =>
  MODULES[module].capabilities.find((c) => c.key === capability)?.label ?? capability;
