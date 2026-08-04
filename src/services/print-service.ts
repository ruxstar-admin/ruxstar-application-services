/**
 * PrintService — Print-on-Demand API calls.
 * Mirrors: ruxstar-frontend-services/lib/api.ts (POD section, lines ~2352–2744)
 */

import { API_URL } from '@/constants/config';
import type {
  PrintCategory,
  PrintShop,
  PrintOrder,
  VendorPrintOrders,
  PrintOrderStatus,
  CreatePrintOrderInput,
  InitiatePaymentResult,
  CategoryPricing,
  PricingTier,
  PricingAddons,
  AppNotification,
  NotificationsResult,
} from '@/types/print';

const BASE = API_URL;

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
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

const get   = <T>(path: string, token?: string)               => request<T>('GET',   path, token);
const post  = <T>(path: string, token: string, body: unknown) => request<T>('POST',  path, token, body);
const patch = <T>(path: string, token: string, body: unknown) => request<T>('PATCH', path, token, body);

// ─── Normalizers ─────────────────────────────────────────────────────────────

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function strArray(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
}

function normalizeMoneyMap(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  const rec = asRecord(raw);
  for (const [k, v] of Object.entries(rec)) {
    const n = Math.round(Number(v));
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

function normalizeCategoryPricing(raw: unknown): CategoryPricing {
  const p = asRecord(raw);
  const num = (v: unknown, fallback: number) =>
    Number.isFinite(Number(v)) ? Math.round(Number(v)) : fallback;
  const addonsRaw = asRecord(p.addons);
  const addons: PricingAddons = {
    sides:      normalizeMoneyMap(addonsRaw.sides),
    size:       normalizeMoneyMap(addonsRaw.size),
    printType:  normalizeMoneyMap(addonsRaw.printType),
    material:   normalizeMoneyMap(addonsRaw.material),
    color:      normalizeMoneyMap(addonsRaw.color),
    binding:    normalizeMoneyMap(addonsRaw.binding),
    paperSize:  normalizeMoneyMap(addonsRaw.paperSize),
    doubleSided: num(addonsRaw.doubleSided, 0),
  };
  const perPageRaw = asRecord(p.perPage);
  const tiers: PricingTier[] = Array.isArray(p.tiers)
    ? p.tiers
        .map((t) => {
          const tr = asRecord(t);
          const unitPrice = num(tr.unitPrice, 0);
          const minQty    = num(tr.minQty, 0);
          const minPages  = num(tr.minPages, 0);
          if (unitPrice <= 0) return null;
          return {
            unitPrice,
            ...(minQty   > 0 ? { minQty }   : {}),
            ...(minPages > 0 ? { minPages } : {}),
          } as PricingTier;
        })
        .filter((t): t is PricingTier => t !== null)
    : [];
  return {
    enabled:       p.enabled !== false,
    minQuantity:   Math.max(1, num(p.minQuantity, 1)),
    turnaroundDays: num(p.turnaroundDays, 3),
    ...(p.basePrice !== undefined ? { basePrice: num(p.basePrice, 0) } : {}),
    ...(p.perPage   !== undefined ? {
      perPage: { bw: num(perPageRaw.bw, 0), color: num(perPageRaw.color, 0) },
    } : {}),
    addons,
    tiers,
  };
}

function normalizePrintCategory(raw: unknown): PrintCategory | null {
  const c = asRecord(raw);
  const id = typeof c.id === 'string' ? c.id : '';
  if (!id) return null;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const requirements = Array.isArray(c.requirements)
    ? c.requirements
        .map((r) => {
          const req = asRecord(r);
          const key = typeof req.key === 'string' ? req.key.trim() : '';
          if (!key) return null;
          const typeRaw = str(req.type);
          let type: 'select' | 'text' | 'textarea' | 'file' = 'text';
          if (typeRaw === 'select' || typeRaw === 'text' || typeRaw === 'textarea' || typeRaw === 'file') {
            type = typeRaw;
          } else if (key === 'designImage') {
            type = 'file';
          } else if (['size', 'material', 'printType', 'color'].includes(key)) {
            type = 'select';
          }
          return {
            key,
            label:       str(req.label) || key,
            type,
            required:    req.required === true,
            hint:        str(req.hint),
            placeholder: str(req.placeholder),
          };
        })
        .filter((f): f is NonNullable<typeof f> => f !== null)
    : [];
  return {
    id,
    label:          str(c.label),
    icon:           str(c.icon) || '🖨️',
    description:    str(c.description),
    pricingModel:   c.pricingModel === 'per_page' ? 'per_page' : 'per_unit',
    minQuantity:    typeof c.minQuantity === 'number' ? c.minQuantity : 1,
    sizes:          strArray(c.sizes),
    printTypes:     strArray(c.printTypes),
    materials:      strArray(c.materials),
    colorOptions:   strArray(c.colorOptions),
    sides:          strArray(c.sides),
    bindingOptions: strArray(c.bindingOptions),
    requirements,
  };
}

function normalizePrintShop(raw: unknown): PrintShop | null {
  const s = asRecord(raw);
  const businessId = typeof s.businessId === 'string' ? s.businessId : '';
  if (!businessId) return null;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    businessId,
    vendorId:        str(s.vendorId),
    name:            str(s.name) || 'Print shop',
    thumbnailUrl:    str(s.thumbnailUrl),
    city:            str(s.city),
    acceptingOrders: s.acceptingOrders !== false,
    pricingModel:    s.pricingModel === 'per_page' ? 'per_page' : 'per_unit',
    turnaroundDays:  num(s.turnaroundDays),
    minQuantity:     Math.max(1, num(s.minQuantity) || 1),
    fromPrice:       num(s.fromPrice),
    pricing:         normalizeCategoryPricing(s.pricing),
  };
}

function normalizePrintOrder(raw: unknown): PrintOrder | null {
  const o = asRecord(raw);
  const id = typeof o.id === 'string' ? o.id : '';
  if (!id) return null;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const attrs = asRecord(o.attributes);
  const rawExtras = asRecord(attrs.extras);
  const extras: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawExtras)) {
    if (typeof v === 'string' && v.trim()) extras[k] = v.trim();
  }
  return {
    id,
    customerName:       str(o.customerName),
    customerMobile:     str(o.customerMobile),
    categoryId:         str(o.categoryId),
    categoryLabel:      str(o.categoryLabel),
    title:              str(o.title),
    attributes: {
      printType: str(attrs.printType) || undefined,
      material:  str(attrs.material)  || undefined,
      color:     str(attrs.color)     || undefined,
      size:      str(attrs.size)      || undefined,
      ...(Object.keys(extras).length ? { extras } : {}),
    },
    quantity:           typeof o.quantity === 'number' ? o.quantity : null,
    notes:              str(o.notes),
    city:               str(o.city),
    pincode:            str(o.pincode),
    hasDesign:          o.hasDesign === true,
    designImageUrl:     typeof o.designImageUrl === 'string' ? o.designImageUrl : null,
    designImage:        typeof o.designImage === 'string' ? o.designImage : undefined,
    status:             (str(o.status) || 'open') as PrintOrderStatus,
    assignedVendorId:   typeof o.assignedVendorId   === 'string' ? o.assignedVendorId   : null,
    assignedBusinessId: typeof o.assignedBusinessId === 'string' ? o.assignedBusinessId : null,
    vendorName:         typeof o.vendorName   === 'string' ? o.vendorName   : null,
    businessName:       typeof o.businessName === 'string' ? o.businessName : null,
    vendorMobile:       typeof o.vendorMobile === 'string' ? o.vendorMobile : null,
    vendorNote:         str(o.vendorNote),
    quoteAmount:        typeof o.quoteAmount === 'number' ? o.quoteAmount : null,
    currency:           str(o.currency) || 'INR',
    paymentStatus:      typeof o.paymentStatus === 'string' ? o.paymentStatus : null,
    acceptedAt:         typeof o.acceptedAt === 'string' ? o.acceptedAt : null,
    paidAt:             typeof o.paidAt     === 'string' ? o.paidAt     : null,
    createdAt:          typeof o.createdAt  === 'string' ? o.createdAt  : null,
    updatedAt:          typeof o.updatedAt  === 'string' ? o.updatedAt  : null,
  };
}

