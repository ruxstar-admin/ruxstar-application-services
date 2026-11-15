/** `/v1/turf`, `/v1/turf/desk`, the owner's `/v1/vendor` ground routes and the console's. Amounts are paise; days are India's `YYYY-MM-DD`, clocks India's `HH:MM`. */
import type { AppliedCoupon, CouponOffer } from './coupon';
import type { InvoiceRef } from './invoice';
import type { Rating } from './review';
import type { TeamPermission } from './team';

export type Amenity =
  | 'parking'
  | 'washrooms'
  | 'changing_rooms'
  | 'showers'
  | 'drinking_water'
  | 'floodlights'
  | 'seating'
  | 'cafe'
  | 'first_aid'
  | 'equipment'
  | 'lockers'
  | 'wifi';

export type GroundStatus = 'draft' | 'live' | 'removed';
/** `paused`: shown but not bookable. */
export type CourtStatus = 'live' | 'paused';
/** `booking`: once per booking (per date of a weekly one). `slot`: for each slot. */
export type AddOnPer = 'booking' | 'slot';
export type TurfBookingStatus = 'awaiting_payment' | 'confirmed' | 'cancelled';
export type Arrival = 'arrived' | 'no_show' | null;
export type MyBookingsView = 'current' | 'past';
export type DeskBookingsView = 'upcoming' | 'past' | 'all';

export interface Sport {
  key: string;
  name: string;
}

export interface GroundPhoto {
  id: string;
  url: string;
  width: number;
  height: number;
}

export interface Point {
  lat: number;
  lng: number;
}

/** GET /v1/turf/rules. */
export interface TurfRules {
  refundFullHours: number;
  refundHalfHours: number;
  halfPercent: number;
  minFullHours: number;
  maxFullHours: number;
  maxRepeatWeeks: number;
  holdMinutes: number;
  slotLengths: SlotMinutes[];
  maxSlots: number;
  bookAheadDays: number;
  maxGrounds: number;
  maxCourts: number;
  maxAddOns: number;
  commissionBps: number;
  platformFee: number;
}

/** The console's module settings for turf: the rules without the money. */
export type TurfRuleSettings = Omit<TurfRules, 'commissionBps' | 'platformFee'>;

export type SlotMinutes = 30 | 60 | 90;

/** One open weekday. `day` 0 is Sunday; `close` may be `24:00`. */
export interface Hours {
  day: number;
  open: string;
  close: string;
}

/** A slot starting in the window costs `price`, before the weekend price. */
export interface Peak {
  days: number[];
  start: string;
  end: string;
  price: number;
}

export interface Prices {
  base: number;
  /** Saturday and Sunday; null for the base price. */
  weekend: number | null;
  peak: Peak[];
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  per: AddOnPer;
}

export interface CourtView {
  id: string;
  name: string;
  sports: Sport[];
  slotMinutes: number;
  hours: Hours[];
  prices: Prices;
  addOns: AddOn[];
  status: CourtStatus;
}

export interface GroundCard {
  id: string;
  name: string;
  business: { id: string; name: string };
  city: string;
  address: string;
  photo: GroundPhoto | null;
  sports: Sport[];
  amenities: Amenity[];
  /** The lowest base price of a bookable court. */
  priceFrom: number | null;
  /** Bookable courts. */
  courts: number;
}

export interface GroundFilters {
  city?: string;
  sport?: string;
  q?: string;
}

export interface GroundDetail extends GroundCard {
  description: string | null;
  venue: { address: string; city: string; pincode: string | null; point: Point | null };
  photos: GroundPhoto[];
  courtList: CourtView[];
  refunds: { fullHours: number; halfHours: number; halfPercent: number };
  refundRule: string;
  platformFee: number;
  status: GroundStatus;
  canBook: boolean;
  whyNot: string | null;
  rating?: Rating;
}

/** `booked` includes slots held for someone's checkout. */
export type PublicSlotState = 'free' | 'booked' | 'blocked';

export interface DaySlot {
  startAt: string;
  endAt: string;
  start: string;
  end: string;
  price: number;
  peak: boolean;
  state: PublicSlotState;
}

/** GET /v1/turf/courts/:id/slots. Slots that have started aren't listed. */
export interface DaySlots {
  court: { id: string; name: string; slotMinutes: number; status: CourtStatus };
  date: string;
  /** False when the court is closed that day. */
  open: boolean;
  bookable: boolean;
  slots: DaySlot[];
}

export interface AddOnPick {
  id: string;
  quantity: number;
}

export interface BookBody {
  startAts: string[];
  sport?: string;
  addOns?: AddOnPick[];
  weeks?: number;
  coupon?: string;
  returnTo: string;
}

export interface OffersBody {
  startAts: string[];
  addOns?: AddOnPick[];
  weeks?: number;
  code?: string;
}

export interface TurfOffers {
  offers: CouponOffer[];
  checked: { code: string; discount: number; problem: string | null } | null;
}

