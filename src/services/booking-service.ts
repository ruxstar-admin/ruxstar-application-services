/**
 * BookingService — vendor bookings, customer bookings, public businesses,
 * customer profile.
 * Mirrors: ruxstar-frontend-services/lib/api.ts (booking + public sections)
 */

import { API_URL } from '@/constants/config';

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
      (typeof d.error   === 'string' && d.error)   ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

const get  = <T>(path: string, token?: string)                   => request<T>('GET',    path, token);
const del  = (path: string, token: string)                       => request<void>('DELETE', path, token);
const patch = <T>(path: string, token: string, body: unknown)    => request<T>('PATCH',  path, token, body);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VendorBooking {
  id:              string;
  businessId:      string;
  businessName:    string;
  resourceId:      string;
  resourceName:    string;
  serviceLabel?:   string;   // service name for salon/clinic bookings
  startAt:         string;
  endAt:           string;
  pricePerSlot:    number;
  amount?:         number;
  customerName:    string;
  customerMobile:  string;
  status:          string;
  paymentStatus?:  string | null;
  createdAt?:      string;
  coverUrl?:       string;
}

export type CustomerBooking = VendorBooking;

export interface PublicBusiness {
  id:            string;
  name:          string;
  vendorName:    string;
  typeLabel:     string;
  categoryLabel: string;
  address:       string;
  description:   string;
  pricePerSlot:  number;
  slotMinutes:   number;
  bookingMode:   'slots' | 'fullDay' | 'services';
  maxGuests:     number | null;
  resourceCount: number;
  priceFrom:     number;
  priceTo:       number;
  coverUrl?:     string;
  module?:       string;
  // Detail fields (populated from /public/businesses/:id)
  venueRules?: string;
  services?:   { id: string; name: string; durationMinutes: number; price: number; staffIds: string[] }[];
  staff?:      { id: string; name: string; role?: string }[];
  photos?:     string[];
}

export interface PublicSlot {
  id:          string;
  resourceId:  string;
  resourceName:string;
  startAt:     string;
  endAt:       string;
  startTime:   string;   // "HH:MM"
  endTime:     string;
  date:        string;   // "YYYY-MM-DD"
  status:      'available' | 'booked' | 'blocked';
  pricePerSlot:number;
}

export interface PublicSlotsResponse {
  resources: { id: string; name: string; pricePerSlot: number }[];
  slots:     PublicSlot[];
  slotMinutes: number;
  bookingMode: 'slots' | 'fullDay' | 'services';
  pricePerSlot: number;
}

export interface InitiateBookingBody {
  businessId:   string;
  startAt:      string;
  resourceId?:  string;
  serviceIds?:  string[];
  staffId?:     string;
}

export interface InitiateBookingResult {
  bookingId:         string;
  orderId?:          string;   // Cashfree order_id (needed by native SDK)
  amount:            number;
  status:            string;
  paymentSessionId?: string;
  paymentLink?:      string;   // direct payment URL if backend provides one
  mode?:             string;   // 'sandbox' | 'production'
}

export interface CustomerProfile {
  id?:     string;
  name?:   string;
  mobile?: string;
  roles?:  string[];
}

export interface PublicEvent {
  id:                   string;
  businessId:           string;
  title:                string;
  businessName:         string;
  coverUrl?:            string;
  startAt:              string;
  venue:                string;
  entryFee:             number;
  spotsLeft:            number | null;
  // Full detail fields (populated from /public/events/:id)
  kind?:                'tournament' | 'event';
  format?:              'individual' | 'team';
  teamSize?:            number | null;
  capacity?:            number | null;
  description?:         string;
  rules?:               string;
  tournamentType?:      string;
  skillLevel?:          string;
  ageCategory?:         string;
  genderCategory?:      string;
  registrationDeadline?:string | null;
  endAt?:               string | null;
  status?:              string;
}

