import { findMock, runMock } from '..';
import type { Engagement, Listing } from '@/types/commerce';
import type { PodOrder, PrintSpecs } from '@/types/pod';

const call = <T = unknown>(path: string, body?: Record<string, unknown>) => {
  const route = findMock('POST', path, 'auto');
  if (!route) throw new Error(`no mock for ${path}`);
  return runMock({ ...route, latencyMs: 0 }, { path, body }) as Promise<T>;
};

const specs: PrintSpecs = { paper: 'A4', color: false, doubleSided: false, copies: 2, pages: 10 };

describe('payments', () => {
  it('declines the first card attempt, then accepts the retry in the same session', async () => {
    const { sessionId } = await call<{ sessionId: string }>('/payments/start', { amount: 100, purpose: 'test' });
    await expect(call('/payments/confirm', { sessionId, method: 'card' })).resolves.toEqual({ status: 'failed' });
    await expect(call('/payments/confirm', { sessionId, method: 'card' })).resolves.toMatchObject({ status: 'paid' });
  });

  it('refuses a zero amount and an unknown session', async () => {
    await expect(call('/payments/start', { amount: 0, purpose: 'x' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(call('/payments/confirm', { sessionId: 'nope', method: 'upi' })).rejects.toMatchObject({ kind: 'not_found' });
  });
});

describe('print orders', () => {
  it('lists print shops in Discover', async () => {
    const listings = await call<Listing[]>('/discover/list', { module: 'pod' });
    expect(listings.length).toBeGreaterThan(0);
    expect(listings.every((l) => l.module === 'pod')).toBe(true);
  });

  it('needs payment and a delivery address, then prices on the server', async () => {
    const base = { shopId: 'sunrise', fileId: 'f1', fileName: 'notes.pdf', specs, fulfilment: 'pickup' };
    await expect(call('/pod/order', base)).rejects.toMatchObject({ status: 402 });
    await expect(call('/pod/order', { ...base, fulfilment: 'delivery', paymentRef: 'P1' })).rejects.toMatchObject({ kind: 'validation' });

    const order = await call<PodOrder>('/pod/order', { ...base, paymentRef: 'P1' });
    expect(order).toMatchObject({ status: 'placed', total: 40, fulfilment: 'pickup' });
  });

  it('moves an order through pickup steps, updates the combined list, and stops at completed', async () => {
    const order = await call<PodOrder>('/pod/order', { shopId: 'sunrise', fileId: 'f2', fileName: 'a.pdf', specs, fulfilment: 'pickup', paymentRef: 'P2' });
    const steps: string[] = [];
    for (let i = 0; i < 4; i += 1) steps.push((await call<PodOrder>('/pod/vendor/advance', { id: order.id })).status);
    expect(steps).toEqual(['accepted', 'printing', 'ready', 'completed']);
    await expect(call('/pod/vendor/advance', { id: order.id })).rejects.toMatchObject({ kind: 'conflict' });

    const mine = await call<Engagement[]>('/orders/list');
    expect(mine.find((e) => e.refId === order.id)).toMatchObject({ module: 'pod', status: 'completed' });
  });
});
