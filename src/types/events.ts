/** `/v1/events`, `/v1/vendor/events` and the gate (`/v1/events/desk`). Amounts are paise. */
import type { AppliedCoupon } from './coupon';
import type { InvoiceRef } from './invoice';
import type { Rating } from './review';

export type EventKind = 'show' | 'sports' | 'meetup';
export type RefundPolicy = 'standard' | 'none';

export interface EventPhoto {
  url: string;
  width: number;
  height: number;
}

export interface EventVenue {
  name: string;
  address: string;
  city: string;
  point: { lat: number; lng: number } | null;
}

export interface EventCard {
  id: string;
  title: string;
  kind: EventKind;
  business: { id: string; name: string };
  photo: EventPhoto | null;
  startsAt: string;
  endsAt: string;
  city: string | null;
  venueName: string | null;
  online: boolean;
  /** Team entries: the price is per team. */
  team: boolean;
  priceFrom: number;
  free: boolean;
  soldOut: boolean;
}

export interface EventFilters {
  city?: string;
  kind?: EventKind;
  q?: string;
}

export interface EventTier {
  id: string;
  name: string;
  price: number;
  left: number;
  soldOut: boolean;
}

export interface EventQuestion {
  id: string;
  label: string;
  required: boolean;
}

export interface MyWait {
  id: string;
  tierId: string;
  quantity: number;
  status: 'waiting' | 'offered';
  /** 1 is next; null once seats are offered. */
  position: number | null;
  offeredUntil: string | null;
}

export interface EventDetail extends EventCard {
  description: string | null;
  venue: EventVenue | null;
  /** Only for people with a confirmed ticket. */
  onlineLink: string | null;
  teamSize: { min: number; max: number } | null;
  tiers: EventTier[];
  questions: EventQuestion[];
  refunds: { policy: RefundPolicy; until: string | null; hours: number };
  platformFee: number;
  status: 'live' | 'cancelled' | 'ended';
  cancelReason: string | null;
  canBuy: boolean;
  whyNot: string | null;
  myOrders: { id: string; orderNo: number; status: string; tickets: number }[];
  myWaits: MyWait[];
  maxPerOrder: number;
  /** The organiser's rating across all its reviews. */
  rating?: Rating;
}

export interface EventRules {
  refundHours: number;
  waitlistHours: number;
  maxTicketTypes: number;
  maxQuestions: number;
  maxPerOrder: number;
  maxDays: number;
  commissionBps: number;
  platformFee: number;
}

// Buying.

export interface HolderInput {
  tierId: string;
  name: string;
  phone: string;
  answers?: { id: string; answer: string }[];
}

export interface BookTicketsBody {
  tickets: HolderInput[];
  team?: { tierId: string; name: string };
  waitlistId?: string;
  /** Free tickets ignore it. */
  coupon?: string;
  returnTo: string;
}

export type TicketStatus = 'awaiting_payment' | 'valid' | 'cancelled';
export type TicketOrderStatus = 'awaiting_payment' | 'confirmed' | 'cancelled';

export interface TicketView {
  id: string;
  name: string;
  phone: string | null;
  tier: string;
  team: string | null;
  /** Six letters the gate can type in instead of scanning. */
  code: string;
  /** What the QR code holds; only on valid tickets. */
  qr: string | null;
  status: TicketStatus;
  checkedInAt: string | null;
}

export interface TicketOrder {
  id: string;
  orderNo: number;
  status: TicketOrderStatus;
  event: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    venueName: string | null;
    address: string | null;
    city: string | null;
    online: boolean;
    onlineLink: string | null;
    photo: EventPhoto | null;
    cancelled: boolean;
  };
  business: { id: string; name: string };
  lines: { tierId: string; name: string; quantity: number; unitPrice: number }[];
  team: string | null;
  price: { items: number; platformFee: number; total: number; discount?: number };
  coupon?: AppliedCoupon | null;
  refund: { amount: number; status: 'pending' | 'done'; reason: string | null } | null;
  reason: string | null;
  canCancel: boolean;
  cancelUntil: string | null;
  /** Unpaid orders give their seats back after this. */
  payBy: string | null;
  tickets: TicketView[];
  /** GST invoices and credit notes, oldest first. Missing on orders paid before invoicing started. */
  invoices?: InvoiceRef[];
  /** Open for a review now: write or change it. */
  canReview?: boolean;
  /** The last moment to write or change the review; null when it can't be reviewed now. */
  reviewUntil?: string | null;
  createdAt: string;
}

