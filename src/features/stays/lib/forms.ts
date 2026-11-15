import { paiseOf } from '@/features/events/lib/events';
import type {
  FoodType,
  Meal,
  NearbyKind,
  Occupant,
  PropertyDetail,
  PropertyInput,
  PropertyKind,
  RoomFeature,
  RoomInput,
  RoomKind,
  RoomPrices,
  RoomView,
  StayFor,
  StaysRules,
} from '@/types/stays';

/** ₹5,00,000 a month or night for one bed or room. */
const MAX_PRICE = 5_00_000_00;
/** ₹10,00,000 deposit. */
const MAX_DEPOSIT = 10_00_000_00;
export const MAX_NEARBY = 15;
export const MAX_NOTICE_DAYS = 90;
export const MAX_PHOTOS = 10;
const PINCODE = /^[1-9][0-9]{5}$/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A price in paise as the rupees typed into a box; empty for none. */
export const rupees = (paise: number | null) => (paise ? String(paise / 100) : '');

/** The refund days a property can pick under Ruxstar's rules: at least Ruxstar's, at most the most it allows. */
export const refundLimitsOf = (rules: Pick<StaysRules, 'refundDays' | 'maxRefundDays'>) => ({ min: rules.refundDays, max: Math.max(rules.maxRefundDays, rules.refundDays) });

// The property.

export interface NearbyDraft {
  kind: NearbyKind;
  name: string;
  km: string;
}

export interface PropertyDraft {
  name: string;
  kind: PropertyKind;
  description: string;
  line: string;
  area: string;
  city: string;
  pincode: string;
  for: StayFor;
  occupants: Occupant[];
  foodType: FoodType;
  meals: Meal[];
  facilities: string[];
  /** `HH:MM`, or empty for no entry time. */
  curfew: string;
  guests: boolean;
  smoking: boolean;
  alcohol: boolean;
  pets: boolean;
  notes: string;
  noticeDays: number;
  deposit: string;
  depositNote: string;
  nearby: NearbyDraft[];
  refundDays: number;
}

export const emptyProperty = (rules: Pick<StaysRules, 'refundDays'>, city = ''): PropertyDraft => ({
  name: '',
  kind: 'pg',
  description: '',
  line: '',
  area: '',
  city,
  pincode: '',
  for: 'any',
  occupants: [],
  foodType: 'none',
  meals: [],
  facilities: [],
  curfew: '',
  guests: true,
  smoking: false,
  alcohol: false,
  pets: false,
  notes: '',
  noticeDays: 30,
  deposit: '',
  depositNote: '',
  nearby: [],
  refundDays: rules.refundDays,
});

export const propertyDraftOf = (p: PropertyDetail): PropertyDraft => ({
  name: p.name,
  kind: p.kind,
  description: p.description ?? '',
  line: p.addressDetail.line,
  area: p.addressDetail.area ?? '',
  city: p.addressDetail.city,
  pincode: p.addressDetail.pincode ?? '',
  for: p.for,
  occupants: [...p.occupants],
  foodType: p.food.type,
  meals: [...p.food.meals],
  facilities: p.facilities.map((f) => f.key),
  curfew: p.rules.curfew ?? '',
  guests: p.rules.guests,
  smoking: p.rules.smoking,
  alcohol: p.rules.alcohol,
  pets: p.rules.pets,
  notes: p.rules.notes ?? '',
  noticeDays: p.noticeDays,
  deposit: rupees(p.depositDetail.amount),
  depositNote: p.depositDetail.note ?? '',
  nearby: p.nearby.map((n) => ({ kind: n.kind, name: n.name, km: String(n.km) })),
  refundDays: p.refundDays,
});

export type PropertyErrors = Partial<
  Record<'name' | 'description' | 'line' | 'area' | 'city' | 'pincode' | 'curfew' | 'notes' | 'notice' | 'deposit' | 'depositNote' | 'refund' | 'nearby', string>
>;

const kmOf = (text: string) => {
  const t = text.trim();
  return /^\d+(\.\d{1,2})?$/.test(t) ? Number(t) : null;
};

