import { apiDelete, apiGet, apiGetPage, apiPatch, apiPost, apiPostBytes, apiPut, type WriteOptions } from '@/lib/api-client';
import type {
  AddOnInput,
  Board,
  BookBody,
  CourtInput,
  DaySlots,
  DeskBooking,
  DeskBookingsView,
  DeskGround,
  GroundCard,
  GroundDetail,
  GroundFilters,
  GroundInput,
  MyBookingsView,
  OffersBody,
  PlacedBooking,
  Prices,
  Sport,
  TurfBooking,
  TurfOffers,
  TurfRules,
  VendorGround,
} from '@/types/turf';

const id = (value: string) => encodeURIComponent(value);
const UPLOAD_TIMEOUT_MS = 3 * 60_000;

/** `/v1/turf`: grounds, a court's slots, booking and paying, and the customer's bookings. */
export const TurfService = {
  rules: (token: string) => apiGet<TurfRules>('/v1/turf/rules', token),
  sports: (token: string) => apiGetPage<Sport>('/v1/turf/sports', token).then((p) => p.items),
  list: (token: string, filters: GroundFilters, cursor?: string) => apiGetPage<GroundCard>('/v1/turf', token, { ...filters, cursor }),
  get: (token: string, groundId: string) => apiGet<GroundDetail>(`/v1/turf/${id(groundId)}`, token),
  /** Slots that have started aren't listed. */
  slots: (token: string, courtId: string, date: string) => apiGet<DaySlots>(`/v1/turf/courts/${id(courtId)}/slots`, token, { date }),
  /** Coupons for the picked slots, add-ons and weeks; with `code`, that code is checked too. */
  offers: (token: string, courtId: string, body: OffersBody) => apiPost<TurfOffers>(`/v1/turf/courts/${id(courtId)}/offers`, { ...body }, token),
  /** Holds the slots for the checkout. A taken slot comes back as a conflict that names it. */
  book: (token: string, courtId: string, body: BookBody, options: WriteOptions) =>
    apiPost<PlacedBooking>(`/v1/turf/courts/${id(courtId)}/book`, { ...body }, token, options),
  bookings: (token: string, view: MyBookingsView, cursor?: string) => apiGetPage<TurfBooking>('/v1/turf/orders', token, { view, cursor }),
  /** While it waits for payment, the API asks Cashfree whether it was paid. */
  booking: (token: string, bookingId: string) => apiGet<TurfBooking>(`/v1/turf/orders/${id(bookingId)}`, token),
  pay: (token: string, bookingId: string, returnTo: string) => apiPost<{ checkoutUrl: string }>(`/v1/turf/orders/${id(bookingId)}/pay`, { returnTo }, token),
  /** Leave out `occurrences` for every date still to come. */
  cancel: (token: string, bookingId: string, occurrences: number[] | undefined, options: WriteOptions) =>
    apiPost<TurfBooking>(`/v1/turf/orders/${id(bookingId)}/cancel`, occurrences ? { occurrences } : {}, token, options),
};

/** `/v1/vendor`: the owner's grounds and courts. */
export const VendorTurfService = {
  list: (token: string, businessId: string) => apiGetPage<VendorGround>(`/v1/vendor/businesses/${id(businessId)}/grounds`, token),
  create: (token: string, businessId: string, body: GroundInput, options: WriteOptions) =>
    apiPost<VendorGround>(`/v1/vendor/businesses/${id(businessId)}/grounds`, { ...body }, token, options),
  get: (token: string, groundId: string) => apiGet<VendorGround>(`/v1/vendor/grounds/${id(groundId)}`, token),
  update: (token: string, groundId: string, changes: Partial<GroundInput>) => apiPatch<VendorGround>(`/v1/vendor/grounds/${id(groundId)}`, { ...changes }, token),
  /** Drafts that never had bookings. */
  remove: (token: string, groundId: string) => apiDelete<{ done: true }>(`/v1/vendor/grounds/${id(groundId)}`, token),
  addPhoto: (token: string, groundId: string, jpeg: Uint8Array<ArrayBuffer>) =>
    apiPostBytes<VendorGround>(`/v1/vendor/grounds/${id(groundId)}/photos`, { data: jpeg, type: 'image/jpeg' }, token, { timeoutMs: UPLOAD_TIMEOUT_MS }),
  removePhoto: (token: string, groundId: string, photoId: string) => apiDelete<VendorGround>(`/v1/vendor/grounds/${id(groundId)}/photos/${id(photoId)}`, token),
  /** Refused with every missing item listed at once. */
  publish: (token: string, groundId: string, options: WriteOptions) => apiPost<VendorGround>(`/v1/vendor/grounds/${id(groundId)}/publish`, undefined, token, options),
  addCourt: (token: string, groundId: string, body: CourtInput, options: WriteOptions) =>
    apiPost<VendorGround>(`/v1/vendor/grounds/${id(groundId)}/courts`, { ...body }, token, options),
  updateCourt: (token: string, courtId: string, changes: Partial<CourtInput>) => apiPatch<VendorGround>(`/v1/vendor/courts/${id(courtId)}`, { ...changes }, token),
  /** Only with no bookings to come. */
  removeCourt: (token: string, courtId: string) => apiDelete<VendorGround>(`/v1/vendor/courts/${id(courtId)}`, token),
};

/** `/v1/turf/desk`: the board, bookings, blocks and prices, for the owner and their team. */
export const TurfDeskService = {
  grounds: (token: string) => apiGetPage<DeskGround>('/v1/turf/desk/grounds', token).then((p) => p.items),
  board: (token: string, groundId: string, date: string) => apiGet<Board>(`/v1/turf/desk/grounds/${id(groundId)}/board`, token, { date }),
  bookings: (token: string, groundId: string, view: DeskBookingsView, cursor?: string) =>
    apiGetPage<DeskBooking>(`/v1/turf/desk/grounds/${id(groundId)}/bookings`, token, { view, cursor }),
  booking: (token: string, bookingId: string) => apiGet<DeskBooking>(`/v1/turf/desk/orders/${id(bookingId)}`, token),
  /** Always a full refund; the customer sees the reason. */
  cancel: (token: string, bookingId: string, body: { occurrences?: number[]; reason: string }, options: WriteOptions) =>
    apiPost<DeskBooking>(`/v1/turf/desk/orders/${id(bookingId)}/cancel`, { ...body }, token, options),
  arrival: (token: string, bookingId: string, n: number, status: 'arrived' | 'no_show', options: WriteOptions) =>
    apiPost<DeskBooking>(`/v1/turf/desk/orders/${id(bookingId)}/arrival`, { n, status }, token, options),
  /** All or none. */
  block: (token: string, courtId: string, startAts: string[], note: string | undefined, options: WriteOptions) =>
    apiPost<{ done: number }>('/v1/turf/desk/slots/block', { courtId, startAts, ...(note ? { note } : {}) }, token, options),
  unblock: (token: string, courtId: string, startAts: string[], options: WriteOptions) =>
    apiPost<{ done: number }>('/v1/turf/desk/slots/unblock', { courtId, startAts }, token, options),
  prices: (token: string, courtId: string, body: { prices?: Prices; addOns?: AddOnInput[] }) => apiPut<VendorGround>(`/v1/turf/desk/courts/${id(courtId)}/prices`, token, { ...body }),
};