/** `/v1/stays`, `/v1/stays/desk`, the owner's `/v1/vendor` property routes and the console's. Amounts are paise; days are India's `YYYY-MM-DD`, clocks India's `HH:MM`. */
import type { AppliedCoupon, CouponCheck } from './coupon';
import type { InvoiceRef } from './invoice';
import type { Rating } from './review';
import type { TeamPermission } from './team';
import type { Point } from './turf';

export type PropertyKind = 'pg' | 'hostel' | 'coliving';
/** Who can stay. */
export type StayFor = 'men' | 'women' | 'any';
export type Occupant = 'students' | 'working';
export type Meal = 'breakfast' | 'lunch' | 'dinner';
/** `non_veg` serves veg too; `none`: no food. */
export type FoodType = 'veg' | 'non_veg' | 'none';
export type StayUnit = 'month' | 'night';
/** `private`: reserved whole, priced per room. `shared`: priced per bed; beds one by one, or all together when `wholeRoom`. */
export type RoomKind = 'private' | 'shared';
export type RoomFeature = 'ac' | 'attached_bath' | 'balcony' | 'furnished' | 'window';
export type NearbyKind = 'college' | 'office' | 'metro' | 'other';
export type PropertyStatus = 'draft' | 'live' | 'removed';
/** `paused`: shown as full, not reservable. */
export type RoomStatus = 'live' | 'paused';
/** House rules a search can ask for; `late_entry` means no curfew. */
export type Allowance = 'guests' | 'smoking' | 'alcohol' | 'pets' | 'late_entry';

export interface StayPhoto {
  id: string;
  url: string;
  width: number;
  height: number;
}

export interface Facility {
  key: string;
  name: string;
}

export interface Food {
  type: FoodType;
  /** Included in the rent; empty when `type` is none. */
  meals: Meal[];
}

export interface HouseRules {
  /** Latest entry time; null for none. */
  curfew: string | null;
  guests: boolean;
  smoking: boolean;
  alcohol: boolean;
  pets: boolean;
  notes: string | null;
}

/** Paid to the owner directly at move-in; Ruxstar only shows it. */
export interface Deposit {
  amount: number;
  note: string | null;
}

export interface Nearby {
  kind: NearbyKind;
  name: string;
  km: number;
}

/** For each bed of a shared room, or the whole private room. At least one is set. */
export interface RoomPrices {
  month: number | null;
  night: number | null;
}

export interface AddressView {
  line: string;
  area: string | null;
  city: string;
  pincode: string | null;
  point: Point | null;
}

/** GET /v1/stays/rules. */
export interface StaysRules {
  refundDays: number;
  maxRefundDays: number;
  objectionHours: number;
  maxMonths: number;
  maxNights: number;
  holdMinutes: number;
  bookAheadDays: number;
  maxProperties: number;
  maxRooms: number;
  maxBeds: number;
  commissionBps: number;
  platformFee: number;
}

/** The console's module settings for stays: the rules without the money. */
export type StaysRuleSettings = Omit<StaysRules, 'commissionBps' | 'platformFee'>;

export interface RoomView {
  id: string;
  name: string;
  kind: RoomKind;
  beds: number;
  /** Shared rooms: every bed can be reserved together, at the bed price times the beds. */
  wholeRoom: boolean;
  prices: RoomPrices;
  features: RoomFeature[];
  status: RoomStatus;
  bedList: { id: string; label: string }[];
}

export interface PropertyCard {
  id: string;
  name: string;
  kind: PropertyKind;
  business: { id: string; name: string };
  city: string;
  area: string | null;
  address: string;
  photo: StayPhoto | null;
  for: StayFor;
  /** Empty: anyone. */
  occupants: Occupant[];
  food: Food;
  facilities: Facility[];
  /** The lowest price per bed (or private room) of its reservable rooms. */
  priceFrom: RoomPrices;
  units: StayUnit[];
  roomKinds: RoomKind[];
  noticeDays: number;
  deposit: number;
  nearby: Nearby[];
}

