/**
 * Creator Offer Service — customer-facing browse + book.
 * Mirrors: ruxstar-frontend-services/lib/api.ts (creator offer section) +
 * app/customer/creator/[offerId]/page.tsx.
 * Vendor-side offer management lives in creator-service.ts.
 */

import { API_URL } from '@/constants/config';

const BASE = API_URL;

// ─── HTTP helper ──────────────────────────────────────────────────────────────

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
      (typeof d.error   === 'string' && d.error)   ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

// ─── Types (mirror models/CreatorOffer.js + models/CreatorBooking.js sanitize()) ─

export type CreatorOfferKind = 'shoutout' | 'collab' | 'appearance';

export interface CreatorOffer {
  id: string;
  businessId: string;
  businessName: string;
  vendorId: string;
  title: string;
  description: string;
  kind: CreatorOfferKind;
  platforms: string[];
  price: number;
  currency: string;
  turnaroundDays: number | null;
  capacity: number | null;
  spotsLeft: number | null;
  coverUrl: string | null;
  status: string;
}

export interface CreatorBooking {
  id: string;
  refId: string | null;
  offerId: string;
  offerTitle: string;
  offerKind: CreatorOfferKind | string;
  businessId: string;
  businessName: string;
  brief: string;
  amount: number;
  currency: string;
  status: string;
  paymentStatus: string | null;
  turnaroundDays: number | null;
}

export interface CreatorOfferPayment {
  orderId: string;
  cashfreeOrderId: string;
  paymentSessionId: string;
  amount: number;
  currency: string;
  mode: 'sandbox' | 'production';
}

export interface BookCreatorOfferResult {
  booking: CreatorBooking;
  payment: CreatorOfferPayment | null;
}

// ─── Requests ─────────────────────────────────────────────────────────────────

/** GET /public/creator-offers — published offers, no auth required. */
export async function listPublicCreatorOffers(): Promise<CreatorOffer[]> {
  const data = await request<{ offers: CreatorOffer[] }>('GET', 'public/creator-offers');
  return Array.isArray(data.offers) ? data.offers : [];
}

/** GET /public/creator-offers/:id — no auth required. */
export async function getPublicCreatorOffer(offerId: string): Promise<CreatorOffer> {
  const data = await request<{ offer: CreatorOffer }>(
    'GET',
    `public/creator-offers/${encodeURIComponent(offerId)}`,
  );
  return data.offer;
}

/** POST /user/creator-offers/:id/book */
export async function bookCreatorOffer(
  token: string,
  offerId: string,
  brief: string,
): Promise<BookCreatorOfferResult> {
  return request<BookCreatorOfferResult>(
    'POST',
    `user/creator-offers/${encodeURIComponent(offerId)}/book`,
    token,
    { brief },
  );
}
