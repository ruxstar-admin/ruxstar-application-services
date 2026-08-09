/**
 * Vendor Business Service
 * Endpoints: catalog · list · create · delete
 * Mirrors ruxstar-frontend-services/lib/api.ts (business + catalog sections)
 */

import { API_URL } from '@/constants/config';

const BASE = API_URL;

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function req<T>(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

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
    console.error(`[vendor-business-service] ${method} ${path} failed | status: ${res.status} | message: ${msg}`);
    throw new Error(msg);
  }

  return data as T;
}

const get   = <T>(path: string, token?: string)              => req<T>('GET',    path, token);
const post  = <T>(path: string, token: string, body: unknown) => req<T>('POST',   path, token, body);
const patch = <T>(path: string, token: string, body: unknown) => req<T>('PATCH',  path, token, body);
const del   =     (path: string, token: string)               => req<void>('DELETE', path, token);

// ─── Types ────────────────────────────────────────────────────────────────────

export type BusinessModule = 'events' | 'appointments' | 'services' | 'commerce' | 'creator' | 'print';

export const BUSINESS_MODULES: BusinessModule[] = [
  'events', 'appointments', 'services', 'commerce', 'creator', 'print',
];

export interface CatalogBusinessType {
  id:              string;
  categoryId:      string;
  label:           string;
  description:     string;
  examples:        string;
  namePlaceholder: string;
  module:          BusinessModule;
}

export interface CatalogBusinessCategory {
  id:          string;
  label:       string;
  description: string;
  icon:        string;
  types:       CatalogBusinessType[];
}

export interface BusinessCatalog {
  categories:  CatalogBusinessCategory[];
  modules:     Record<string, string>;
}

export type BookingMode = 'slots' | 'fullDay' | 'services';

export interface Business {
  id:            string;
  name:          string;
  typeId:        string;
  categoryId:    string;
  typeLabel:     string;
  categoryLabel: string;
  module:        BusinessModule;
  phone:         string;
  address:       string;
  description:   string;
  thumbnailUrl?: string;
  status:        'live' | 'draft';
  setupComplete: boolean;
  createdAt:     string;
}