/** GET /v1/stays. `for` and `occupant` also match places open to anyone; csv fields must all match. */
export interface PropertiesQuery {
  city?: string;
  area?: string;
  q?: string;
  kind?: PropertyKind;
  for?: 'men' | 'women';
  occupant?: Occupant;
  /** `any`: serves food. */
  food?: FoodType | 'any';
  meals?: string;
  facilities?: string;
  stay?: StayUnit;
  /** Per month, or per night with `stay=night`. */
  priceMax?: number;
  room?: RoomKind;
  near?: string;
  noticeMax?: number;
  allows?: string;
}

export interface PropertyDetail extends PropertyCard {
  description: string | null;
  addressDetail: AddressView;
  photos: StayPhoto[];
  rules: HouseRules;
  depositDetail: Deposit;
  rooms: RoomView[];
  refundDays: number;
  /** One sentence, for above the Pay button. */
  refundRule: string;
  platformFee: number;
  status: PropertyStatus;
  canReserve: boolean;
  whyNot: string | null;
  kycRequired: true;
  rating?: Rating;
}

/** `taken`: reserved or held at some point of the stay. `closed`: the owner marked it full. */
export type BedState = 'free' | 'taken' | 'closed';

export interface RoomAvailability {
  id: string;
  name: string;
  kind: RoomKind;
  status: RoomStatus;
  beds: { id: string; label: string; state: BedState }[];
  /** Shared rooms: one free bed for this stay, before coupons and the fee; null when none is free or not let this way. */
  bedTotal: number | null;
  /** The whole room for this stay; null when it can't be reserved whole. */
  roomTotal: number | null;
}

/** GET /v1/stays/:id/availability. */
export interface Availability {
  property: { id: string; name: string };
  moveIn: string;
  stay: StayUnit;
  /** Nights: the checkout day. Months: null, as the bed stays yours until notice. */
  until: string | null;
  reservable: boolean;
  rooms: RoomAvailability[];
}

/** Months only with `stay: 'month'`, nights only with `stay: 'night'`. A shared room needs `bedId` or `whole`. */
export interface StayPick {
  bedId?: string;
  whole?: boolean;
  moveIn: string;
  stay: StayUnit;
  months?: number;
  nights?: number;
}

export interface ReserveBody extends StayPick {
  coupon?: string;
  returnTo: string;
}

export type StayOffers = CouponCheck;

export type StayStatus = 'awaiting_payment' | 'confirmed' | 'moved_in' | 'moved_out' | 'cancelled';
export type ObjectionStatus = 'open' | 'withdrawn' | 'released' | 'refunded';
export type MyStaysView = 'current' | 'past';
export type DeskReservationsView = 'upcoming' | 'staying' | 'past' | 'all';

export interface Objection {
  reason: string;
  at: string;
  /** `released`: Ruxstar paid the owner. `refunded`: Ruxstar refunded the tenant. */
  status: ObjectionStatus;
  note: string | null;
  resolvedAt: string | null;
}

interface ReservationFields {
  id: string;
  orderNo: number;
  status: StayStatus;
  property: { id: string; name: string; kind: PropertyKind; address: string; city: string; point: Point | null; photo: StayPhoto | null; removed: boolean };
  room: { id: string; name: string; kind: RoomKind };
  beds: { id: string; label: string }[];
  whole: boolean;
  business: { id: string; name: string };
  stay: StayUnit;
  /** Months or nights paid. */
  units: number;
  moveIn: string;
  from: string;
  /** When the beds are free again; null while a monthly stay has no end date. */
  until: string | null;
  price: { unitPrice: number; quantity: number; items: number; discount: number; platformFee: number; total: number };
  coupon: AppliedCoupon | null;
  deposit: Deposit;
  noticeDays: number;
  refundRule: string;
  refundUntil: string;
  refund: { amount: number; status: 'pending' | 'done'; reason: string | null; at: string } | null;
  cancellation: { by: 'customer' | 'property' | 'ruxstar' | 'system'; reason: string; at: string } | null;
  movedInAt: string | null;
  /** After "Moved in": the tenant can object until then. */
  objectionUntil: string | null;
  objection: Objection | null;
  moveOut: { on: string; kind: 'notice' | 'move_out'; by: 'tenant' | 'property' | 'ruxstar' } | null;
  /** Moved in and not moved out yet. */
  staying: boolean;
  reason: string | null;
  /** Unpaid, the beds go back after this. */
  payBy: string | null;
  createdAt: string;
}