export function propertyErrors(d: PropertyDraft, refundLimits: { min: number; max: number }): PropertyErrors {
  const e: PropertyErrors = {};
  const name = d.name.trim();
  if (name.length < 2 || name.length > 80) e.name = 'Give the place a name of 2 to 80 letters.';
  if (d.description.trim().length > 2000) e.description = 'Keep it under 2,000 letters.';
  const line = d.line.trim();
  if (line.length < 5 || line.length > 300) e.line = 'Add the address tenants should come to.';
  const area = d.area.trim();
  if (area && (area.length < 2 || area.length > 60)) e.area = 'Use 2 to 60 letters, or leave it empty.';
  const city = d.city.trim();
  if (city.length < 2 || city.length > 60) e.city = 'Add the city.';
  if (d.pincode.trim() && !PINCODE.test(d.pincode.trim())) e.pincode = 'A pincode is 6 digits.';
  if (d.curfew && !CLOCK.test(d.curfew)) e.curfew = 'Pick a time, or no entry time.';
  if (d.notes.trim().length > 500) e.notes = 'Keep the notes under 500 letters.';
  if (!Number.isInteger(d.noticeDays) || d.noticeDays < 0 || d.noticeDays > MAX_NOTICE_DAYS) e.notice = `From 0 to ${MAX_NOTICE_DAYS} days.`;
  if (d.deposit.trim()) {
    const p = paiseOf(d.deposit);
    if (p === null || p > MAX_DEPOSIT) e.deposit = 'Enter the deposit in rupees, up to ₹10,00,000, or leave it empty.';
  }
  if (d.depositNote.trim().length > 200) e.depositNote = 'Keep it under 200 letters.';
  if (d.refundDays < refundLimits.min || d.refundDays > refundLimits.max) e.refund = `Pick from ${refundLimits.min} to ${refundLimits.max} days.`;
  if (d.nearby.length > MAX_NEARBY) e.nearby = `Add up to ${MAX_NEARBY} places.`;
  else {
    const bad = d.nearby.findIndex((n) => {
      const km = kmOf(n.km);
      return n.name.trim().length < 2 || n.name.trim().length > 80 || km === null || km > 100;
    });
    if (bad >= 0) e.nearby = `Place ${bad + 1}: give it a name and a distance from 0 to 100 km.`;
  }
  return e;
}

export function toPropertyInput(d: PropertyDraft): PropertyInput {
  return {
    name: d.name.trim(),
    kind: d.kind,
    description: d.description.trim() || null,
    address: { line: d.line.trim(), area: d.area.trim() || null, city: d.city.trim(), pincode: d.pincode.trim() || null },
    for: d.for,
    occupants: d.occupants,
    food: { type: d.foodType, meals: d.foodType === 'none' ? [] : d.meals },
    facilities: d.facilities,
    rules: { curfew: d.curfew || null, guests: d.guests, smoking: d.smoking, alcohol: d.alcohol, pets: d.pets, notes: d.notes.trim() || null },
    noticeDays: d.noticeDays,
    deposit: { amount: d.deposit.trim() ? (paiseOf(d.deposit) ?? 0) : 0, note: d.depositNote.trim() || null },
    nearby: d.nearby.map((n) => ({ kind: n.kind, name: n.name.trim(), km: kmOf(n.km) ?? 0 })),
    refundDays: d.refundDays,
  };
}

// A room.

export interface RoomDraft {
  name: string;
  kind: RoomKind;
  beds: number;
  wholeRoom: boolean;
  month: string;
  night: string;
  features: RoomFeature[];
  paused: boolean;
}

export const emptyRoom = (n: number): RoomDraft => ({
  name: `Room ${n}`,
  kind: 'shared',
  beds: 2,
  wholeRoom: true,
  month: '',
  night: '',
  features: [],
  paused: false,
});

export const roomDraftOf = (r: RoomView): RoomDraft => ({
  name: r.name,
  kind: r.kind,
  beds: r.beds,
  wholeRoom: r.wholeRoom,
  month: rupees(r.prices.month),
  night: rupees(r.prices.night),
  features: [...r.features],
  paused: r.status === 'paused',
});

export type PriceErrors = Partial<Record<'month' | 'night' | 'prices', string>>;
export type RoomErrors = PriceErrors & Partial<Record<'name' | 'beds', string>>;

const priceError = (text: string) => {
  if (!text.trim()) return undefined;
  const p = paiseOf(text);
  return p === null || p < 100 || p > MAX_PRICE ? 'From ₹1 to ₹5,00,000' : undefined;
};

export function priceErrors(d: Pick<RoomDraft, 'month' | 'night'>): PriceErrors {
  const e: PriceErrors = {};
  const month = priceError(d.month);
  const night = priceError(d.night);
  if (month) e.month = month;
  if (night) e.night = night;
  if (!d.month.trim() && !d.night.trim()) e.prices = 'Add a price per month, per night, or both.';
  return e;
}

export function roomErrors(d: RoomDraft, rules: Pick<StaysRules, 'maxBeds'>): RoomErrors {
  const e: RoomErrors = priceErrors(d);
  const name = d.name.trim();
  if (!name || name.length > 40) e.name = 'Give the room a name of up to 40 letters.';
  if (!Number.isInteger(d.beds) || d.beds < 1 || d.beds > rules.maxBeds) e.beds = `From 1 to ${rules.maxBeds} beds.`;
  return e;
}

export const toPrices = (d: Pick<RoomDraft, 'month' | 'night'>): RoomPrices => ({
  month: d.month.trim() ? paiseOf(d.month) : null,
  night: d.night.trim() ? paiseOf(d.night) : null,
});

export const toRoomInput = (d: RoomDraft): RoomInput => ({
  name: d.name.trim(),
  kind: d.kind,
  beds: d.beds,
  ...(d.kind === 'shared' ? { wholeRoom: d.wholeRoom } : {}),
  prices: toPrices(d),
  features: d.features,
  status: d.paused ? 'paused' : 'live',
});