export interface BusinessInput {
  name:         string;
  typeId:       string;
  /** Legacy category label — used by AddBusinessModal before type IDs were introduced */
  category?:    string;
  phone:        string;
  address:      string;
  description:  string;
  bookingMode?: BookingMode;
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

function asRec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function normalizeBusiness(raw: unknown): Business | null {
  const b  = asRec(raw);
  const id = str(b._id) || str(b.id);
  if (!id) return null;

  const module = BUSINESS_MODULES.includes(b.module as BusinessModule)
    ? (b.module as BusinessModule)
    : 'commerce';

  return {
    id,
    name:          str(b.name),
    typeId:        str(b.typeId),
    categoryId:    str(b.categoryId),
    typeLabel:     str(b.typeLabel),
    categoryLabel: str(b.categoryLabel),
    module,
    phone:         str(b.phone),
    address:       str(b.address),
    description:   str(b.description),
    thumbnailUrl:  str(b.thumbnailUrl) || undefined,
    status:        b.status === 'live' ? 'live' : 'draft',
    setupComplete: b.setupComplete === true,
    createdAt:     str(b.createdAt) || new Date().toISOString(),
  };
}

function normalizeType(raw: unknown): CatalogBusinessType | null {
  const t  = asRec(raw);
  const id = str(t.id);
  if (!id) return null;
  const module = BUSINESS_MODULES.includes(t.module as BusinessModule)
    ? (t.module as BusinessModule)
    : 'commerce';
  return {
    id,
    categoryId:      str(t.categoryId),
    label:           str(t.label),
    description:     str(t.description),
    examples:        str(t.examples),
    namePlaceholder: str(t.namePlaceholder),
    module,
  };
}

function normalizeCategory(raw: unknown): CatalogBusinessCategory | null {
  const c  = asRec(raw);
  const id = str(c.id);
  if (!id) return null;
  const types = Array.isArray(c.types)
    ? c.types.map(normalizeType).filter((t): t is CatalogBusinessType => t !== null)
    : [];
  return {
    id,
    label:       str(c.label),
    description: str(c.description),
    icon:        str(c.icon) || '🏪',
    types,
  };
}

// ─── API ─────────────────────────────────────────────────────────────────────

/** GET /catalog/business — no auth required */
export async function getBusinessCatalog(): Promise<BusinessCatalog> {
  const data = await get<unknown>('catalog/business');
  const payload = asRec(data);

  const categories = Array.isArray(payload.categories)
    ? payload.categories
        .map(normalizeCategory)
        .filter((c): c is CatalogBusinessCategory => c !== null)
    : [];

  const modulesRaw = asRec(payload.modules);
  const modules: Record<string, string> = {};
  for (const [key, value] of Object.entries(modulesRaw)) {
    if (typeof value === 'string') modules[key] = value;
  }

  return { categories, modules };
}

/** GET /vendor/businesses */
export async function listVendorBusinesses(token: string): Promise<Business[]> {
  const data = await get<unknown>('vendor/businesses', token);
  const list = asRec(data).businesses;
  return Array.isArray(list)
    ? list.map(normalizeBusiness).filter((b): b is Business => b !== null)
    : [];
}

/** POST /vendor/businesses */
export async function createVendorBusiness(
  token: string,
  input: BusinessInput,
): Promise<Business> {
  const data = await post<unknown>('vendor/businesses', token, input);
  const b    = normalizeBusiness(asRec(data).business);
  if (!b) throw new Error('Invalid response from server');
  return b;
}

/** POST /vendor/businesses/:id/thumbnail — upload or replace cover photo */
export async function uploadBusinessThumbnail(
  token: string,
  id: string,
  image: string,           // base64 data-URI
): Promise<Business> {
  const data = await post<unknown>(`vendor/businesses/${id}/thumbnail`, token, { image });
  const b    = normalizeBusiness(asRec(data).business ?? data);
  if (!b) throw new Error('Invalid response from server');
  return b;
}

/** DELETE /vendor/businesses/:id */
export async function deleteVendorBusiness(token: string, id: string): Promise<void> {
  await del(`vendor/businesses/${id}`, token);
}

/** PATCH /vendor/businesses/:id — toggle store live/draft */
export async function updateBusinessStatus(
  token: string,
  id: string,
  status: 'live' | 'draft',
): Promise<Business> {
  const data = await patch<unknown>(`vendor/businesses/${id}`, token, { status });
  const b    = normalizeBusiness(asRec(data).business ?? data);
  if (!b) throw new Error('Invalid response from server');
  return b;
}

export interface BusinessProfilePatch {
  name?:        string;
  phone?:       string;
  address?:     string;
  description?: string;
}

/** PATCH /vendor/businesses/:id — edit name/phone/address/description without recreating the business */
export async function updateVendorBusiness(
  token: string,
  id: string,
  profilePatch: BusinessProfilePatch,
): Promise<Business> {
  const data = await patch<unknown>(`vendor/businesses/${id}`, token, profilePatch);
  const b    = normalizeBusiness(asRec(data).business ?? data);
  if (!b) throw new Error('Invalid response from server');
  return b;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function moduleLabel(
  module: BusinessModule,
  labels: Record<string, string> = {},
): string {
  return labels[module] ?? module.charAt(0).toUpperCase() + module.slice(1);
}

/** Modules that have a slot/service booking setup wizard. */
export const APPOINTMENT_MODULES: BusinessModule[] = ['appointments'];

/** Modules that manage events (tournaments/concerts) — separate wizard. */
export const EVENT_MODULES: BusinessModule[] = ['events'];

/** Modules with their own dedicated (non-slot) setup flow: PodSetupFlow, CommerceSetupFlow, CreatorSetupFlow. */
export const DEDICATED_SETUP_MODULES: BusinessModule[] = ['print', 'commerce', 'creator'];

/**
 * Returns true for types that need the vendor to choose hourly vs full-day
 * DURING creation. Only turf and venue — all others default automatically.
 */
export function needsBookingModeOnCreate(typeId: string): boolean {
  return typeId === 'turf' || typeId === 'venue';
}

/** @deprecated Use needsBookingModeOnCreate instead */
export function needsBookingMode(type: CatalogBusinessType): boolean {
  return APPOINTMENT_MODULES.includes(type.module);
}

// ─── Setup & Calendar Types ───────────────────────────────────────────────────

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface DayHours {
  open:   string;   // "09:00"
  close:  string;   // "22:00"
  closed: boolean;
}

export type WeeklyHours = Record<DayKey, DayHours>;

export interface BusinessResource {
  id:            string;
  name:          string;
  pricePerSlot?: number;
  capacity?:     number;
  description?:  string;
}

export interface BusinessPhoto {
  id:  string;
  url: string;
}

/** Staff member for service-mode businesses (salon/clinic/coaching). */
export interface BusinessStaff {
  id:    string;
  name:  string;
  role?: string;
}

/** Bookable service for service-mode businesses. */
export interface BusinessService {
  id:              string;
  name:            string;
  durationMinutes: number;
  price:           number;
  staffIds:        string[];
}

export type CommerceProfile = {
  notes: string;
  minOrderValue: number;
  acceptingOrders: boolean;
  activeProductCount: number;
};

export function defaultCommerceProfile(): CommerceProfile {
  return { notes: '', minOrderValue: 0, acceptingOrders: true, activeProductCount: 0 };
}

export type CreatorSocialLinks = {
  instagram: string;
  youtube: string;
  other: string;
};

export type CreatorProfile = {
  bio: string;
  niche: string;
  socialLinks: CreatorSocialLinks;
  acceptingBookings: boolean;
};

export function defaultCreatorProfile(): CreatorProfile {
  return {
    bio: '',
    niche: '',
    socialLinks: { instagram: '', youtube: '', other: '' },
    acceptingBookings: true,
  };
}

export interface BusinessSetup {
  bookingMode:   BookingMode;
  slotMinutes:   number;
  pricePerSlot:  number;
  weeklyHours:   WeeklyHours;
  resources:     BusinessResource[];
  photos:        BusinessPhoto[];
  maxGuests?:    number | null;
  venueRules?:   string;
  // Service-mode fields (salon / clinic / coaching)
  staff?:         BusinessStaff[];
  services?:      BusinessService[];
  bufferMinutes?: number;
  // Print-on-demand profile (print module)
  printProfile?:  import('@/types/print').PrintProfile | null;
  // Commerce shop profile (commerce module)
  commerceProfile?: CommerceProfile;
  // Creator profile (creator module)
  creatorProfile?: CreatorProfile;
}

/** Business types that use service-mode setup (Staff + Services, no slot booking). */
export const SERVICE_TYPE_IDS = ['salon', 'clinic', 'coaching'] as const;
export type ServiceTypeId = typeof SERVICE_TYPE_IDS[number];

export function isServiceType(typeId: string): boolean {
  return (SERVICE_TYPE_IDS as readonly string[]).includes(typeId);
}

export interface BusinessWithSetup extends Business {
  setup: BusinessSetup | null;
}

export interface BusinessSlot {
  id:              string;
  date:            string;     // "2024-01-01"
  startTime:       string;     // "09:00"
  startAt:         string;     // ISO datetime
  status:          'available' | 'blocked' | 'booked' | 'unavailable';
  resourceId:      string;
  resourceName:    string;
  pricePerSlot:    number;
  basePricePerSlot?: number;
  booking?: { customerName?: string };
}

export interface SlotResource {
  id:           string;
  name:         string;
  pricePerSlot: number;
}

export interface BusinessSlotsResponse {
  bookingMode:  BookingMode;
  slotMinutes:  number;
  pricePerSlot: number;
  resources:    SlotResource[];
  slots:        BusinessSlot[];
}

// ─── Setup Constants ──────────────────────────────────────────────────────────

export const SETUP_DAYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_SHORT: Record<DayKey, string> = {
  mon: 'Mo', tue: 'Tu', wed: 'We', thu: 'Th', fri: 'Fr', sat: 'Sa', sun: 'Su',
};

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

export const SLOT_MINUTES_OPTIONS = [15, 30, 45, 60, 90, 120];

export const DEFAULT_WEEKLY_HOURS: WeeklyHours = Object.fromEntries(
  SETUP_DAYS.map((d) => [d, { open: '09:00', close: '22:00', closed: false }]),
) as WeeklyHours;

// ─── Setup Helpers ────────────────────────────────────────────────────────────

/** Returns true for any module that has a setup flow (slots wizard, event wizard, or dedicated flow). */
export function supportsSetup(business: Business): boolean {
  return (
    APPOINTMENT_MODULES.includes(business.module) ||
    EVENT_MODULES.includes(business.module) ||
    DEDICATED_SETUP_MODULES.includes(business.module)
  );
}

/** Returns true if this business uses the slot/calendar setup (not event wizard). */
export function supportsSlotSetup(business: Business): boolean {
  return APPOINTMENT_MODULES.includes(business.module);
}

export function priceLabel(mode: BookingMode): string {
  return mode === 'fullDay' ? 'Price per day' : 'Price per slot';
}

export function resourceCopy(typeId: string): { title: string; placeholder: string } {
  if (typeId === 'turf')   return { title: 'Courts & turfs',       placeholder: 'e.g. Turf A'    };
  if (typeId === 'salon')  return { title: 'Chairs & stations',    placeholder: 'e.g. Chair 1'   };
  if (typeId === 'venue')  return { title: 'Halls & spaces',       placeholder: 'e.g. Grand Hall' };
  if (typeId === 'clinic') return { title: 'Consultation rooms',   placeholder: 'e.g. Room 1'    };
  return                          { title: 'Bookable resources',   placeholder: 'e.g. Resource 1' };
}

export function hasRulesStep(typeId: string, bookingMode: BookingMode): boolean {
  return typeId === 'venue' || bookingMode === 'fullDay';
}

export function applyFullDayHours(weeklyHours: WeeklyHours): WeeklyHours {
  const next = { ...weeklyHours };
  for (const day of SETUP_DAYS) {
    if (!next[day].closed) next[day] = { closed: false, open: '09:00', close: '23:59' };
  }
  return next;
}

// ─── Setup & Slots Normalisers ────────────────────────────────────────────────

function normalizeDayHours(raw: unknown): DayHours {
  const d = asRec(raw);
  return { open: str(d.open) || '09:00', close: str(d.close) || '22:00', closed: d.closed === true };
}

function normalizeWeeklyHours(raw: unknown): WeeklyHours {
  const r = asRec(raw);
  return Object.fromEntries(
    SETUP_DAYS.map((day) => [day, r[day] ? normalizeDayHours(r[day]) : { open: '09:00', close: '22:00', closed: false }]),
  ) as WeeklyHours;
}

function normalizeResource(raw: unknown): BusinessResource | null {
  const r  = asRec(raw);
  const id = str(r._id) || str(r.id);
  if (!id) return null;
  return {
    id,
    name:         str(r.name),
    pricePerSlot: typeof r.pricePerSlot === 'number' ? r.pricePerSlot : undefined,
    capacity:     typeof r.capacity     === 'number' ? r.capacity     : undefined,
    description:  str(r.description) || undefined,
  };
}

function normalizeStaff(raw: unknown): BusinessStaff | null {
  const s  = asRec(raw);
  const id = str(s._id) || str(s.id);
  if (!id) return null;
  return { id, name: str(s.name), role: str(s.role) || undefined };
}

function normalizeService(raw: unknown): BusinessService | null {
  const s  = asRec(raw);
  const id = str(s._id) || str(s.id);
  if (!id) return null;
  const staffIds = Array.isArray(s.staffIds)
    ? (s.staffIds as unknown[]).map((x) => str(x)).filter(Boolean)
    : [];
  return {
    id,
    name:            str(s.name),
    durationMinutes: typeof s.durationMinutes === 'number' ? s.durationMinutes : 30,
    price:           typeof s.price           === 'number' ? s.price           : 0,
    staffIds,
  };
}

function normalizeCommerceProfile(raw: unknown): CommerceProfile {
  const p = asRec(raw);
  const num = (v: unknown, fb: number) => typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fb;
  return {
    notes:               str(p.notes),
    minOrderValue:       num(p.minOrderValue, 0),
    acceptingOrders:     p.acceptingOrders !== false,
    activeProductCount:  num(p.activeProductCount, 0),
  };
}

function normalizeCreatorProfile(raw: unknown): CreatorProfile {
  const p     = asRec(raw);
  const links = asRec(p.socialLinks);
  return {
    bio:  str(p.bio),
    niche: str(p.niche),
    socialLinks: {
      instagram: str(links.instagram),
      youtube:   str(links.youtube),
      other:     str(links.other),
    },
    acceptingBookings: p.acceptingBookings !== false,
  };
}

function normalizeSetup(raw: unknown): BusinessSetup | null {
  if (!raw) return null;
  const s = asRec(raw);

  const bookingMode: BookingMode =
    s.bookingMode === 'fullDay'  ? 'fullDay'  :
    s.bookingMode === 'services' ? 'services' : 'slots';

  const resources = Array.isArray(s.resources)
    ? s.resources.map(normalizeResource).filter((r): r is BusinessResource => r !== null) : [];
  const photos = Array.isArray(s.photos)
    ? (s.photos as unknown[]).map((p) => {
        const ph = asRec(p);
        return { id: str(ph._id) || str(ph.id), url: str(ph.url) };
      }).filter((p) => p.id && p.url) : [];
  const staff = Array.isArray(s.staff)
    ? s.staff.map(normalizeStaff).filter((x): x is BusinessStaff => x !== null) : [];
  const services = Array.isArray(s.services)
    ? s.services.map(normalizeService).filter((x): x is BusinessService => x !== null) : [];

  // Parse printProfile if present
  let printProfile: import('@/types/print').PrintProfile | null = null;
  if (s.printProfile && typeof s.printProfile === 'object') {
    const pp = asRec(s.printProfile);
    const strArr = (v: unknown) => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    const num = (v: unknown, fb: number) => typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fb;
    printProfile = {
      serviceCategories: strArr(pp.serviceCategories),
      cities:            strArr(pp.cities),
      serveAll:          pp.serveAll === true,
      turnaroundDays:    num(pp.turnaroundDays, 3),
      minOrderValue:     num(pp.minOrderValue, 0),
      notes:             typeof pp.notes === 'string' ? pp.notes : '',
      acceptingOrders:   pp.acceptingOrders !== false,
      pricing:           pp.pricing && typeof pp.pricing === 'object' ? (pp.pricing as Record<string, import('@/types/print').CategoryPricing>) : {},
    };
  }

  return {
    bookingMode,
    slotMinutes:   typeof s.slotMinutes    === 'number' ? s.slotMinutes    : 60,
    pricePerSlot:  typeof s.pricePerSlot   === 'number' ? s.pricePerSlot   : 0,
    weeklyHours:   normalizeWeeklyHours(s.weeklyHours),
    resources,
    photos,
    maxGuests:     typeof s.maxGuests      === 'number' ? s.maxGuests      : null,
    venueRules:    str(s.venueRules) || undefined,
    staff:         staff.length   ? staff    : undefined,
    services:      services.length ? services : undefined,
    bufferMinutes: typeof s.bufferMinutes  === 'number' ? s.bufferMinutes  : 0,
    printProfile,
    commerceProfile: normalizeCommerceProfile(s.commerceProfile),
    creatorProfile:  normalizeCreatorProfile(s.creatorProfile),
  };
}

function normalizeSlot(raw: unknown): BusinessSlot | null {
  const s  = asRec(raw);
  const id = str(s._id) || str(s.id);
  if (!id) return null;
  const validStatuses = ['available', 'blocked', 'booked', 'unavailable'];
  const status = validStatuses.includes(str(s.status)) ? str(s.status) as BusinessSlot['status'] : 'unavailable';
  const booking = asRec(s.booking);
  return {
    id,
    date:             str(s.date),
    startTime:        str(s.startTime),
    startAt:          str(s.startAt),
    status,
    resourceId:       str(s.resourceId),
    resourceName:     str(s.resourceName),
    pricePerSlot:     typeof s.pricePerSlot     === 'number' ? s.pricePerSlot     : 0,
    basePricePerSlot: typeof s.basePricePerSlot === 'number' ? s.basePricePerSlot : undefined,
    booking:          booking.customerName ? { customerName: str(booking.customerName) } : undefined,
  };
}

function normalizeBusinessWithSetup(raw: unknown): BusinessWithSetup | null {
  const b = normalizeBusiness(raw);
  if (!b) return null;
  const s = asRec(raw);
  return { ...b, setup: normalizeSetup(s.setup) };
}

// ─── Setup API ────────────────────────────────────────────────────────────────

/** GET /vendor/businesses/:id/setup */
export async function getBusinessSetup(token: string, id: string): Promise<BusinessWithSetup> {
  const data = await get<unknown>(`vendor/businesses/${id}/setup`, token);
  const b    = normalizeBusinessWithSetup(asRec(data).business ?? data);
  if (!b) throw new Error('Invalid response from server');
  return b;
}

/** PATCH /vendor/businesses/:id/setup */
export async function updateBusinessSetup(
  token: string,
  id: string,
  input: Partial<BusinessSetup>,
): Promise<BusinessWithSetup> {
  const data = await patch<unknown>(`vendor/businesses/${id}/setup`, token, input);
  const b    = normalizeBusinessWithSetup(asRec(data).business ?? data);
  if (!b) throw new Error('Invalid response from server');
  return b;
}

/** POST /vendor/businesses/:id/setup/complete */
export async function completeBusinessSetup(token: string, id: string): Promise<Business> {
  const data = await post<unknown>(`vendor/businesses/${id}/setup/complete`, token, {});
  const b    = normalizeBusiness(asRec(data).business ?? data);
  if (!b) throw new Error('Invalid response from server');
  return b;
}

/** POST /vendor/businesses/:id/setup/photos/sync */
export async function syncBusinessSetupPhotos(
  token: string,
  id: string,
  payload: { images: string[]; removeIds: string[] },
): Promise<BusinessWithSetup> {
  console.log(
    '[vendor-business-service] syncBusinessSetupPhotos payload |',
    'images:', payload.images.map((img, i) => `#${i} len=${img.length} prefix="${img.slice(0, 30)}"`),
    '| removeIds:', payload.removeIds,
  );
  const data = await post<unknown>(`vendor/businesses/${id}/setup/photos/sync`, token, payload);
  const b    = normalizeBusinessWithSetup(asRec(data).business ?? data);
  if (!b) throw new Error('Invalid response from server');
  return b;
}

// ─── Slots API ────────────────────────────────────────────────────────────────

/** GET /vendor/businesses/:id/slots */
export async function listBusinessSlots(
  token: string,
  id: string,
  params: { from: string; to: string; resourceId?: string },
): Promise<BusinessSlotsResponse> {
  const qs = new URLSearchParams({ from: params.from, to: params.to });
  if (params.resourceId) qs.set('resourceId', params.resourceId);
  const data = await get<unknown>(`vendor/businesses/${id}/slots?${qs}`, token);
  const d    = asRec(data);
  const slots = Array.isArray(d.slots)
    ? d.slots.map(normalizeSlot).filter((s): s is BusinessSlot => s !== null) : [];
  const resources = Array.isArray(d.resources)
    ? (d.resources as unknown[]).map((r) => {
        const res = asRec(r);
        return { id: str(res._id) || str(res.id), name: str(res.name), pricePerSlot: typeof res.pricePerSlot === 'number' ? res.pricePerSlot : 0 };
      }).filter((r) => r.id) : [];
  return {
    bookingMode:  d.bookingMode === 'fullDay' ? 'fullDay' : 'slots',
    slotMinutes:  typeof d.slotMinutes  === 'number' ? d.slotMinutes  : 60,
    pricePerSlot: typeof d.pricePerSlot === 'number' ? d.pricePerSlot : 0,
    resources,
    slots,
  };
}

/** POST /vendor/businesses/:id/slots/block */
export async function blockBusinessSlot(
  token: string, id: string, payload: { resourceId: string; startAt: string },
): Promise<void> {
  await post<unknown>(`vendor/businesses/${id}/slots/block`, token, payload);
}

/** POST /vendor/businesses/:id/slots/unblock */
export async function unblockBusinessSlot(
  token: string, id: string, payload: { resourceId: string; startAt: string },
): Promise<void> {
  await post<unknown>(`vendor/businesses/${id}/slots/unblock`, token, payload);
}

/** POST /vendor/businesses/:id/slots/price */
export async function setBusinessSlotPrice(
  token: string, id: string, payload: { resourceId: string; startAt: string; pricePerSlot: number },
): Promise<void> {
  await post<unknown>(`vendor/businesses/${id}/slots/price`, token, payload);
}

/** POST /vendor/businesses/:id/slots/price/clear */
export async function clearBusinessSlotPrice(
  token: string, id: string, payload: { resourceId: string; startAt: string },
): Promise<void> {
  await post<unknown>(`vendor/businesses/${id}/slots/price/clear`, token, payload);
}