export type MyTicketsView = 'upcoming' | 'past';

// Organising.

export interface TierInput {
  /** Keep it when editing a ticket type; leave it out for a new one. */
  id?: string;
  name: string;
  price: number;
  capacity: number;
}

export interface QuestionInput {
  id?: string;
  label: string;
  required: boolean;
}

export interface EventInput {
  title: string;
  description: string | null;
  kind: EventKind;
  venue: { name: string; address: string; city: string } | null;
  online: { link: string } | null;
  startsAt: string;
  endsAt: string;
  team: { min: number; max: number } | null;
  tiers: TierInput[];
  questions: QuestionInput[];
  refunds: RefundPolicy;
}

export interface VendorTier {
  id: string;
  name: string;
  price: number;
  capacity: number;
  sold: number;
  held: number;
  left: number;
}

export type VendorEventStatus = 'draft' | 'live' | 'cancelled' | 'ended';

export interface VendorEvent extends EventCard {
  description: string | null;
  venue: EventVenue | null;
  onlineLink: string | null;
  teamSize: { min: number; max: number } | null;
  tiers: VendorTier[];
  questions: EventQuestion[];
  refunds: RefundPolicy;
  status: VendorEventStatus;
  publishedAt: string | null;
  cancellation: { by: 'vendor' | 'staff'; reason: string; at: string } | null;
  counts: { tickets: number; checkedIn: number; waiting: number };
  money: { sales: number; share: number; commissionBps: number };
  /** What publishing still needs, in words. */
  missing: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  orderNo: number;
  status: TicketOrderStatus;
  team: string | null;
  total: number;
  share: number;
  refunded: number;
  tickets: {
    id: string;
    name: string;
    phone: string | null;
    tier: string;
    code: string;
    answers: { label: string; answer: string }[];
    status: TicketStatus;
    lastIn: string | null;
  }[];
  createdAt: string;
}

// The gate.

export interface DeskCounts {
  tickets: number;
  inToday: number;
}

export interface DeskEvent {
  id: string;
  title: string;
  business: { id: string; name: string };
  startsAt: string;
  endsAt: string;
  venueName: string | null;
  photo: EventPhoto | null;
  /** Tickets can be checked in today. */
  today: boolean;
  /** YYYY-MM-DD, in India. */
  days: string[];
  counts: DeskCounts;
  canSeeGuests: boolean;
  role: 'owner' | 'team';
}

/** ok is green; inside is amber (back in the same day); the rest are red. */
export type ScanOutcome = 'ok' | 'inside' | 'wrong_event' | 'wrong_day' | 'cancelled' | 'unknown';

export interface ScanTicket {
  id: string;
  name: string;
  tier: string;
  team: string | null;
  code: string;
}

export interface ScanResult {
  result: ScanOutcome;
  ticket: ScanTicket | null;
  firstAt: string | null;
  message: string;
  counts: DeskCounts;
}

export interface LookupTicket extends ScanTicket {
  /** The last four digits only. */
  phone: string;
  status: TicketStatus;
  inToday: string | null;
}

/** Short keys keep the list small: about 200 bytes a ticket. */
export interface OfflineTicket {
  /** SHA-256 of the QR text, hex. */
  h: string;
  id: string;
  /** The six letters. */
  c: string;
  /** The holder's name. */
  n: string;
  /** The ticket type. */
  t: string;
  /** SHA-256 of the phone's 10 digits, hex. */
  p: string;
  /** v: valid. x: cancelled. */
  s: 'v' | 'x';
  /** When they first came in today. */
  i: string | null;
}

export interface OfflineList {
  eventId: string;
  day: string;
  at: string;
  tickets: OfflineTicket[];
}

export interface SyncScan {
  ticketId: string;
  at: string;
  manual: boolean;
  /** This phone showed green: it thought they were coming in for the first time today. */
  fresh: boolean;
}

export interface SyncResult {
  saved: number;
  clashes: { ticketId: string; name: string; code: string; firstAt: string }[];
  counts: DeskCounts;
}

export type GuestsView = 'all' | 'arrived' | 'not_arrived';

export interface Guest extends ScanTicket {
  phone: string | null;
  inToday: string | null;
  by: string | null;
  manual: boolean;
  clash: boolean;
}