function normalizePayment(raw: unknown): InitiatePaymentResult | null {
  const p = asRecord(raw);
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const paymentSessionId = str(p.paymentSessionId);
  if (!paymentSessionId) return null;
  return {
    orderId:          str(p.orderId),
    cashfreeOrderId:  str(p.cashfreeOrderId),
    paymentSessionId,
    amount:   typeof p.amount === 'number' ? p.amount : 0,
    currency: str(p.currency) || 'INR',
    expiresAt: str(p.expiresAt),
    mode: str(p.mode) === 'production' ? 'production' : 'sandbox',
  };
}

function normalizeNotification(raw: unknown): AppNotification | null {
  const n = asRecord(raw);
  const id = typeof n.id === 'string' ? n.id : '';
  if (!id) return null;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    id,
    type:      str(n.type) || 'info',
    title:     str(n.title),
    body:      str(n.body),
    data:      asRecord(n.data),
    read:      n.read === true,
    createdAt: typeof n.createdAt === 'string' ? n.createdAt : null,
  };
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

export async function getPrintCatalog(): Promise<PrintCategory[]> {
  const data = await get<Record<string, unknown>>('catalog/print');
  const list = data.categories;
  return Array.isArray(list)
    ? list.map(normalizePrintCategory).filter((c): c is PrintCategory => c !== null)
    : [];
}

