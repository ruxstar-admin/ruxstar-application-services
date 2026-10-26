import { findMock, runMock } from '..';
import type { Page } from '@/types/social';
import type { AuditEntry, Staff, VendorSummary } from '@/types/vendor';

const call = <T = unknown>(path: string, body?: Record<string, unknown>) => {
  const route = findMock('POST', path, 'auto');
  if (!route) throw new Error(`no mock for ${path}`);
  return runMock({ ...route, latencyMs: 0 }, { path, body }) as Promise<T>;
};

const team = () => call<Staff[]>('/vendor/team');

describe('vendor portal', () => {
  it('toggles the store and records it in the audit log', async () => {
    await call('/vendor/store/toggle', { open: false });
    const summary = await call<VendorSummary>('/vendor/summary');
    expect(summary.business.open).toBe(false);
    expect(summary.activity[0]).toMatchObject({ actor: 'You', action: 'closed the store' });
  });
});

describe('employment', () => {
  it('invites staff with delegable capabilities only', async () => {
    const invited = await call<Staff>('/vendor/team/invite', {
      userId: 'u-rahul',
      name: 'Rahul Verma',
      username: 'rahul.v',
      module: 'pod',
      capabilities: ['view_orders'],
    });
    expect(invited.status).toBe('invited');

    await expect(
      call('/vendor/team/invite', { userId: 'u-x', name: 'X', username: 'x', module: 'pod', capabilities: ['payout_account'] }),
    ).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(
      call('/vendor/team/invite', { userId: 'u-rahul', name: 'Rahul Verma', username: 'rahul.v', module: 'pod', capabilities: ['view_orders'] }),
    ).rejects.toMatchObject({ kind: 'conflict' });
  });

  it('never lets owner-only actions be granted to existing staff', async () => {
    await expect(call('/vendor/team/capabilities', { id: 'st1', capabilities: ['delete_module'] })).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(call('/vendor/team/capabilities', { id: 'st1', capabilities: ['view_orders', 'assign_delivery'] })).resolves.toMatchObject({
      capabilities: ['view_orders', 'assign_delivery'],
    });
  });

  it('accepts a join request into the KYC-gated state, and declining removes it', async () => {
    await call('/vendor/team/respond', { id: 'st2', accept: true });
    expect((await team()).find((s) => s.id === 'st2')?.status).toBe('pending_kyc');
    await expect(call('/vendor/team/respond', { id: 'st2', accept: true })).rejects.toMatchObject({ kind: 'conflict' });
  });

  it('returns open work to the owner when active staff are revoked, and audits it', async () => {
    const result = await call<{ returnedOrders: number }>('/vendor/team/revoke', { id: 'st1' });
    expect(result.returnedOrders).toBeGreaterThan(0);
    expect((await team()).some((s) => s.id === 'st1')).toBe(false);

    const page = await call<Page<AuditEntry>>('/vendor/audit');
    expect(page.items[0].action).toContain('revoked');
  });
});
