/**
 * CreatorService — offers & creator bookings API calls.
 */

import { API_URL } from '@/constants/config';

const BASE = API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

export type OfferKind = 'shoutout' | 'collab' | 'appearance';

export type CreatorOffer = {
  id: string;
  businessId: string;
  businessName: string;
  vendorId: string;
  title: string;
  description: string;
  kind: OfferKind;
  platforms: string[];
  price: number;
  currency: string;
  turnaroundDays: number | null;
  capacity: number | null;
  spotsLeft: number | null;
  coverUrl: string | null;
  status: string; // 'draft' | 'published' | 'cancelled'
  createdAt?: string;
};

export type CreatorBooking = {
  id: string;
  refId: string | null;
  offerId: string;
  offerTitle: string;
  offerKind: OfferKind;
  businessId: string;
  businessName: string;
  brief: string;
  customerName: string;
  customerMobile: string;
  amount: number;
  currency: string;
  status: string;
  paymentStatus: string | null;
  turnaroundDays: number | null;
  expiresAt: string | null;
  paidAt: string | null;
  createdAt?: string;
};

export type CreateOfferInput = {
  businessId: string;
  title: string;
  description?: string;
  kind?: OfferKind;
  platforms?: string[];
  price: number;
  turnaroundDays?: number | null;
  capacity?: number | null;
};

// ─── HTTP helper ──────────────────────────────────────────────────────────────

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

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function normalizeOffer(raw: unknown): CreatorOffer | null {
  const o = asRecord(raw);
  const id = typeof o.id === 'string' ? o.id : '';
  if (!id) return null;
  return {
    id,
    businessId:   typeof o.businessId   === 'string' ? o.businessId   : '',
    businessName: typeof o.businessName === 'string' ? o.businessName : '',
    vendorId:     typeof o.vendorId     === 'string' ? o.vendorId     : '',
    title:        typeof o.title        === 'string' ? o.title        : '',
    description:  typeof o.description  === 'string' ? o.description  : '',
    kind:         (typeof o.kind === 'string' ? o.kind : 'collab') as OfferKind,
    platforms:    Array.isArray(o.platforms) ? (o.platforms as string[]) : [],
    price:        typeof o.price        === 'number' ? o.price        : 0,
    currency:     typeof o.currency     === 'string' ? o.currency     : 'INR',
    turnaroundDays: typeof o.turnaroundDays === 'number' ? o.turnaroundDays : null,
    capacity:     typeof o.capacity     === 'number' ? o.capacity     : null,
    spotsLeft:    typeof o.spotsLeft    === 'number' ? o.spotsLeft    : null,
    coverUrl:     typeof o.coverUrl     === 'string' ? o.coverUrl     : null,
    status:       typeof o.status       === 'string' ? o.status       : 'draft',
    createdAt:    typeof o.createdAt    === 'string' ? o.createdAt    : undefined,
  };
}

function normalizeBooking(raw: unknown): CreatorBooking | null {
  const b = asRecord(raw);
  const id = typeof b.id === 'string' ? b.id : '';
  if (!id) return null;
  return {
    id,
    refId:          typeof b.refId          === 'string' ? b.refId          : null,
    offerId:        typeof b.offerId        === 'string' ? b.offerId        : '',
    offerTitle:     typeof b.offerTitle     === 'string' ? b.offerTitle     : '',
    offerKind:      (typeof b.offerKind === 'string' ? b.offerKind : 'collab') as OfferKind,
    businessId:     typeof b.businessId     === 'string' ? b.businessId     : '',
    businessName:   typeof b.businessName   === 'string' ? b.businessName   : '',
    brief:          typeof b.brief          === 'string' ? b.brief          : '',
    customerName:   typeof b.customerName   === 'string' ? b.customerName   : '',
    customerMobile: typeof b.customerMobile === 'string' ? b.customerMobile : '',
    amount:         typeof b.amount         === 'number' ? b.amount         : 0,
    currency:       typeof b.currency       === 'string' ? b.currency       : 'INR',
    status:         typeof b.status         === 'string' ? b.status         : '',
    paymentStatus:  typeof b.paymentStatus  === 'string' ? b.paymentStatus  : null,
    turnaroundDays: typeof b.turnaroundDays === 'number' ? b.turnaroundDays : null,
    expiresAt:      typeof b.expiresAt      === 'string' ? b.expiresAt      : null,
    paidAt:         typeof b.paidAt         === 'string' ? b.paidAt         : null,
    createdAt:      typeof b.createdAt      === 'string' ? b.createdAt      : undefined,
  };
}