// ─── Shops ───────────────────────────────────────────────────────────────────

export async function listPrintShops(
  token: string,
  categoryId: string,
  city: string,
): Promise<PrintShop[]> {
  const qs = new URLSearchParams({ category: categoryId, city: city.trim() }).toString();
  const data = await get<Record<string, unknown>>(`pod/shops?${qs}`, token);
  const list = data.shops;
  return Array.isArray(list)
    ? list.map(normalizePrintShop).filter((s): s is PrintShop => s !== null)
    : [];
}

// ─── Customer orders ─────────────────────────────────────────────────────────

export async function createPrintOrder(
  token: string,
  body: CreatePrintOrderInput,
): Promise<PrintOrder> {
  const data = await post<Record<string, unknown>>('pod/orders', token, body);
  const order = normalizePrintOrder(data.order);
  if (!order) throw new Error('Could not place order.');
  return order;
}

export async function listMyPrintOrders(token: string): Promise<PrintOrder[]> {
  const data = await get<Record<string, unknown>>('pod/orders', token);
  const list = data.orders;
  return Array.isArray(list)
    ? list.map(normalizePrintOrder).filter((o): o is PrintOrder => o !== null)
    : [];
}

export async function getPrintOrder(token: string, id: string): Promise<PrintOrder> {
  const data = await get<Record<string, unknown>>(`pod/orders/${encodeURIComponent(id)}`, token);
  const order = normalizePrintOrder(data.order);
  if (!order) throw new Error('Order not found.');
  return order;
}

export async function payPrintOrder(
  token: string,
  id: string,
): Promise<{ order: PrintOrder; payment: InitiatePaymentResult }> {
  const data = await post<Record<string, unknown>>(
    `pod/orders/${encodeURIComponent(id)}/pay`,
    token,
    {},
  );
  const order   = normalizePrintOrder(data.order);
  const payment = normalizePayment(data.payment);
  if (!order || !payment) throw new Error('Could not start payment.');
  return { order, payment };
}