export interface EventRegistrationResult {
  registrationId:  string;
  orderId?:        string;   // Cashfree order_id (needed by native SDK)
  paymentRequired: boolean;
  amount:          number;
  paymentSessionId?: string;
  paymentLink?:      string;
}

export interface CustomerEventRegistration {
  id:             string;
  eventId:        string;
  eventTitle:     string;
  businessName:   string;
  kind:           'tournament' | 'event';
  format:         'individual' | 'team';
  teamName:       string | null;
  participants:   { name: string }[];
  amount:         number;
  currency:       string;
  status:         string;
  paymentStatus?: string | null;
  startAt:        string;
  venue:          string;
  createdAt?:     string;
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

function asRec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function normalizeBooking(raw: unknown): VendorBooking | null {
  const b  = asRec(raw);
  const id = str(b.id) || str(b._id);
  if (!id) return null;
  return {
    id,
    businessId:     str(b.businessId),
    businessName:   str(b.businessName),
    resourceId:     str(b.resourceId),
    resourceName:   str(b.resourceName),
    serviceLabel:   str(b.serviceLabel) || undefined,
    startAt:        str(b.startAt),
    endAt:          str(b.endAt),
    pricePerSlot:   typeof b.pricePerSlot === 'number' ? b.pricePerSlot : 0,
    amount:         typeof b.amount === 'number' ? b.amount : undefined,
    customerName:   str(b.customerName),
    customerMobile: str(b.customerMobile),
    status:         str(b.status) || 'confirmed',
    paymentStatus:  typeof b.paymentStatus === 'string' ? b.paymentStatus : null,
    createdAt:      str(b.createdAt) || undefined,
    coverUrl:       str(b.coverUrl) || str(b.businessCoverUrl) || str(b.thumbnailUrl) || undefined,
  };
}

function normalizeBusiness(raw: unknown): PublicBusiness | null {
  const b  = asRec(raw);
  const id = str(b._id) || str(b.id);
  if (!id) return null;

  const pricePerSlot    = typeof b.pricePerSlot === 'number' ? b.pricePerSlot : 0;
  const thumbnailUrl    = str(b.thumbnailUrl).trim();
  const thumbnailPhotoId = str(b.thumbnailPhotoId).trim();
  const coverUrl =
    str(b.coverUrl).trim() ||
    thumbnailUrl ||
    (thumbnailPhotoId ? `${BASE}/public/businesses/${id}/photos/${thumbnailPhotoId}` : '') ||
    undefined;

  // Extract setup sub-object for detail fields (present on /public/businesses/:id)
  const setup = asRec(b.setup ?? {});

  const services = Array.isArray(setup.services)
    ? (setup.services as unknown[]).map((sv: unknown) => {
        const s = asRec(sv);
        return {
          id:              str(s._id) || str(s.id),
          name:            str(s.name),
          durationMinutes: typeof s.durationMinutes === 'number' ? s.durationMinutes : 60,
          price:           typeof s.price           === 'number' ? s.price           : 0,
          staffIds:        Array.isArray(s.staffIds) ? (s.staffIds as string[]) : [],
        };
      }).filter((s) => s.id)
    : undefined;

  const staff = Array.isArray(setup.staff)
    ? (setup.staff as unknown[]).map((st: unknown) => {
        const p = asRec(st);
        return {
          id:   str(p._id) || str(p.id),
          name: str(p.name),
          role: str(p.role) || undefined,
        };
      }).filter((p) => p.id)
    : undefined;

  const rawPhotos = Array.isArray(b.photos)
    ? (b.photos as unknown[])
    : Array.isArray(setup.photos) ? (setup.photos as unknown[]) : [];

  // Photos may be:
  //   1. Full URLs (string starting with http) → use directly
  //   2. Photo ID strings → build URL like coverUrl does
  //   3. Objects with a url / _id / id field → extract accordingly
  const photos = rawPhotos
    .map((p): string => {
      if (typeof p === 'string' && p.trim()) {
        const s = p.trim();
        return s.startsWith('http') ? s : `${BASE}/public/businesses/${id}/photos/${s}`;
      }
      if (p && typeof p === 'object') {
        const obj = p as Record<string, unknown>;
        const url = str(obj.url) || str(obj.photoUrl) || str(obj.imageUrl);
        if (url.startsWith('http')) return url;
        const pid = str(obj._id) || str(obj.id);
        if (pid) return `${BASE}/public/businesses/${id}/photos/${pid}`;
      }
      return '';
    })
    .filter(Boolean);

  return {
    id,
    name:          str(b.name),
    vendorName:    str(b.vendorName),
    typeLabel:     str(b.typeLabel),
    categoryLabel: str(b.categoryLabel),
    address:       str(b.address),
    description:   str(b.description),
    pricePerSlot,
    slotMinutes:   typeof b.slotMinutes === 'number' ? b.slotMinutes : 60,
    bookingMode:   (b.bookingMode === 'services' || setup.bookingMode === 'services') ? 'services'
               : (b.bookingMode === 'fullDay'  || setup.bookingMode === 'fullDay')  ? 'fullDay'
               : 'slots',
    maxGuests:     typeof b.maxGuests === 'number' ? b.maxGuests : null,
    resourceCount: typeof b.resourceCount === 'number' ? b.resourceCount : 0,
    priceFrom:     typeof b.priceFrom === 'number' ? b.priceFrom : pricePerSlot,
    priceTo:       typeof b.priceTo   === 'number' ? b.priceTo   : pricePerSlot,
    coverUrl:      coverUrl || undefined,
    module:        str(b.module) || undefined,
    venueRules:    str(b.venueRules) || str(setup.venueRules) || undefined,
    services:      services?.length ? services : undefined,
    staff:         staff?.length    ? staff    : undefined,
    photos:        photos.length    ? photos   : undefined,
  };
}

function normalizeEvent(raw: unknown): PublicEvent | null {
  const e  = asRec(raw);
  const id = str(e._id) || str(e.id);
  if (!id) return null;
  return {
    id,
    businessId:           str(e.businessId) || str(e.business) || '',
    title:                str(e.title),
    businessName:         str(e.businessName),
    coverUrl:             str(e.coverUrl) || str(e.coverImageUrl) || undefined,
    startAt:              str(e.startAt) || str(e.date),
    venue:                str(e.venue) || str(e.address),
    entryFee:             typeof e.entryFee  === 'number' ? e.entryFee  : 0,
    spotsLeft:            typeof e.spotsLeft === 'number' ? e.spotsLeft : null,
    // Detail fields
    kind:                 e.kind === 'event' ? 'event' : e.kind === 'tournament' ? 'tournament' : undefined,
    format:               e.format === 'team' ? 'team' : e.format === 'individual' ? 'individual' : undefined,
    teamSize:             typeof e.teamSize  === 'number' ? e.teamSize  : null,
    capacity:             typeof e.capacity  === 'number' ? e.capacity  : null,
    description:          str(e.description)  || undefined,
    rules:                str(e.rules)         || undefined,
    tournamentType:       str(e.tournamentType)|| undefined,
    skillLevel:           str(e.skillLevel)    || undefined,
    ageCategory:          str(e.ageCategory)   || undefined,
    genderCategory:       str(e.genderCategory)|| undefined,
    registrationDeadline: typeof e.registrationDeadline === 'string' ? e.registrationDeadline : null,
    endAt:                typeof e.endAt  === 'string' ? e.endAt  : null,
    status:               str(e.status) || undefined,
  };
}

function normalizeProfile(raw: unknown): CustomerProfile {
  const root = asRec(raw);
  const u    = asRec(root.user) && Object.keys(asRec(root.user)).length > 0
    ? asRec(root.user)
    : root;
  return {
    id:     str(u._id) || str(u.id) || undefined,
    name:   str(u.name)   || undefined,
    mobile: str(u.mobile) || undefined,
    roles:  Array.isArray(u.roles) ? (u.roles as string[]) : undefined,
  };
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function listVendorBookings(
  token: string,
  opts?: { businessId?: string },
): Promise<VendorBooking[]> {
  const qs = opts?.businessId ? `?businessId=${encodeURIComponent(opts.businessId)}` : '';
  const data = await get<unknown>(`vendor/bookings${qs}`, token);
  const list = asRec(data).bookings;
  return Array.isArray(list)
    ? list.map(normalizeBooking).filter((b): b is VendorBooking => b !== null)
    : [];
}

export async function listCustomerBookings(token: string): Promise<CustomerBooking[]> {
  const data = await get<unknown>('user/bookings', token);
  const list = asRec(data).bookings;
  return Array.isArray(list)
    ? list.map(normalizeBooking).filter((b): b is CustomerBooking => b !== null)
    : [];
}

export async function cancelCustomerBooking(id: string, token: string): Promise<void> {
  await del(`user/bookings/${id}`, token);
}

export async function requestBookingRefund(id: string, token: string): Promise<void> {
  await request<unknown>('POST', `user/bookings/${id}/refund`, token, {});
}

export async function listPublicBusinesses(): Promise<PublicBusiness[]> {
  const data = await get<unknown>('public/businesses');
  const list = asRec(data).businesses;
  return Array.isArray(list)
    ? list.map(normalizeBusiness).filter((b): b is PublicBusiness => b !== null)
    : [];
}

export async function listPublicEvents(): Promise<PublicEvent[]> {
  try {
    const data = await get<unknown>('public/events');
    const list = asRec(data).events;
    return Array.isArray(list)
      ? list.map(normalizeEvent).filter((e): e is PublicEvent => e !== null)
      : [];
  } catch {
    return [];
  }
}

export async function getPublicEvent(eventId: string): Promise<PublicEvent> {
  const data  = await get<unknown>(`public/events/${encodeURIComponent(eventId)}`);
  const event = normalizeEvent(asRec(data).event ?? data);
  if (!event) throw new Error('Event not found.');
  return event;
}

export async function registerForEvent(
  token: string,
  eventId: string,
  body: { teamName?: string; participants?: { name: string }[] },
): Promise<EventRegistrationResult> {
  const data = await request<unknown>(
    'POST',
    `user/events/${encodeURIComponent(eventId)}/register`,
    token,
    body,
  );
  const d   = asRec(data);
  const reg = asRec(d.registration);
  const pay = asRec(d.payment ?? {});
  const id  = str(reg._id) || str(reg.id);
  if (!id) throw new Error('Registration failed — invalid response.');
  const amount           = typeof pay.amount === 'number' ? pay.amount
                         : typeof reg.amount === 'number' ? reg.amount : 0;
  const paymentSessionId = str(pay.paymentSessionId) || str(pay.payment_session_id)
                         || str(d.paymentSessionId) || str(d.payment_session_id) || undefined;
  const paymentLink      = str(pay.paymentLink) || str(pay.payment_link) || str(pay.paymentUrl)
                         || str(d.paymentLink)  || str(d.payment_link)  || str(d.paymentUrl) || undefined;
  const orderId          = str(pay.orderId) || str(pay.order_id) || str(pay.cashfreeOrderId) || str(d.orderId) || undefined;
  const paymentRequired  = !!(paymentSessionId || paymentLink || amount > 0 && d.payment);
  return { registrationId: id, orderId, paymentRequired, amount, paymentSessionId, paymentLink };
}

export async function getPublicBusiness(businessId: string): Promise<PublicBusiness> {
  const data = await get<unknown>(`public/businesses/${encodeURIComponent(businessId)}`);
  const biz  = normalizeBusiness(asRec(data).business ?? asRec(data).data ?? data);
  if (!biz) throw new Error('Business not found.');
  return biz;
}

export async function getPublicSlots(
  businessId: string,
  date: string,
  resourceId?: string,
  opts?: { serviceIds?: string[]; staffId?: string },
): Promise<PublicSlotsResponse> {
  const qs  = new URLSearchParams({ date });
  if (resourceId) qs.set('resourceId', resourceId);
  if (opts?.serviceIds?.length) qs.set('serviceIds', opts.serviceIds.join(','));
  if (opts?.staffId) qs.set('staffId', opts.staffId);
  const data = await get<unknown>(`public/businesses/${encodeURIComponent(businessId)}/slots?${qs}`);
  const d    = asRec(data);
  const rawSlots = Array.isArray(d.slots) ? d.slots : [];
  const rawRes   = Array.isArray(d.resources) ? d.resources : [];
  const slots: PublicSlot[] = rawSlots.map((s: unknown) => {
    const r = asRec(s);
    return {
      id:           str(r._id) || str(r.id),
      resourceId:   str(r.resourceId),
      resourceName: str(r.resourceName),
      startAt:      str(r.startAt),
      endAt:        str(r.endAt),
      startTime:    str(r.startTime),
      endTime:      str(r.endTime),
      date:         str(r.date),
      status:       (str(r.status) || 'available') as PublicSlot['status'],
      pricePerSlot: typeof r.pricePerSlot === 'number' ? r.pricePerSlot : 0,
    };
  });
  return {
    resources:    rawRes.map((r: unknown) => {
      const rr = asRec(r);
      return { id: str(rr._id) || str(rr.id), name: str(rr.name), pricePerSlot: typeof rr.pricePerSlot === 'number' ? rr.pricePerSlot : 0 };
    }),
    slots,
    slotMinutes:  typeof d.slotMinutes  === 'number' ? d.slotMinutes  : 60,
    bookingMode:  d.bookingMode === 'services' ? 'services' : d.bookingMode === 'fullDay' ? 'fullDay' : 'slots',
    pricePerSlot: typeof d.pricePerSlot === 'number' ? d.pricePerSlot : 0,
  };
}

export async function initiateCustomerBooking(
  token: string,
  body: InitiateBookingBody,
): Promise<InitiateBookingResult> {
  const data = await request<unknown>('POST', 'user/bookings/initiate', token, body);
  const d    = asRec(data);
  const bk   = asRec(d.booking ?? d);
  const pay  = asRec(d.payment ?? {});
  return {
    bookingId:        str(bk._id) || str(bk.id) || str(d.bookingId),
    orderId:          str(pay.orderId) || str(pay.order_id) || str(pay.cashfreeOrderId) || str(d.orderId) || undefined,
    amount:           typeof bk.amount === 'number' ? bk.amount : (typeof d.amount === 'number' ? d.amount : 0),
    status:           str(bk.status) || str(d.status) || 'confirmed',
    paymentSessionId: str(pay.paymentSessionId) || str(pay.payment_session_id)
                    || str(bk.paymentSessionId) || str(d.paymentSessionId) || str(d.payment_session_id) || undefined,
    paymentLink:      str(pay.paymentLink) || str(pay.payment_link) || str(pay.paymentUrl)
                    || str(d.paymentLink)  || str(d.payment_link)  || str(d.paymentUrl) || undefined,
    mode:             str(pay.mode) || str(pay.environment) || str(d.mode) || undefined,
  };
}

export async function listMyEventRegistrations(token: string): Promise<CustomerEventRegistration[]> {
  try {
    const data = await get<unknown>('user/event-registrations', token);
    const d    = asRec(data);
    const list: unknown[] = Array.isArray(d.registrations)      ? d.registrations
                          : Array.isArray(d.eventRegistrations) ? d.eventRegistrations
                          : Array.isArray(data)                  ? (data as unknown[])
                          : [];
    return list.map((raw: unknown) => {
      const r  = asRec(raw);
      const ev = asRec(r.event ?? {});
      return {
        id:           str(r._id) || str(r.id),
        eventId:      str(r.eventId) || str(ev._id) || str(ev.id),
        eventTitle:   str(r.eventTitle) || str(ev.title),
        businessName: str(r.businessName) || str(ev.businessName),
        kind:         r.kind === 'tournament' ? 'tournament' as const : 'event' as const,
        format:       r.format === 'team' ? 'team' as const : 'individual' as const,
        teamName:     typeof r.teamName === 'string' ? r.teamName : null,
        participants: Array.isArray(r.participants)
          ? (r.participants as unknown[]).map((p: unknown) => ({ name: str(asRec(p).name) }))
          : [],
        amount:       typeof r.amount === 'number' ? r.amount : 0,
        currency:     str(r.currency) || 'INR',
        status:       str(r.status) || 'confirmed',
        paymentStatus: typeof r.paymentStatus === 'string' ? r.paymentStatus : null,
        startAt:      str(r.startAt) || str(ev.startAt),
        venue:        str(r.venue) || str(ev.venue) || str(ev.address),
        createdAt:    str(r.createdAt) || undefined,
      };
    }).filter((r) => r.id);
  } catch {
    return [];
  }
}

export async function getCustomerProfile(token: string): Promise<CustomerProfile> {
  const data = await get<unknown>('user/profile', token);
  return normalizeProfile(data);
}

export async function updateCustomerProfile(
  name: string,
  token: string,
): Promise<CustomerProfile> {
  const data = await patch<unknown>('user/profile', token, { name });
  return normalizeProfile(data);
}

// ─── Shared utilities (date / display) ───────────────────────────────────────

/** "2024-06-01" in IST — used for grouping by day */
export function istDayKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/** ISO → "9:30 AM" in IST */
export function formatTime12(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

/** ISO → { weekday: "Mon", day: "01", month: "Jun" } */
export function dayParts(iso: string) {
  const d = new Date(iso);
  return {
    weekday: d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' }),
    day:     d.toLocaleDateString('en-IN', { day: '2-digit',   timeZone: 'Asia/Kolkata' }),
    month:   d.toLocaleDateString('en-IN', { month: 'short',   timeZone: 'Asia/Kolkata' }),
  };
}

/** ISO → "Mon, 1 Jun" */
export function fullDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short',
    day:     'numeric',
    month:   'short',
    timeZone: 'Asia/Kolkata',
  });
}

