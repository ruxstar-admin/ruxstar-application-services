import { ApiError } from '@/lib/api-error';
import { isGrantable } from '@/features/vendor/lib/capabilities';
import type { Page } from '@/types/social';
import type { AuditEntry, ModuleKey, Staff, VendorSummary } from '@/types/vendor';
import { earningsSummary } from './commerce-state';
import { defineMocks } from './registry';

const PAGE_SIZE = 15;
const HOUR = 3_600_000;
const ago = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();

const business = { id: 'biz1', name: 'Sunrise Print Works', modules: ['pod'] as ModuleKey[], open: true };

let audit: AuditEntry[] = [
  { id: 'a1', actor: 'Meera S', action: 'moved POD 2481 to In production', at: ago(2) },
  { id: 'a2', actor: 'You', action: 'created coupon FLEX10', at: ago(26) },
  { id: 'a3', actor: 'You', action: 'updated store hours to 9am to 8pm', at: ago(72) },
  { id: 'a4', actor: 'Meera S', action: 'assigned delivery for POD 2470', at: ago(80) },
];

let staff: Staff[] = [
  { id: 'st1', name: 'Meera Joshi', username: 'meera.j', module: 'pod', status: 'active', capabilities: ['view_orders', 'update_status'] },
  { id: 'st2', name: 'Arjun Rao', username: 'arjun.rao', module: 'pod', status: 'requested', capabilities: [] },
  { id: 'st3', name: 'Sana Sheikh', username: 'sana.s', module: 'pod', status: 'pending_kyc', capabilities: ['view_orders'] },
];

let nextId = 100;
const OPEN_WORK_PER_STAFF = 2;

const text = (body: Record<string, unknown> | undefined, key: string) => String(body?.[key] ?? '');
const log = (action: string, actor = 'You') => {
  audit = [{ id: `a${nextId++}`, actor, action, at: new Date().toISOString() }, ...audit];
};
const member = (id: string) => {
  const found = staff.find((s) => s.id === id);
  if (!found) throw new ApiError(404, 'Staff member not found');
  return found;
};

defineMocks({
  'POST /vendor/summary': {
    mocked: true,
    latencyMs: 350,
    handle: (): VendorSummary => ({
      business: { ...business },
      earnings: (({ total, withdrawable, withdrawn }) => ({ total, withdrawable, withdrawn }))(earningsSummary()),
      openOrders: 3,
      registrations: 86,
      students: 24,
      activity: audit.slice(0, 4),
    }),
  },

  'POST /vendor/store/toggle': {
    mocked: true,
    handle: ({ body }) => {
      business.open = body?.open === true;
      log(business.open ? 'opened the store' : 'closed the store');
      return { open: business.open };
    },
  },

  'POST /vendor/team': { mocked: true, handle: () => staff.map((s) => ({ ...s })) },

  'POST /vendor/team/invite': {
    mocked: true,
    handle: ({ body }) => {
      const module = text(body, 'module') as ModuleKey;
      const capabilities = (body?.capabilities as string[] | undefined) ?? [];
      if (capabilities.some((c) => !isGrantable(module, c))) throw new ApiError(403, 'Owner-only actions cannot be granted');
      if (staff.some((s) => s.username === text(body, 'username') && s.module === module)) throw new ApiError(409, 'Already on the team');
      const invited: Staff = { id: `st${nextId++}`, name: text(body, 'name'), username: text(body, 'username'), module, status: 'invited', capabilities };
      staff = [invited, ...staff];
      log(`invited ${invited.name} to join`);
      return { ...invited };
    },
  },

  'POST /vendor/team/respond': {
    mocked: true,
    handle: ({ body }) => {
      const found = member(text(body, 'id'));
      if (found.status !== 'requested') throw new ApiError(409, 'Nothing to answer');
      if (body?.accept === true) {
        found.status = 'pending_kyc';
        log(`accepted ${found.name}'s request to join`);
      } else {
        staff = staff.filter((s) => s.id !== found.id);
        log(`declined ${found.name}'s request to join`);
      }
      return { message: 'Done' };
    },
  },

  'POST /vendor/team/capabilities': {
    mocked: true,
    handle: ({ body }) => {
      const found = member(text(body, 'id'));
      const capabilities = (body?.capabilities as string[] | undefined) ?? [];
      if (capabilities.some((c) => !isGrantable(found.module, c))) throw new ApiError(403, 'Owner-only actions cannot be granted');
      found.capabilities = capabilities;
      log(`changed ${found.name}'s permissions`);
      return { ...found };
    },
  },

  'POST /vendor/team/revoke': {
    mocked: true,
    handle: ({ body }) => {
      const found = member(text(body, 'id'));
      staff = staff.filter((s) => s.id !== found.id);
      log(`revoked ${found.name}'s access`);
      // Open work returns to the owner (scope review #1).
      return { message: 'Access revoked', returnedOrders: found.status === 'active' ? OPEN_WORK_PER_STAFF : 0 };
    },
  },

  'POST /vendor/audit': {
    mocked: true,
    handle: ({ body }): Page<AuditEntry> => {
      const start = body?.cursor ? Number(body.cursor) : 0;
      const end = start + PAGE_SIZE;
      return { items: audit.slice(start, end), nextCursor: end < audit.length ? String(end) : null };
    },
  },
});