export async function cancelPrintOrder(token: string, id: string): Promise<void> {
  await post<unknown>(`pod/orders/${encodeURIComponent(id)}/cancel`, token, {});
}

// ─── Vendor orders ────────────────────────────────────────────────────────────

export async function listVendorPrintOrders(token: string): Promise<VendorPrintOrders> {
  const data = await get<Record<string, unknown>>('pod/vendor/orders', token);
  const assigned = Array.isArray(data.assigned)
    ? data.assigned.map(normalizePrintOrder).filter((o): o is PrintOrder => o !== null)
    : [];
  const eligible = asRecord(data.eligible);
  return {
    assigned,
    eligible: { hasPrintBusiness: eligible.hasPrintBusiness === true },
  };
}

export async function getVendorPrintOrder(token: string, id: string): Promise<PrintOrder> {
  const data = await get<Record<string, unknown>>(
    `pod/vendor/orders/${encodeURIComponent(id)}`,
    token,
  );
  const order = normalizePrintOrder(data.order);
  if (!order) throw new Error('Order not found.');
  return order;
}

export async function updatePrintOrderStatus(
  token: string,
  id: string,
  status: PrintOrderStatus,
): Promise<PrintOrder> {
  const data = await post<Record<string, unknown>>(
    `pod/vendor/orders/${encodeURIComponent(id)}/status`,
    token,
    { status },
  );
  const order = normalizePrintOrder(data.order);
  if (!order) throw new Error('Could not update order.');
  return order;
}

export async function setPrintAcceptingOrders(
  token: string,
  businessId: string,
  accepting: boolean,
): Promise<void> {
  await post<unknown>(`pod/vendor/businesses/${businessId}/accepting`, token, { accepting });
}

function normalizePrintProfile(raw: unknown): import('@/types/print').PrintProfile {
  const p = asRecord(raw);
  const pricingRaw = asRecord(p.pricing);
  const pricing: import('@/types/print').PrintProfile['pricing'] = {};
  for (const [k, v] of Object.entries(pricingRaw)) {
    pricing[k] = normalizeCategoryPricing(v);
  }
  return {
    serviceCategories: strArray(p.serviceCategories),
    cities:            strArray(p.cities),
    serveAll:          p.serveAll === true,
    turnaroundDays:    typeof p.turnaroundDays === 'number' ? p.turnaroundDays : 3,
    minOrderValue:     typeof p.minOrderValue  === 'number' ? p.minOrderValue  : 0,
    notes:             typeof p.notes === 'string' ? p.notes : '',
    acceptingOrders:   p.acceptingOrders !== false,
    pricing,
  };
}

export async function getPrintVendorProfile(
  token: string,
  businessId: string,
): Promise<import('@/types/print').PrintProfile | null> {
  try {
    const data = await get<Record<string, unknown>>(
      `pod/vendor/businesses/${encodeURIComponent(businessId)}/profile`,
      token,
    );
    return normalizePrintProfile(data.profile ?? data);
  } catch {
    return null;
  }
}

export async function savePrintVendorProfile(
  token: string,
  businessId: string,
  profile: Partial<import('@/types/print').PrintProfile>,
): Promise<void> {
  await patch<unknown>(
    `pod/vendor/businesses/${encodeURIComponent(businessId)}/profile`,
    token,
    profile,
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function listNotifications(token: string): Promise<NotificationsResult> {
  const data = await get<Record<string, unknown>>('notifications', token);
  const list = Array.isArray(data.notifications)
    ? data.notifications.map(normalizeNotification).filter((n): n is AppNotification => n !== null)
    : [];
  return {
    notifications: list,
    unreadCount:   typeof data.unreadCount === 'number' ? data.unreadCount : 0,
  };
}

export async function markNotificationRead(token: string, id: string): Promise<void> {
  await post<unknown>(`notifications/${encodeURIComponent(id)}/read`, token, {});
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await post<unknown>('notifications/read-all', token, {});
}
