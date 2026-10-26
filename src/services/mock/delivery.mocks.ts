import { ApiError } from '@/lib/api-error';
import type { DeliveryJob, PartnerEarnings, PartnerHome } from '@/types/delivery';
import { defineMocks } from './registry';

const HOUR = 3_600_000;
const ago = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();

let online = true;
let onlineSince = Date.now() - 5 * HOUR;
let jobs: DeliveryJob[] = [
  { id: 'dj1', orderRef: 'seed-1', shopName: 'CopyCat Xerox', pickupArea: 'Gachibowli', dropArea: 'Kondapur', fee: 58, distanceKm: 3.2, status: 'offered', createdAt: ago(0.1) },
  { id: 'dj2', orderRef: 'seed-2', shopName: 'Inkwell Studio', pickupArea: 'Banjara Hills', dropArea: 'Jubilee Hills', fee: 72, distanceKm: 4.8, status: 'offered', createdAt: ago(0.2) },
  { id: 'dj3', orderRef: 'seed-3', shopName: 'Sunrise Print Works', pickupArea: 'Madhapur', dropArea: 'Hitec City', fee: 40, distanceKm: 1.9, status: 'delivered', createdAt: ago(26), deliveredAt: ago(25) },
  { id: 'dj4', orderRef: 'seed-4', shopName: 'Claymate Studio', pickupArea: 'Jubilee Hills', dropArea: 'Madhapur', fee: 58, distanceKm: 3.4, status: 'delivered', createdAt: ago(30), deliveredAt: ago(29) },
];
const codes = new Map<string, string>();
let counter = 10;

/** Set by the print-on-demand mock: called when a partner completes a delivery, so the order can finish. */
let onDelivered: ((orderRef: string) => void) | undefined;
export const setDeliveredHandler = (handler: (orderRef: string) => void) => {
  onDelivered = handler;
};

/** A ready delivery order creates one job immediately, offered to the partner pool (scope review #14). */
export const createDeliveryJob = (job: { orderRef: string; shopName: string; pickupArea: string; dropArea: string; fee: number; code: string }) => {
  const created: DeliveryJob = {
    id: `dj${++counter}`,
    orderRef: job.orderRef,
    shopName: job.shopName,
    pickupArea: job.pickupArea,
    dropArea: job.dropArea,
    fee: job.fee,
    distanceKm: 3,
    status: 'offered',
    createdAt: new Date().toISOString(),
  };
  codes.set(created.id, job.code);
  jobs = [created, ...jobs];
};

const field = (body: Record<string, unknown> | undefined, key: string) => String(body?.[key] ?? '');
const jobOf = (id: string) => {
  const found = jobs.find((j) => j.id === id);
  if (!found) throw new ApiError(404, 'Job not found');
  return found;
};
const startOfToday = () => new Date(new Date().setHours(0, 0, 0, 0)).getTime();
const deliveredToday = () => jobs.filter((j) => j.status === 'delivered' && new Date(j.deliveredAt ?? 0).getTime() >= startOfToday());
const active = () => jobs.find((j) => j.status === 'accepted' || j.status === 'picked_up');

defineMocks({
  'POST /delivery/home': {
    mocked: true,
    latencyMs: 300,
    handle: (): PartnerHome => ({
      stats: {
        online,
        earnedToday: deliveredToday().reduce((sum, j) => sum + j.fee, 0),
        dropsToday: deliveredToday().length,
        onlineMinutes: online ? Math.round((Date.now() - onlineSince) / 60_000) : 0,
      },
      active: active() && { ...(active() as DeliveryJob) },
      waiting: online ? jobs.filter((j) => j.status === 'offered').map((j) => ({ ...j })) : [],
      recent: jobs.filter((j) => j.status === 'delivered').slice(0, 5).map((j) => ({ ...j })),
    }),
  },

  'POST /delivery/online': {
    mocked: true,
    latencyMs: 150,
    handle: ({ body }) => {
      if (body?.online === false && active()) throw new ApiError(409, 'Finish your current delivery first');
      if (body?.online === true && !online) onlineSince = Date.now();
      online = body?.online === true;
      return { online };
    },
  },

  /** One active job at a time, and only while online. */
  'POST /delivery/accept': {
    mocked: true,
    handle: ({ body }) => {
      const job = jobOf(field(body, 'id'));
      if (!online) throw new ApiError(409, 'Go online to accept jobs');
      if (active()) throw new ApiError(409, 'You already have a delivery in progress');
      if (job.status !== 'offered') throw new ApiError(409, 'This job is no longer available');
      job.status = 'accepted';
      return { ...job };
    },
  },

  /** Passing hands the offer on (to the next source) — it leaves this partner's list. */
  'POST /delivery/pass': {
    mocked: true,
    handle: ({ body }) => {
      const job = jobOf(field(body, 'id'));
      if (job.status !== 'offered') throw new ApiError(409, 'This job is no longer available');
      jobs = jobs.filter((j) => j.id !== job.id);
      return { message: 'Passed' };
    },
  },

  'POST /delivery/advance': {
    mocked: true,
    latencyMs: 250,
    handle: ({ body }) => {
      const job = jobOf(field(body, 'id'));
      if (job.status === 'accepted') {
        job.status = 'picked_up';
      } else if (job.status === 'picked_up') {
        const expected = codes.get(job.id) ?? '1234';
        if (field(body, 'code') !== expected) throw new ApiError(401, 'Wrong delivery code');
        job.status = 'delivered';
        job.deliveredAt = new Date().toISOString();
        onDelivered?.(job.orderRef);
      } else {
        throw new ApiError(409, 'Nothing to advance');
      }
      return { ...job };
    },
  },

  'POST /delivery/earnings': {
    mocked: true,
    handle: (): PartnerEarnings => {
      const delivered = jobs.filter((j) => j.status === 'delivered');
      const weekAgo = Date.now() - 7 * 24 * HOUR;
      const sum = (list: DeliveryJob[]) => list.reduce((total, j) => total + j.fee, 0);
      return {
        today: sum(deliveredToday()),
        week: sum(delivered.filter((j) => new Date(j.deliveredAt ?? 0).getTime() >= weekAgo)),
        total: sum(delivered),
        items: delivered.map((j) => ({ ...j })),
      };
    },
  },
});