/** "₹500/slot" or "₹200–₹800/day" — empty string when price unknown */
export function priceTag(biz: PublicBusiness): string {
  const unit = biz.bookingMode === 'fullDay' ? '/day' : '/slot';
  const from = biz.priceFrom || biz.pricePerSlot;
  const to   = biz.priceTo   || from;
  if (!from) return '';
  if (from === to) return `₹${from.toLocaleString('en-IN')}${unit}`;
  return `₹${from.toLocaleString('en-IN')}–${to.toLocaleString('en-IN')}${unit}`;
}

/** Emoji based on business type/category keywords */
export function businessEmoji(
  biz: Pick<PublicBusiness, 'typeLabel' | 'categoryLabel'>,
): string {
  const t = `${biz.typeLabel} ${biz.categoryLabel}`.toLowerCase();
  if (/turf|sport|ground|court|football|cricket|badminton|tennis|play/.test(t)) return '⚽';
  if (/salon|spa|beauty|hair|nail|groom|makeup/.test(t))                        return '💇';
  if (/venue|hall|banquet|party|wedding|function|event/.test(t))                return '🎉';
  if (/clinic|doctor|health|dental|medical|hospital|therapy|physio/.test(t))   return '🩺';
  if (/gym|fitness|yoga|workout|crossfit/.test(t))                              return '🏋️';
  if (/photo|studio|creator|record/.test(t))                                    return '🎬';
  return '📍';
}
