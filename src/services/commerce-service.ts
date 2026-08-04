/**
 * CommerceService — all commerce API calls.
 * Mirrors: ruxstar-frontend-services/lib/api.ts (commerce section, lines ~4400–4680)
 */

import { API_URL } from '@/constants/config';

const BASE = API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

export type CommerceProduct = {
  id: string;
  businessId: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  active: boolean;
  coverUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CommerceOrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  coverUrl: string | null;
};

export type CommerceOrder = {
  id: string;
  customerName: string;
  customerMobile: string;
  vendorId: string | null;
  businessId: string | null;
  businessName: string;
  vendorName: string;
  vendorMobile: string | null;
  items: CommerceOrderItem[];
  notes: string;
  amount: number;
  currency: string;
  status: string;
  paymentStatus: string | null;
  paymentRefId: string | null;
  paidAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CommerceShop = {
  id: string;
  name: string;
  address: string;
  description: string;
  thumbnailUrl: string;
  notes: string;
  minOrderValue: number;
  productCount?: number;
  inStockCount?: number;
  acceptingOrders: boolean;
};

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}/${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const d = data as Record<string, unknown>;
    const msg =
      (typeof d.message === 'string' && d.message) ||
      (typeof d.error === 'string' && d.error) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function normalizeProduct(raw: unknown): CommerceProduct | null {
  const p = asRecord(raw);
  const id = typeof p.id === 'string' ? p.id : '';
  if (!id) return null;
  return {
    id,
    businessId: typeof p.businessId === 'string' ? p.businessId : '',
    vendorId:   typeof p.vendorId   === 'string' ? p.vendorId   : '',
    name:        typeof p.name        === 'string' ? p.name        : '',
    description: typeof p.description === 'string' ? p.description : '',
    price:  typeof p.price  === 'number' ? p.price  : 0,
    stock:  typeof p.stock  === 'number' ? p.stock  : 0,
    active: p.active !== false,
    coverUrl: typeof p.coverUrl === 'string' ? p.coverUrl : null,
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : undefined,
    updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : undefined,
  };
}

function normalizeOrder(raw: unknown): CommerceOrder | null {
  const o = asRecord(raw);
  const id = typeof o.id === 'string' ? o.id : '';
  if (!id) return null;
  const items = Array.isArray(o.items)
    ? o.items.map((it) => {
        const row = asRecord(it);
        return {
          productId: typeof row.productId === 'string' ? row.productId : '',
          name:      typeof row.name      === 'string' ? row.name      : '',
          price:     typeof row.price     === 'number' ? row.price     : 0,
          quantity:  typeof row.quantity  === 'number' ? row.quantity  : 0,
          coverUrl:  typeof row.coverUrl  === 'string' ? row.coverUrl  : null,
        };
      })
    : [];
  return {
    id,
    customerName:   typeof o.customerName   === 'string' ? o.customerName   : '',
    customerMobile: typeof o.customerMobile === 'string' ? o.customerMobile : '',
    vendorId:       typeof o.vendorId       === 'string' ? o.vendorId       : null,
    businessId:     typeof o.businessId     === 'string' ? o.businessId     : null,
    businessName:   typeof o.businessName   === 'string' ? o.businessName   : '',
    vendorName:     typeof o.vendorName     === 'string' ? o.vendorName     : '',
    vendorMobile:   typeof o.vendorMobile   === 'string' ? o.vendorMobile   : null,
    items,
    notes:         typeof o.notes         === 'string' ? o.notes         : '',
    amount:        typeof o.amount        === 'number' ? o.amount        : 0,
    currency:      typeof o.currency      === 'string' ? o.currency      : 'INR',
    status:        typeof o.status        === 'string' ? o.status        : '',
    paymentStatus: typeof o.paymentStatus === 'string' ? o.paymentStatus : null,
    paymentRefId:  typeof o.paymentRefId  === 'string' ? o.paymentRefId  : null,
    paidAt:        typeof o.paidAt        === 'string' ? o.paidAt        : null,
    createdAt:     typeof o.createdAt     === 'string' ? o.createdAt     : null,
    updatedAt:     typeof o.updatedAt     === 'string' ? o.updatedAt     : null,
  };
}

function normalizeShop(raw: unknown): CommerceShop | null {
  const s = asRecord(raw);
  const id = typeof s.id === 'string' ? s.id : '';
  if (!id) return null;
  return {
    id,
    name:         typeof s.name         === 'string' ? s.name         : '',
    address:      typeof s.address      === 'string' ? s.address      : '',
    description:  typeof s.description  === 'string' ? s.description  : '',
    thumbnailUrl: typeof s.thumbnailUrl === 'string' ? s.thumbnailUrl : '',
    notes:        typeof s.notes        === 'string' ? s.notes        : '',
    minOrderValue:  typeof s.minOrderValue  === 'number' ? s.minOrderValue  : 0,
    productCount:   typeof s.productCount   === 'number' ? s.productCount   : undefined,
    inStockCount:   typeof s.inStockCount   === 'number' ? s.inStockCount   : undefined,
    acceptingOrders: s.acceptingOrders !== false,
  };
}

// ─── Vendor — Products ────────────────────────────────────────────────────────

export async function listVendorCommerceProducts(
  token: string,
  businessId: string,
): Promise<CommerceProduct[]> {
  const data = await request<Record<string, unknown>>(
    'GET',
    `commerce/vendor/businesses/${businessId}/products`,
    token,
  );
  const list = data.products;
  return Array.isArray(list)
    ? list.map(normalizeProduct).filter((p): p is CommerceProduct => p !== null)
    : [];
}

export async function createCommerceProduct(
  token: string,
  businessId: string,
  body: { name: string; description?: string; price: number; stock: number; active?: boolean },
): Promise<CommerceProduct> {
  const data = await request<Record<string, unknown>>(
    'POST',
    `commerce/vendor/businesses/${businessId}/products`,
    token,
    body,
  );
  const product = normalizeProduct(asRecord(data).product);
  if (!product) throw new Error('Invalid product response');
  return product;
}

export async function updateCommerceProduct(
  token: string,
  businessId: string,
  productId: string,
  body: { name?: string; description?: string; price?: number; stock?: number; active?: boolean },
): Promise<CommerceProduct> {
  const data = await request<Record<string, unknown>>(
    'PATCH',
    `commerce/vendor/businesses/${businessId}/products/${productId}`,
    token,
    body,
  );
  const product = normalizeProduct(asRecord(data).product);
  if (!product) throw new Error('Invalid product response');
  return product;
}

export async function deleteCommerceProduct(
  token: string,
  businessId: string,
  productId: string,
): Promise<void> {
  await request<unknown>('DELETE', `commerce/vendor/businesses/${businessId}/products/${productId}`, token);
}

// ─── Vendor — Orders ──────────────────────────────────────────────────────────

export async function listVendorCommerceOrders(token: string): Promise<CommerceOrder[]> {
  const data = await request<Record<string, unknown>>('GET', 'commerce/vendor/orders', token);
  const list = data.orders;
  return Array.isArray(list)
    ? list.map(normalizeOrder).filter((o): o is CommerceOrder => o !== null)
    : [];
}

export async function updateVendorCommerceOrderStatus(
  token: string,
  orderId: string,
  status: string,
): Promise<CommerceOrder> {
  const data = await request<Record<string, unknown>>(
    'POST',
    `commerce/vendor/orders/${orderId}/status`,
    token,
    { status },
  );
  const order = normalizeOrder(asRecord(data).order);
  if (!order) throw new Error('Invalid order response');
  return order;
}

// ─── Customer — Shops ─────────────────────────────────────────────────────────

export async function listCommerceShops(token: string): Promise<CommerceShop[]> {
  const data = await request<Record<string, unknown>>('GET', 'commerce/shops', token);
  const list = data.shops;
  return Array.isArray(list)
    ? list.map(normalizeShop).filter((s): s is CommerceShop => s !== null)
    : [];
}

export async function getCommerceShop(
  token: string,
  businessId: string,
): Promise<{ shop: CommerceShop; products: CommerceProduct[] }> {
  const data = await request<Record<string, unknown>>('GET', `commerce/shops/${businessId}`, token);
  const shop = normalizeShop(asRecord(data).shop);
  if (!shop) throw new Error('Shop not found');
  const products = Array.isArray(data.products)
    ? data.products.map(normalizeProduct).filter((p): p is CommerceProduct => p !== null)
    : [];
  return { shop, products };
}

// ─── Customer — Orders ────────────────────────────────────────────────────────

export async function createCommerceOrder(
  token: string,
  body: { businessId: string; items: { productId: string; quantity: number }[]; notes?: string },
): Promise<CommerceOrder> {
  const data = await request<Record<string, unknown>>('POST', 'commerce/orders', token, body);
  const order = normalizeOrder(asRecord(data).order);
  if (!order) throw new Error('Invalid order response');
  return order;
}

export async function listMyCommerceOrders(token: string): Promise<CommerceOrder[]> {
  const data = await request<Record<string, unknown>>('GET', 'commerce/orders', token);
  const list = data.orders;
  return Array.isArray(list)
    ? list.map(normalizeOrder).filter((o): o is CommerceOrder => o !== null)
    : [];
}

export async function getMyCommerceOrder(token: string, id: string): Promise<CommerceOrder> {
  const data = await request<Record<string, unknown>>('GET', `commerce/orders/${id}`, token);
  const order = normalizeOrder(asRecord(data).order);
  if (!order) throw new Error('Order not found');
  return order;
}

export async function payCommerceOrder(
  token: string,
  id: string,
): Promise<{
  order: CommerceOrder;
  payment: {
    orderId: string;
    cashfreeOrderId: string;
    paymentSessionId: string;
    amount: number;
    currency: string;
    mode: string;
  };
}> {
  const data = await request<Record<string, unknown>>(
    'POST',
    `commerce/orders/${id}/pay`,
    token,
    {},
  );
  const root = asRecord(data);
  const order = normalizeOrder(root.order);
  if (!order) throw new Error('Invalid order response');
  const payment = asRecord(root.payment);
  return {
    order,
    payment: {
      orderId:          typeof payment.orderId          === 'string' ? payment.orderId          : id,
      cashfreeOrderId:  typeof payment.cashfreeOrderId  === 'string' ? payment.cashfreeOrderId  : id,
      paymentSessionId: typeof payment.paymentSessionId === 'string' ? payment.paymentSessionId : '',
      amount:           typeof payment.amount           === 'number' ? payment.amount           : order.amount,
      currency:         typeof payment.currency         === 'string' ? payment.currency         : 'INR',
      mode:             typeof payment.mode             === 'string' ? payment.mode             : 'sandbox',
    },
  };
}

export async function cancelCommerceOrder(token: string, id: string): Promise<CommerceOrder> {
  const data = await request<Record<string, unknown>>(
    'POST',
    `commerce/orders/${id}/cancel`,
    token,
    {},
  );
  const order = normalizeOrder(asRecord(data).order);
  if (!order) throw new Error('Order not found');
  return order;
}
