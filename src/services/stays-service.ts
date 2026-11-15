import { apiDelete, apiGet, apiGetPage, apiPatch, apiPost, apiPostBytes, apiPut, type WriteOptions } from '@/lib/api-client';
import type {
  Availability,
  BedBoard,
  ConsoleFacility,
  ConsoleProperty,
  ConsolePropertyDetail,
  ConsolePropertyFilter,
  ConsoleReservation,
  DeskProperty,
  DeskReservation,
  DeskReservationsView,
  Facility,
  MyStaysView,
  ObjectionStatus,
  PlacedReservation,
  PropertiesQuery,
  PropertyCard,
  PropertyDetail,
  PropertyInput,
  ReserveBody,
  RoomInput,
  RoomPrices,
  RoomStatus,
  StayOffers,
  StayPick,
  StayReservation,
  StaysRules,
  VendorProperty,
} from '@/types/stays';

const id = (value: string) => encodeURIComponent(value);
const UPLOAD_TIMEOUT_MS = 3 * 60_000;

/** `/v1/stays`: PGs and hostels, free beds, reserving and paying, and the tenant's stays. */
export const StaysService = {
  rules: (token: string) => apiGet<StaysRules>('/v1/stays/rules', token),
  facilities: (token: string) => apiGetPage<Facility>('/v1/stays/facilities', token).then((p) => p.items),
  list: (token: string, query: PropertiesQuery, cursor?: string) => apiGetPage<PropertyCard>('/v1/stays', token, { ...query, cursor }),
  get: (token: string, propertyId: string) => apiGet<PropertyDetail>(`/v1/stays/${id(propertyId)}`, token),
  /** Which beds are free for the whole stay. */
  availability: (token: string, propertyId: string, pick: Pick<StayPick, 'moveIn' | 'stay' | 'months' | 'nights'>) =>
    apiGet<Availability>(`/v1/stays/${id(propertyId)}/availability`, token, { ...pick }),
  /** Coupons for the stay picked; with `code`, that code is checked too. */
  offers: (token: string, roomId: string, body: StayPick & { code?: string }) => apiPost<StayOffers>(`/v1/stays/rooms/${id(roomId)}/offers`, { ...body }, token),
  /** Holds the beds for the checkout. Needs base KYC; a taken bed comes back as a conflict that names it. */
  reserve: (token: string, roomId: string, body: ReserveBody, options: WriteOptions) =>
    apiPost<PlacedReservation>(`/v1/stays/rooms/${id(roomId)}/reserve`, { ...body }, token, options),
  stays: (token: string, view: MyStaysView, cursor?: string) => apiGetPage<StayReservation>('/v1/stays/orders', token, { view, cursor }),
  /** While it waits for payment, the API asks Cashfree whether it was paid. */
  stay: (token: string, reservationId: string) => apiGet<StayReservation>(`/v1/stays/orders/${id(reservationId)}`, token),
  pay: (token: string, reservationId: string, returnTo: string) =>
    apiPost<{ checkoutUrl: string }>(`/v1/stays/orders/${id(reservationId)}/pay`, { returnTo }, token),
  cancel: (token: string, reservationId: string, reason: string | undefined, options: WriteOptions) =>
    apiPost<StayReservation>(`/v1/stays/orders/${id(reservationId)}/cancel`, reason ? { reason } : {}, token, options),
  /** Within the window after "Moved in": holds the owner's money until Ruxstar decides. */
  object: (token: string, reservationId: string, reason: string, options: WriteOptions) =>
    apiPost<StayReservation>(`/v1/stays/orders/${id(reservationId)}/objection`, { reason }, token, options),
  withdrawObjection: (token: string, reservationId: string, options: WriteOptions) =>
    apiDelete<StayReservation>(`/v1/stays/orders/${id(reservationId)}/objection`, token, undefined, options),
  /** Leave out `on` for the earliest day the notice period allows. */
  giveNotice: (token: string, reservationId: string, on: string | undefined, options: WriteOptions) =>
    apiPost<StayReservation>(`/v1/stays/orders/${id(reservationId)}/notice`, on ? { on } : {}, token, options),
};

/** `/v1/vendor`: the owner's properties and rooms. */
export const VendorStaysService = {
  list: (token: string, businessId: string) => apiGetPage<VendorProperty>(`/v1/vendor/businesses/${id(businessId)}/properties`, token),
  create: (token: string, businessId: string, body: PropertyInput, options: WriteOptions) =>
    apiPost<VendorProperty>(`/v1/vendor/businesses/${id(businessId)}/properties`, { ...body }, token, options),
  get: (token: string, propertyId: string) => apiGet<VendorProperty>(`/v1/vendor/properties/${id(propertyId)}`, token),
  update: (token: string, propertyId: string, changes: Partial<PropertyInput>) =>
    apiPatch<VendorProperty>(`/v1/vendor/properties/${id(propertyId)}`, { ...changes }, token),
  /** Drafts that never had reservations. */
  remove: (token: string, propertyId: string) => apiDelete<{ done: true }>(`/v1/vendor/properties/${id(propertyId)}`, token),
  addPhoto: (token: string, propertyId: string, jpeg: Uint8Array<ArrayBuffer>) =>
    apiPostBytes<VendorProperty>(`/v1/vendor/properties/${id(propertyId)}/photos`, { data: jpeg, type: 'image/jpeg' }, token, { timeoutMs: UPLOAD_TIMEOUT_MS }),
  removePhoto: (token: string, propertyId: string, photoId: string) =>
    apiDelete<VendorProperty>(`/v1/vendor/properties/${id(propertyId)}/photos/${id(photoId)}`, token),
  /** Refused with every missing item listed at once. */
  publish: (token: string, propertyId: string, options: WriteOptions) =>
    apiPost<VendorProperty>(`/v1/vendor/properties/${id(propertyId)}/publish`, undefined, token, options),
  addRoom: (token: string, propertyId: string, body: RoomInput, options: WriteOptions) =>
    apiPost<VendorProperty>(`/v1/vendor/properties/${id(propertyId)}/rooms`, { ...body }, token, options),
  updateRoom: (token: string, roomId: string, changes: Partial<RoomInput>) => apiPatch<VendorProperty>(`/v1/vendor/rooms/${id(roomId)}`, { ...changes }, token),
  /** Only with no reservations to come. */
  removeRoom: (token: string, roomId: string) => apiDelete<VendorProperty>(`/v1/vendor/rooms/${id(roomId)}`, token),
};

