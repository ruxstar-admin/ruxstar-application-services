import { findMock, runMock } from '..';
import type { DeliveryJob, PartnerEarnings, PartnerHome } from '@/types/delivery';
import type { PodOrder, PrintSpecs } from '@/types/pod';

const call = <T = unknown>(path: string, body?: Record<string, unknown>) => {
  const route = findMock('POST', path, 'auto');
  if (!route) throw new Error(`no mock for ${path}`);
  return runMock({ ...route, latencyMs: 0 }, { path, body }) as Promise<T>;
};

const specs: PrintSpecs = { paper: 'A4', color: false, doubleSided: false, copies: 1, pages: 10 };

describe('duty and offers', () => {
  it('only accepts jobs while online, and passing removes the offer', async () => {
    await call('/delivery/online', { online: false });
    await expect(call('/delivery/accept', { id: 'dj1' })).rejects.toMatchObject({ kind: 'conflict' });
    expect((await call<PartnerHome>('/delivery/home')).waiting).toEqual([]);

    await call('/delivery/online', { online: true });
    await call('/delivery/pass', { id: 'dj2' });
    const home = await call<PartnerHome>('/delivery/home');
    expect(home.waiting.map((j) => j.id)).not.toContain('dj2');
  });
});

describe('a delivery from a print order', () => {
  it('creates a job when the order is ready, then completes the order when the partner delivers with the right code', async () => {
    const order = await call<PodOrder>('/pod/order', {
      shopId: 'sunrise',
      fileId: 'f',
      fileName: 'a.pdf',
      specs,
      fulfilment: 'delivery',
      address: '12 Rose Street, Madhapur',
      paymentRef: 'P-DELIVERY',
    });
    expect(order.deliveryCode).toMatch(/^\d{4}$/);

    for (let i = 0; i < 3; i += 1) await call('/pod/vendor/advance', { id: order.id });
    const offers = (await call<PartnerHome>('/delivery/home')).waiting;
    const job = offers.find((j) => j.orderRef === order.id) as DeliveryJob;
    expect(job).toMatchObject({ shopName: 'Sunrise Print Works', dropArea: 'Madhapur', status: 'offered' });

    await call('/delivery/accept', { id: job.id });
    await expect(call('/delivery/accept', { id: 'dj1' })).rejects.toMatchObject({ kind: 'conflict' });
    await expect(call('/delivery/online', { online: false })).rejects.toMatchObject({ kind: 'conflict' });

    await expect(call<DeliveryJob>('/delivery/advance', { id: job.id })).resolves.toMatchObject({ status: 'picked_up' });
    await expect(call('/delivery/advance', { id: job.id, code: '0000' })).rejects.toMatchObject({ kind: 'unauthorized' });
    await expect(call<DeliveryJob>('/delivery/advance', { id: job.id, code: order.deliveryCode })).resolves.toMatchObject({ status: 'delivered' });

    await expect(call<PodOrder>('/pod/order/get', { id: order.id })).resolves.toMatchObject({ status: 'completed' });
    const earnings = await call<PartnerEarnings>('/delivery/earnings');
    expect(earnings.items.some((j) => j.id === job.id)).toBe(true);
    expect(earnings.today).toBeGreaterThanOrEqual(job.fee);
  });
});