export interface StayReservation extends ReservationFields {
  canCancel: boolean;
  refundIfCancelled: number | null;
  canObject: boolean;
  canGiveNotice: boolean;
  /** The earliest move-out day a notice now can ask for. */
  noticeFrom: string | null;
  invoices: InvoiceRef[];
  canReview?: boolean;
  reviewUntil?: string | null;
}

export interface PlacedReservation {
  reservation: StayReservation;
  checkoutUrl: string;
}

// The owner's setup.

export interface AddressInput {
  line: string;
  area?: string | null;
  city: string;
  pincode?: string | null;
  point?: Point | null;
}

export interface PropertyInput {
  name: string;
  kind?: PropertyKind;
  description?: string | null;
  address: AddressInput;
  for: StayFor;
  occupants?: Occupant[];
  food?: Food;
  facilities?: string[];
  rules?: HouseRules;
  noticeDays?: number;
  deposit?: { amount: number; note?: string | null };
  nearby?: Nearby[];
  refundDays?: number;
}

export interface RoomInput {
  name: string;
  kind: RoomKind;
  beds: number;
  wholeRoom?: boolean;
  prices: RoomPrices;
  features?: RoomFeature[];
  status?: RoomStatus;
}

export interface VendorProperty extends PropertyDetail {
  /** The refund days it can pick. */
  refundLimits: { min: number; max: number };
  publishedAt: string | null;
  removal: { reason: string; at: string } | null;
  /** What it needs before it can be published. */
  missing: string[];
  /** Paid reservations waiting for move-in. */
  upcoming: number;
  staying: number;
}

// The desk.

export type StaysPermission = Extract<TeamPermission, `stays.${string}`>;

export interface DeskProperty {
  id: string;
  name: string;
  kind: PropertyKind;
  business: { id: string; name: string };
  status: PropertyStatus;
  rooms: number;
  beds: number;
  owner: boolean;
  /** The owner has every one. */
  permissions: string[];
}

export interface BoardReservation {
  id: string;
  orderNo: number;
  tenantName: string;
  status: StayStatus;
  moveIn: string;
  until: string | null;
}

/** That day. `held`: someone is paying now. `reserved`: paid, not moved in. `occupied`: moved in. */
export type BoardBedState = 'free' | 'held' | 'reserved' | 'occupied' | 'closed';

export interface BoardBed {
  id: string;
  label: string;
  /** `closed`: marked full. */
  status: 'open' | 'closed';
  state: BoardBedState;
  reservation: BoardReservation | null;
  /** Free that day: the bed's next reservation, if any. */
  next: BoardReservation | null;
}

export interface BoardRoom {
  id: string;
  name: string;
  kind: RoomKind;
  status: RoomStatus;
  prices: RoomPrices;
  beds: BoardBed[];
}

/** GET /v1/stays/desk/properties/:id/board. */
export interface BedBoard {
  property: { id: string; name: string };
  date: string;
  rooms: BoardRoom[];
  totals: { beds: number; free: number; held: number; reserved: number; occupied: number; closed: number };
}

export type Payout = 'none' | 'waiting' | 'objection' | 'released' | 'refunded';

export interface DeskReservation extends ReservationFields {
  tenant: { name: string; phone: string | null; verified: boolean };
  vendorShare: number;
  payout: Payout;
  releaseAt: string | null;
  canMoveIn: boolean;
  canMoveOut: boolean;
  /** Paid and the money not released yet; always a full refund. */
  canCancel: boolean;
}

// The console.

export interface ConsoleProperty extends PropertyCard {
  status: PropertyStatus;
  vendorId: string;
  removal: { reason: string; at: string } | null;
  createdAt: string;
}

export interface ConsolePropertyFilter {
  status?: PropertyStatus;
  city?: string;
}

export interface ConsolePropertyDetail {
  property: VendorProperty;
  reservations: { upcoming: number; staying: number; total: number; cancelled: number; objections: number };
}

export interface ConsoleFacility {
  key: string;
  name: string;
  active: boolean;
  order: number;
}

export interface ConsoleReservation extends ReservationFields {
  tenant: { id: string; name: string };
  vendorId: string;
  releaseAt: string | null;
  releasedAt: string | null;
}