/** `/v1/stays/desk`: the bed map, reservations, tenants and moving in and out, for the owner and their wardens. */
export const StaysDeskService = {
  properties: (token: string) => apiGetPage<DeskProperty>('/v1/stays/desk/properties', token).then((p) => p.items),
  board: (token: string, propertyId: string, date: string) => apiGet<BedBoard>(`/v1/stays/desk/properties/${id(propertyId)}/board`, token, { date }),
  reservations: (token: string, propertyId: string, view: DeskReservationsView, cursor?: string) =>
    apiGetPage<DeskReservation>(`/v1/stays/desk/properties/${id(propertyId)}/reservations`, token, { view, cursor }),
  tenants: (token: string, propertyId: string, cursor?: string) =>
    apiGetPage<DeskReservation>(`/v1/stays/desk/properties/${id(propertyId)}/tenants`, token, { cursor }),
  reservation: (token: string, reservationId: string) => apiGet<DeskReservation>(`/v1/stays/desk/orders/${id(reservationId)}`, token),
  movedIn: (token: string, reservationId: string, options: WriteOptions) =>
    apiPost<DeskReservation>(`/v1/stays/desk/orders/${id(reservationId)}/moved-in`, undefined, token, options),
  /** The bed is free from `on`; leave it out for today. */
  moveOut: (token: string, reservationId: string, body: { on?: string; reason?: string }, options: WriteOptions) =>
    apiPost<DeskReservation>(`/v1/stays/desk/orders/${id(reservationId)}/move-out`, { ...body }, token, options),
  /** Always a full refund; the tenant sees the reason. */
  cancel: (token: string, reservationId: string, reason: string, options: WriteOptions) =>
    apiPost<DeskReservation>(`/v1/stays/desk/orders/${id(reservationId)}/cancel`, { reason }, token, options),
  /** `closed`: full or unavailable. Reservations already made stand. */
  bedStatus: (token: string, bedId: string, status: 'open' | 'closed', options: WriteOptions) =>
    apiPost<{ id: string; label: string; status: 'open' | 'closed' }>(`/v1/stays/desk/beds/${id(bedId)}/status`, { status }, token, options),
  roomStatus: (token: string, roomId: string, status: RoomStatus, options: WriteOptions) =>
    apiPost<VendorProperty>(`/v1/stays/desk/rooms/${id(roomId)}/status`, { status }, token, options),
  update: (token: string, propertyId: string, changes: Partial<PropertyInput>) =>
    apiPatch<VendorProperty>(`/v1/stays/desk/properties/${id(propertyId)}`, { ...changes }, token),
  prices: (token: string, roomId: string, prices: RoomPrices) => apiPut<VendorProperty>(`/v1/stays/desk/rooms/${id(roomId)}/prices`, token, { prices: { ...prices } }),
};

/** `/v1/ruxstar/stays`: every property, taking one down, the facilities list and tenants' objections. */
export const ConsoleStaysService = {
  properties: (token: string, filter: ConsolePropertyFilter, cursor?: string) =>
    apiGetPage<ConsoleProperty>('/v1/ruxstar/stays/properties', token, { ...filter, city: filter.city?.trim() || undefined, cursor }),
  property: (token: string, propertyId: string) => apiGet<ConsolePropertyDetail>(`/v1/ruxstar/stays/properties/${id(propertyId)}`, token),
  /** Reservations not moved in yet are refunded in full. */
  takeDown: (token: string, propertyId: string, reason: string, key: string) =>
    apiPost<{ property: VendorProperty; refunded: number }>(`/v1/ruxstar/stays/properties/${id(propertyId)}/take-down`, { reason }, token, { idempotencyKey: key }),
  objections: (token: string, status: ObjectionStatus, cursor?: string) =>
    apiGetPage<ConsoleReservation>('/v1/ruxstar/stays/objections', token, { status, cursor }),
  /** `release` pays the owner; `refund` gives the tenant everything back and ends the stay. */
  decide: (token: string, reservationId: string, decision: 'release' | 'refund', note: string, key: string) =>
    apiPost<ConsoleReservation>(`/v1/ruxstar/stays/reservations/${id(reservationId)}/objection`, { decision, note }, token, { idempotencyKey: key }),
  facilities: (token: string) => apiGetPage<ConsoleFacility>('/v1/ruxstar/stays/facilities', token).then((p) => p.items),
  addFacility: (token: string, body: { key: string; name: string; order?: number }, key: string) =>
    apiPost<ConsoleFacility>('/v1/ruxstar/stays/facilities', { ...body }, token, { idempotencyKey: key }),
  updateFacility: (token: string, facilityKey: string, patch: { name?: string; active?: boolean; order?: number }) =>
    apiPatch<ConsoleFacility>(`/v1/ruxstar/stays/facilities/${id(facilityKey)}`, { ...patch }, token),
};