// ─── Vendor — Offers ──────────────────────────────────────────────────────────

export async function listVendorOffers(token: string, businessId?: string): Promise<CreatorOffer[]> {
  const qs = businessId ? `?businessId=${businessId}` : '';
  const data = await request<Record<string, unknown>>('GET', `vendor/creator/offers${qs}`, token);
  const list = data.offers ?? data.data;
  return Array.isArray(list)
    ? list.map(normalizeOffer).filter((o): o is CreatorOffer => o !== null)
    : [];
}

export async function createVendorOffer(token: string, body: CreateOfferInput): Promise<CreatorOffer> {
  const data = await request<Record<string, unknown>>('POST', 'vendor/creator/offers', token, body);
  const offer = normalizeOffer(asRecord(data).offer ?? data);
  if (!offer) throw new Error('Invalid offer response');
  return offer;
}

export async function updateVendorOffer(
  token: string,
  offerId: string,
  body: Partial<CreateOfferInput>,
): Promise<CreatorOffer> {
  const data = await request<Record<string, unknown>>('PATCH', `vendor/creator/offers/${offerId}`, token, body);
  const offer = normalizeOffer(asRecord(data).offer ?? data);
  if (!offer) throw new Error('Invalid offer response');
  return offer;
}

export async function publishVendorOffer(token: string, offerId: string): Promise<CreatorOffer> {
  const data = await request<Record<string, unknown>>('POST', `vendor/creator/offers/${offerId}/publish`, token, {});
  const offer = normalizeOffer(asRecord(data).offer ?? data);
  if (!offer) throw new Error('Invalid offer response');
  return offer;
}

export async function unpublishVendorOffer(token: string, offerId: string): Promise<CreatorOffer> {
  const data = await request<Record<string, unknown>>('POST', `vendor/creator/offers/${offerId}/unpublish`, token, {});
  const offer = normalizeOffer(asRecord(data).offer ?? data);
  if (!offer) throw new Error('Invalid offer response');
  return offer;
}

export async function cancelVendorOffer(token: string, offerId: string): Promise<CreatorOffer> {
  const data = await request<Record<string, unknown>>('POST', `vendor/creator/offers/${offerId}/cancel`, token, {});
  const offer = normalizeOffer(asRecord(data).offer ?? data);
  if (!offer) throw new Error('Invalid offer response');
  return offer;
}

// ─── Vendor — Creator Bookings ────────────────────────────────────────────────

export async function listVendorCreatorBookings(token: string, businessId?: string): Promise<CreatorBooking[]> {
  const qs = businessId ? `?businessId=${businessId}` : '';
  const data = await request<Record<string, unknown>>('GET', `vendor/creator/bookings${qs}`, token);
  const list = data.bookings ?? data.data;
  return Array.isArray(list)
    ? list.map(normalizeBooking).filter((b): b is CreatorBooking => b !== null)
    : [];
}

export async function updateCreatorBookingStatus(
  token: string,
  bookingId: string,
  status: string,
): Promise<CreatorBooking> {
  const data = await request<Record<string, unknown>>(
    'POST',
    `vendor/creator/bookings/${bookingId}/status`,
    token,
    { status },
  );
  const booking = normalizeBooking(asRecord(data).booking ?? data);
  if (!booking) throw new Error('Invalid booking response');
  return booking;
}
