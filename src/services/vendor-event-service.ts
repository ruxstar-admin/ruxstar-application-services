/**
 * Vendor Event Service
 * Mirrors web lib/api.ts (Events section) + lib/business-setup.ts
 * Endpoints: /vendor/events  ·  /vendor/events/:id
 */

import { API_URL } from '@/constants/config';

const BASE = API_URL;

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function req<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  };
  const res = await fetch(`${BASE}/${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d   = data as Record<string, unknown>;
    const msg =
      (typeof d.message === 'string' && d.message) ||
      (typeof d.error   === 'string' && d.error)   ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

const get   = <T>(path: string, token: string)               => req<T>('GET',   path, token);
const post  = <T>(path: string, token: string, body: unknown) => req<T>('POST',  path, token, body);
const patch = <T>(path: string, token: string, body: unknown) => req<T>('PATCH', path, token, body);

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventKind   = 'tournament' | 'event';
export type EventFormat = 'individual' | 'team';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export interface RuxEvent {
  id:                   string;
  businessId:           string;
  businessName:         string;
  kind:                 EventKind;
  title:                string;
  description:          string;
  tournamentType:       string;
  format:               EventFormat;
  teamSize:             number | null;
  capacity:             number | null;
  reservedCount:        number;
  confirmedCount:       number;
  spotsLeft:            number | null;
  entryFee:             number;
  currency:             string;
  venue:                string;
  coverUrl:             string | null;
  skillLevel:           string;
  ageCategory:          string;
  genderCategory:       string;
  rules:                string;
  startAt:              string | null;
  endAt:                string | null;
  registrationDeadline: string | null;
  status:               EventStatus;
  createdAt?:           string;
  updatedAt?:           string;
}

export interface EventRegistration {
  id:             string;
  eventId:        string;
  kind:           EventKind;
  format:         EventFormat;
  teamName:       string | null;
  participants:   { name: string }[];
  customerName:   string;
  customerMobile: string;
  amount:         number;
  currency:       string;
  status:         string;   // 'confirmed' | 'pending_payment' | 'cancelled'
  paymentStatus?: string | null;
  createdAt?:     string;
}

export interface EventInput {
  businessId?:           string;
  kind?:                 EventKind;
  title?:                string;
  description?:          string;
  tournamentType?:       string;
  format?:               EventFormat;
  teamSize?:             number | null;
  capacity?:             number | null;
  entryFee?:             number;
  venue?:                string;
  skillLevel?:           string;
  ageCategory?:          string;
  genderCategory?:       string;
  rules?:                string;
  startAt?:              string;
  endAt?:                string | null;
  registrationDeadline?: string | null;
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

function asRec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}
function str(v: unknown): string { return typeof v === 'string' ? v : ''; }
function numOrNull(v: unknown): number | null { return typeof v === 'number' ? v : null; }

const VALID_STATUSES: EventStatus[] = ['draft', 'published', 'cancelled', 'completed'];

export function normalizeEvent(raw: unknown): RuxEvent | null {
  const e  = asRec(raw);
  const id = str(e._id) || str(e.id);
  if (!id) return null;
  return {
    id,
    businessId:           str(e.businessId),
    businessName:         str(e.businessName),
    kind:                 e.kind === 'event' ? 'event' : 'tournament',
    title:                str(e.title),
    description:          str(e.description),
    tournamentType:       str(e.tournamentType),
    format:               e.format === 'team' ? 'team' : 'individual',
    teamSize:             numOrNull(e.teamSize),
    capacity:             numOrNull(e.capacity),
    reservedCount:        typeof e.reservedCount  === 'number' ? e.reservedCount  : 0,
    confirmedCount:       typeof e.confirmedCount === 'number' ? e.confirmedCount : 0,
    spotsLeft:            numOrNull(e.spotsLeft),
    entryFee:             typeof e.entryFee === 'number' ? e.entryFee : 0,
    currency:             str(e.currency) || 'INR',
    venue:                str(e.venue),
    coverUrl:             typeof e.coverUrl === 'string' ? e.coverUrl : null,
    skillLevel:           str(e.skillLevel),
    ageCategory:          str(e.ageCategory),
    genderCategory:       str(e.genderCategory),
    rules:                str(e.rules),
    startAt:              typeof e.startAt   === 'string' ? e.startAt   : null,
    endAt:                typeof e.endAt     === 'string' ? e.endAt     : null,
    registrationDeadline: typeof e.registrationDeadline === 'string' ? e.registrationDeadline : null,
    status:               VALID_STATUSES.includes(str(e.status) as EventStatus)
                            ? str(e.status) as EventStatus
                            : 'draft',
    createdAt:  str(e.createdAt) || undefined,
    updatedAt:  str(e.updatedAt) || undefined,
  };
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function listVendorEvents(token: string): Promise<RuxEvent[]> {
  const data = await get<unknown>('vendor/events', token);
  const list = asRec(data).events;
  return Array.isArray(list)
    ? list.map(normalizeEvent).filter((e): e is RuxEvent => e !== null)
    : [];
}

export async function createVendorEvent(token: string, body: EventInput): Promise<RuxEvent> {
  const data  = await post<unknown>('vendor/events', token, body);
  const event = normalizeEvent(asRec(data).event);
  if (!event) throw new Error('Could not create event.');
  return event;
}

export async function updateVendorEvent(
  token: string, eventId: string, body: EventInput,
): Promise<RuxEvent> {
  const data  = await patch<unknown>(`vendor/events/${eventId}`, token, body);
  const event = normalizeEvent(asRec(data).event);
  if (!event) throw new Error('Could not update event.');
  return event;
}

export async function getVendorEvent(
  token: string, eventId: string,
): Promise<{ event: RuxEvent; registrations: EventRegistration[] }> {
  const data = await get<unknown>(`vendor/events/${encodeURIComponent(eventId)}`, token);
  const d    = asRec(data);
  const event = normalizeEvent(asRec(d.event));
  if (!event) throw new Error('Event not found.');
  const rawRegs = Array.isArray(d.registrations) ? d.registrations : [];
  const registrations: EventRegistration[] = rawRegs.map((r: unknown) => {
    const reg = asRec(r);
    return {
      id:             str(reg._id) || str(reg.id),
      eventId:        str(reg.eventId),
      kind:           reg.kind === 'event' ? 'event' : 'tournament',
      format:         reg.format === 'team' ? 'team' : 'individual',
      teamName:       typeof reg.teamName === 'string' ? reg.teamName : null,
      participants:   Array.isArray(reg.participants)
                        ? (reg.participants as unknown[]).map((p) => ({ name: str(asRec(p).name) }))
                        : [],
      customerName:   str(reg.customerName),
      customerMobile: str(reg.customerMobile),
      amount:         typeof reg.amount === 'number' ? reg.amount : 0,
      currency:       str(reg.currency) || 'INR',
      status:         str(reg.status) || 'confirmed',
      paymentStatus:  typeof reg.paymentStatus === 'string' ? reg.paymentStatus : null,
      createdAt:      str(reg.createdAt) || undefined,
    };
  });
  return { event, registrations };
}

export async function setVendorEventStatus(
  token: string, eventId: string, action: 'publish' | 'unpublish' | 'cancel',
): Promise<RuxEvent> {
  const data  = await post<unknown>(`vendor/events/${eventId}/${action}`, token, {});
  const event = normalizeEvent(asRec(data).event);
  if (!event) throw new Error('Could not update event status.');
  return event;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Infer tournament vs ticketed event from business typeId.
 * Mirrors web lib/business-setup.ts → defaultEventKindForBusiness.
 */
export function defaultEventKindForBusiness(typeId: string, typeLabel = ''): EventKind {
  if (typeId === 'sports_event') return 'tournament';
  if (typeId === 'concert')      return 'event';
  const hint = `${typeId} ${typeLabel}`.toLowerCase();
  if (/sport|tournament|cricket|football|badminton|tennis|esports/.test(hint)) return 'tournament';
  return 'event';
}

// ─── Date/time helpers (mobile-safe) ─────────────────────────────────────────

/** "2026-03-15T18:30:00.000Z" → "2026-03-15" */
export function toDateStr(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch { return ''; }
}

/** "2026-03-15T18:30:00.000Z" → "18:30" */
export function toTimeStr(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return ''; }
}

/** "2026-03-15" + "18:30" → ISO string, or null if invalid */
export function combineDateTime(date: string, time: string): string | null {
  if (!date.trim()) return null;
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi]    = (time || '00:00').split(':').map(Number);
  if (!y || !mo || !d) return null;
  const dt = new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0, 0, 0);
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}
