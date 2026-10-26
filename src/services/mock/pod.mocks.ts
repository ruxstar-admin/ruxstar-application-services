import { ApiError } from '@/lib/api-error';
import { MAX_COPIES, MAX_PAGES, nextStatus, quotePod, STATUS_LABEL } from '@/features/pod/lib/pricing';
import type { Fulfilment, PodOrder, PodStatus, PrintShop, PrintSpecs } from '@/types/pod';
import { recordEngagement, registerCanceller, registerListings, updateEngagement } from './commerce-state';
import { createDeliveryJob, setDeliveredHandler } from './delivery.mocks';
import { defineMocks } from './registry';

const SHOPS: PrintShop[] = [
  { id: 'sunrise', name: 'Sunrise Print Works', area: 'Madhapur', rating: 4.7, turnaround: 'Under 1 hour', bwRate: 2, colorRate: 8 },
  { id: 'copycat', name: 'CopyCat Xerox', area: 'Gachibowli', rating: 4.4, turnaround: 'Same day', bwRate: 1.5, colorRate: 7 },
  { id: 'inkwell', name: 'Inkwell Studio', area: 'Banjara Hills', rating: 4.9, turnaround: '2 hours', bwRate: 3, colorRate: 10 },
];

let orders: PodOrder[] = [];
let counter = 2480;

const field = (body: Record<string, unknown> | undefined, key: string) => String(body?.[key] ?? '');
const shopOf = (id: string) => {
  const shop = SHOPS.find((s) => s.id === id);
  if (!shop) throw new ApiError(404, 'Shop not found');
  return shop;
};
const orderOf = (id: string) => {
  const order = orders.find((o) => o.id === id);
  if (!order) throw new ApiError(404, 'Order not found');
  return order;
};

/** A partner finishing the delivery completes the print order too. */
setDeliveredHandler((orderRef) => {
  const order = orders.find((o) => o.id === orderRef);
  if (!order) return;
  order.status = 'completed';
  order.timeline = [...order.timeline, { status: 'completed', at: new Date().toISOString() }];
  updateEngagement(order.id, { status: 'completed', subtitle: `${order.shopName} · ${STATUS_LABEL.completed}` });
});

registerCanceller('pod', (refId) => {
  const order = orderOf(refId);
  return {
    completed: order.status === 'completed',
    apply: () => {
      order.status = 'cancelled';
      order.timeline = [...order.timeline, { status: 'cancelled', at: new Date().toISOString() }];
    },
  };
});

registerListings(() =>
  SHOPS.map((s) => ({
    id: s.id,
    module: 'pod' as const,
    title: s.name,
    subtitle: `${s.area} · ${s.turnaround}`,
    price: `from ₹${s.bwRate} / page`,
    badge: `★ ${s.rating}`,
  })),
);

defineMocks({
  'POST /pod/shop': { mocked: true, handle: ({ body }) => ({ ...shopOf(field(body, 'id')) }) },

  /** Page count is derived from the file name so the demo is deterministic. */
  'POST /pod/upload': {
    mocked: true,
    latencyMs: 700,
    handle: ({ body }) => {
      const name = field(body, 'name');
      if (!name) throw new ApiError(400, 'No file');
      return { fileId: `file-${Date.now()}`, pages: 5 + (name.length % 20) };
    },
  },

  'POST /pod/order': {
    mocked: true,
    latencyMs: 500,
    handle: ({ body }) => {
      const shop = shopOf(field(body, 'shopId'));
      const specs = body?.specs as PrintSpecs;
      const fulfilment = field(body, 'fulfilment') as Fulfilment;
      if (!field(body, 'paymentRef')) throw new ApiError(402, 'Payment required');
      if (specs.copies < 1 || specs.copies > MAX_COPIES || specs.pages < 1 || specs.pages > MAX_PAGES) throw new ApiError(400, 'Invalid print specs');
      if (fulfilment === 'delivery' && !field(body, 'address').trim()) throw new ApiError(400, 'Delivery address required');

      const quote = quotePod(shop, specs, fulfilment);
      const now = new Date().toISOString();
      const order: PodOrder = {
        id: `POD-${++counter}`,
        shopId: shop.id,
        shopName: shop.name,
        fileName: field(body, 'fileName'),
        specs,
        fulfilment,
        address: field(body, 'address') || undefined,
        deliveryCode: fulfilment === 'delivery' ? String(1000 + Math.floor(Math.random() * 9000)) : undefined,
        status: 'placed',
        lines: quote.lines,
        total: quote.total,
        createdAt: now,
        timeline: [{ status: 'placed', at: now }],
      };
      orders = [order, ...orders];
      recordEngagement({
        module: 'pod',
        title: `Print order ${order.id}`,
        subtitle: `${shop.name} · ${STATUS_LABEL.placed}`,
        amount: order.total,
        status: 'confirmed',
        refId: order.id,
        paymentRef: field(body, 'paymentRef'),
      });
      return { ...order };
    },
  },

  'POST /pod/order/get': { mocked: true, handle: ({ body }) => ({ ...orderOf(field(body, 'id')) }) },

  /** Vendor view: orders that are not finished yet, oldest first. */
  'POST /pod/vendor/orders': {
    mocked: true,
    handle: () => orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').map((o) => ({ ...o })).reverse(),
  },

  'POST /pod/vendor/advance': {
    mocked: true,
    latencyMs: 250,
    handle: ({ body }) => {
      const order = orderOf(field(body, 'id'));
      const next = nextStatus(order.status, order.fulfilment) as PodStatus | undefined;
      if (!next) throw new ApiError(409, 'Order is already finished');
      order.status = next;
      order.timeline = [...order.timeline, { status: next, at: new Date().toISOString() }];
      if (next === 'ready' && order.fulfilment === 'delivery') {
        const area = (order.address ?? '').split(',').pop()?.trim() || 'Customer';
        createDeliveryJob({
          orderRef: order.id,
          shopName: order.shopName,
          pickupArea: shopOf(order.shopId).area,
          dropArea: area,
          fee: order.lines.find((l) => l.kind === 'delivery')?.amount ?? 0,
          code: order.deliveryCode ?? '1234',
        });
      }
      updateEngagement(order.id, {
        status: next === 'completed' ? 'completed' : 'in_progress',
        subtitle: `${order.shopName} · ${STATUS_LABEL[next]}`,
      });
      return { ...order };
    },
  },
});
