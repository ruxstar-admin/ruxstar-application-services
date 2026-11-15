import { apiDelete, apiGet, apiGetPage, apiPatch, apiPost, apiPostBytes, type WriteOptions } from '@/lib/api-client';
import type { CouponCheck } from '@/types/coupon';
import type {
  Booking,
  BookTicketsBody,
  DeskEvent,
  EventCard,
  EventDetail,
  EventFilters,
  EventInput,
  EventRules,
  Guest,
  GuestsView,
  LookupTicket,
  MyTicketsView,
  MyWait,
  OfflineList,
  ScanResult,
  SyncResult,
  SyncScan,
  TicketOrder,
  VendorEvent,
} from '@/types/events';

const id = (value: string) => encodeURIComponent(value);
const UPLOAD_TIMEOUT_MS = 2 * 60_000;

/** `/v1/events`: what's on, tickets and the waitlist. */
export const EventsService = {
  rules: (token: string) => apiGet<EventRules>('/v1/events/rules', token),
  list: (token: string, filters: EventFilters, cursor?: string) => apiGetPage<EventCard>('/v1/events', token, { ...filters, cursor }),
  get: (token: string, eventId: string) => apiGet<EventDetail>(`/v1/events/${id(eventId)}`, token),
  /** Coupons for `items` paise of tickets, before the platform fee; with `code`, that code is checked too. */
  offers: (token: string, eventId: string, items: number, code?: string) =>
    apiGet<CouponCheck>(`/v1/events/${id(eventId)}/offers`, token, { items, ...(code ? { code } : {}) }),
  /** Free tickets come back confirmed with no checkout link. */
  book: (token: string, eventId: string, body: BookTicketsBody, options: WriteOptions) =>
    apiPost<{ order: TicketOrder; checkoutUrl: string | null }>(`/v1/events/${id(eventId)}/tickets`, { ...body }, token, options),
  joinWaitlist: (token: string, eventId: string, tierId: string, quantity: number, options: WriteOptions) =>
    apiPost<MyWait>(`/v1/events/${id(eventId)}/waitlist`, { tierId, quantity }, token, options),
  leaveWaitlist: (token: string, waitId: string) => apiDelete<MyWait>(`/v1/events/waitlist/${id(waitId)}`, token),
  orders: (token: string, view: MyTicketsView, cursor?: string) => apiGetPage<TicketOrder>('/v1/events/orders', token, { view, cursor }),
  /** While it waits for payment, the API asks Cashfree whether it was paid. */
  order: (token: string, orderId: string) => apiGet<TicketOrder>(`/v1/events/orders/${id(orderId)}`, token),
  pay: (token: string, orderId: string, returnTo: string) => apiPost<{ checkoutUrl: string }>(`/v1/events/orders/${id(orderId)}/pay`, { returnTo }, token),
  cancel: (token: string, orderId: string, options: WriteOptions) => apiPost<TicketOrder>(`/v1/events/orders/${id(orderId)}/cancel`, undefined, token, options),
};

/** `/v1/vendor`: an organiser's events and bookings. */
export const VendorEventsService = {
  list: (token: string, businessId: string) => apiGetPage<VendorEvent>(`/v1/vendor/businesses/${id(businessId)}/events`, token),
  create: (token: string, businessId: string, body: EventInput, options: WriteOptions) =>
    apiPost<VendorEvent>(`/v1/vendor/businesses/${id(businessId)}/events`, { ...body }, token, options),
  get: (token: string, eventId: string) => apiGet<VendorEvent>(`/v1/vendor/events/${id(eventId)}`, token),
  update: (token: string, eventId: string, changes: Partial<EventInput>) => apiPatch<VendorEvent>(`/v1/vendor/events/${id(eventId)}`, { ...changes }, token),
  setPhoto: (token: string, eventId: string, jpeg: Uint8Array<ArrayBuffer>) =>
    apiPostBytes<VendorEvent>(`/v1/vendor/events/${id(eventId)}/photo`, { data: jpeg, type: 'image/jpeg' }, token, { timeoutMs: UPLOAD_TIMEOUT_MS }),
  publish: (token: string, eventId: string, options: WriteOptions) => apiPost<VendorEvent>(`/v1/vendor/events/${id(eventId)}/publish`, undefined, token, options),
  cancel: (token: string, eventId: string, reason: string, options: WriteOptions) =>
    apiPost<VendorEvent>(`/v1/vendor/events/${id(eventId)}/cancel`, { reason }, token, options),
  remove: (token: string, eventId: string) => apiDelete<{ done: true }>(`/v1/vendor/events/${id(eventId)}`, token),
  bookings: (token: string, eventId: string, status: 'confirmed' | 'cancelled' | undefined, cursor?: string) =>
    apiGetPage<Booking>(`/v1/vendor/events/${id(eventId)}/bookings`, token, { status, cursor }),
};

/** `/v1/events/desk`: checking people in, for the owner and the team. */
export const DeskService = {
  list: (token: string) => apiGetPage<DeskEvent>('/v1/events/desk', token),
  get: (token: string, eventId: string) => apiGet<DeskEvent>(`/v1/events/desk/${id(eventId)}`, token),
  scan: (token: string, eventId: string, qr: string) => apiPost<ScanResult>(`/v1/events/desk/${id(eventId)}/scan`, { qr }, token),
  lookup: (token: string, eventId: string, q: string) => apiGetPage<LookupTicket>(`/v1/events/desk/${id(eventId)}/lookup`, token, { q }),
  checkIn: (token: string, eventId: string, ticketId: string) => apiPost<ScanResult>(`/v1/events/desk/${id(eventId)}/tickets/${id(ticketId)}/check-in`, undefined, token),
  offline: (token: string, eventId: string) => apiGet<OfflineList>(`/v1/events/desk/${id(eventId)}/offline`, token, undefined, { timeoutMs: 60_000 }),
  sync: (token: string, eventId: string, scans: SyncScan[]) => apiPost<SyncResult>(`/v1/events/desk/${id(eventId)}/sync`, { scans }, token),
  guests: (token: string, eventId: string, view: GuestsView, cursor?: string) =>
    apiGetPage<Guest>(`/v1/events/desk/${id(eventId)}/guests`, token, { view, cursor }),
};