interface Money {
  percent: number;
  amount: number;
}

/** One date of a booking: the first, then a week later for a weekly one. */
export interface Occurrence {
  n: number;
  startAt: string;
  endAt: string;
  slots: { startAt: string; endAt: string; price: number; peak: boolean }[];
  items: number;
  paid: number;
  status: 'booked' | 'cancelled';
  refund: Money | null;
  cancelledBy: 'customer' | 'ground' | 'ruxstar' | null;
  cancelReason: string | null;
  arrival: Arrival;
  canCancel: boolean;
  /** What cancelling it now gives back. */
  refundIfCancelled: Money | null;
}

interface BookingFields {
  id: string;
  orderNo: number;
  status: TurfBookingStatus;
  ground: { id: string; name: string; address: string; city: string; point: Point | null; photo: GroundPhoto | null; removed: boolean };
  court: { id: string; name: string };
  business: { id: string; name: string };
  sport: Sport | null;
  slotMinutes: number;
  addOns: (AddOn & { quantity: number })[];
  weeks: number;
  occurrences: Occurrence[];
  firstAt: string;
  lastEndsAt: string;
  price: { items: number; discount: number; platformFee: number; total: number };
  coupon: AppliedCoupon | null;
  refundRule: string;
  refunds: { amount: number; status: 'pending' | 'done'; reason: string; at: string }[];
  reason: string | null;
  /** Unpaid, the slots go back after this. */
  payBy: string | null;
  createdAt: string;
}

export interface TurfBooking extends BookingFields {
  /** Some date can be cancelled now, or it is unpaid. */
  canCancel: boolean;
  invoices: InvoiceRef[];
  canReview?: boolean;
  reviewUntil?: string | null;
}

export interface PlacedBooking {
  booking: TurfBooking;
  checkoutUrl: string;
}

// The owner's setup.

export interface VenueInput {
  address: string;
  city: string;
  pincode?: string | null;
  point?: Point | null;
}

export interface GroundInput {
  name: string;
  description?: string | null;
  venue: VenueInput;
  amenities?: Amenity[];
  refunds?: { fullHours: number; halfHours: number };
}

export interface AddOnInput {
  id?: string;
  name: string;
  price: number;
  per: AddOnPer;
}

export interface CourtInput {
  name: string;
  sports: string[];
  slotMinutes: SlotMinutes;
  hours: Hours[];
  prices: Prices;
  addOns?: AddOnInput[];
  status?: CourtStatus;
}

export interface VendorGround extends GroundDetail {
  publishedAt: string | null;
  removal: { reason: string; at: string } | null;
  /** What it needs before it can be published. */
  missing: string[];
  /** Paid bookings with a date still to come. */
  upcoming: number;
}

// The desk.

export type TurfPermission = Extract<TeamPermission, `turf.${string}`>;

export interface DeskGround {
  id: string;
  name: string;
  business: { id: string; name: string };
  status: GroundStatus;
  courts: number;
  owner: boolean;
  /** The owner has every one. */
  permissions: string[];
}

export interface BoardBooking {
  id: string;
  orderNo: number;
  /** Which date of the booking. */
  n: number;
  weeks: number;
  customerName: string;
  /** Null for a held slot. */
  customerPhone: string | null;
  status: TurfBookingStatus;
  arrival: Arrival;
  startAt: string;
  endAt: string;
}

/** `held`: someone is paying for it now. */
export type BoardSlotState = 'free' | 'held' | 'booked' | 'blocked';

export interface BoardSlot {
  startAt: string;
  endAt: string;
  start: string;
  end: string;
  price: number;
  peak: boolean;
  past: boolean;
  state: BoardSlotState;
  booking: BoardBooking | null;
  block: { note: string | null; by: string | null } | null;
}

export interface BoardCourt {
  id: string;
  name: string;
  slotMinutes: number;
  status: CourtStatus;
  open: boolean;
  slots: BoardSlot[];
}

/** GET /v1/turf/desk/grounds/:id/board. */
export interface Board {
  ground: { id: string; name: string };
  date: string;
  courts: BoardCourt[];
  totals: { booked: number; blocked: number; free: number; arrived: number; noShow: number };
}

export interface DeskBooking extends BookingFields {
  customer: { name: string; phone: string | null };
  vendorShare: number;
  /** Some date hasn't ended. */
  canCancel: boolean;
}

// The console.

export interface ConsoleGround extends GroundCard {
  status: GroundStatus;
  vendorId: string;
  removal: { reason: string; at: string } | null;
  createdAt: string;
}

export interface ConsoleGroundFilter {
  q?: string;
  status?: GroundStatus;
}

export interface ConsoleGroundDetail {
  ground: VendorGround;
  bookings: { upcoming: number; total: number; cancelled: number };
}

export interface ConsoleSport {
  key: string;
  name: string;
  active: boolean;
  order: number;
}
