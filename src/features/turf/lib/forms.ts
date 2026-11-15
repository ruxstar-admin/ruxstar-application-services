import { paiseOf } from '@/features/events/lib/events';
import type { AddOnPer, Amenity, CourtInput, CourtView, GroundInput, Peak, SlotMinutes, TurfRules, VendorGround } from '@/types/turf';

/** The highest price a slot, peak or add-on can have, in paise. */
const MAX_PRICE = 1_00_000_00;
const MAX_PEAKS = 5;
const PINCODE = /^[1-9][0-9]{5}$/;

const rupees = (paise: number) => String(paise / 100);
const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
};

// The ground.

export interface GroundDraft {
  name: string;
  description: string;
  address: string;
  city: string;
  pincode: string;
  amenities: Amenity[];
  fullHours: number;
  halfHours: number;
}

export const emptyGround = (rules: Pick<TurfRules, 'refundFullHours' | 'refundHalfHours'>, city = ''): GroundDraft => ({
  name: '',
  description: '',
  address: '',
  city,
  pincode: '',
  amenities: [],
  fullHours: rules.refundFullHours,
  halfHours: rules.refundHalfHours,
});

export const groundDraftOf = (g: VendorGround): GroundDraft => ({
  name: g.name,
  description: g.description ?? '',
  address: g.venue.address,
  city: g.venue.city,
  pincode: g.venue.pincode ?? '',
  amenities: [...g.amenities],
  fullHours: g.refunds.fullHours,
  halfHours: g.refunds.halfHours,
});

export type GroundErrors = Partial<Record<'name' | 'address' | 'city' | 'pincode' | 'refunds', string>>;

export function groundErrors(d: GroundDraft, rules: Pick<TurfRules, 'minFullHours' | 'maxFullHours'>): GroundErrors {
  const e: GroundErrors = {};
  const name = d.name.trim();
  if (name.length < 2 || name.length > 80) e.name = 'Give the ground a name of 2 to 80 letters.';
  if (d.address.trim().length < 5) e.address = 'Add the address players should come to.';
  if (d.city.trim().length < 2) e.city = 'Add the city.';
  if (d.pincode.trim() && !PINCODE.test(d.pincode.trim())) e.pincode = 'A pincode is 6 digits.';
  if (d.fullHours < rules.minFullHours || d.fullHours > rules.maxFullHours) e.refunds = `The full refund can be from ${rules.minFullHours} to ${rules.maxFullHours} hours before.`;
  else if (d.halfHours > d.fullHours) e.refunds = 'The part refund has to be closer to the start than the full one.';
  return e;
}

export const toGroundInput = (d: GroundDraft): GroundInput => ({
  name: d.name.trim(),
  description: d.description.trim() || null,
  venue: { address: d.address.trim(), city: d.city.trim(), pincode: d.pincode.trim() || null },
  amenities: d.amenities,
  refunds: { fullHours: d.fullHours, halfHours: d.halfHours },
});

// A court.

export interface DayHours {
  open: boolean;
  from: string;
  to: string;
}

export interface PeakDraft {
  days: number[];
  start: string;
  end: string;
  price: string;
}

export interface AddOnDraft {
  id?: string;
  name: string;
  price: string;
  per: AddOnPer;
}

export interface CourtDraft {
  name: string;
  sports: string[];
  slotMinutes: SlotMinutes;
  /** By weekday, 0 = Sunday. */
  hours: DayHours[];
  base: string;
  weekend: string;
  peaks: PeakDraft[];
  addOns: AddOnDraft[];
  paused: boolean;
}

export const newPeak = (): PeakDraft => ({ days: [1, 2, 3, 4, 5], start: '18:00', end: '22:00', price: '' });
export const newAddOn = (): AddOnDraft => ({ name: '', price: '', per: 'booking' });

export const emptyCourt = (n: number, slotMinutes: SlotMinutes = 60): CourtDraft => ({
  name: `Court ${n}`,
  sports: [],
  slotMinutes,
  hours: Array.from({ length: 7 }, () => ({ open: true, from: '06:00', to: '23:00' })),
  base: '',
  weekend: '',
  peaks: [],
  addOns: [],
  paused: false,
});

export function courtDraftOf(c: CourtView): CourtDraft {
  return {
    name: c.name,
    sports: c.sports.map((s) => s.key),
    slotMinutes: c.slotMinutes === 30 || c.slotMinutes === 90 ? c.slotMinutes : 60,
    hours: Array.from({ length: 7 }, (_, day) => {
      const h = c.hours.find((x) => x.day === day);
      return h ? { open: true, from: h.open, to: h.close } : { open: false, from: '06:00', to: '23:00' };
    }),
    base: rupees(c.prices.base),
    weekend: c.prices.weekend === null ? '' : rupees(c.prices.weekend),
    peaks: c.prices.peak.map((p) => ({ days: [...p.days], start: p.start, end: p.end, price: rupees(p.price) })),
    addOns: c.addOns.map((a) => ({ id: a.id, name: a.name, price: rupees(a.price), per: a.per })),
    paused: c.status === 'paused',
  };
}

export interface CourtErrors {
  name?: string;
  sports?: string;
  hours?: string;
  base?: string;
  weekend?: string;
  /** By peak index. */
  peaks: Record<number, string>;
  /** By add-on index. */
  addOns: Record<number, string>;
  more?: string;
}

const priceOk = (paise: number | null, min = 100): paise is number => paise !== null && paise >= min && paise <= MAX_PRICE;

/** Day spans that overlap on a shared weekday. */
const overlaps = (a: PeakDraft, b: PeakDraft) =>
  a.days.some((d) => b.days.includes(d)) && minutesOf(a.start) < minutesOf(b.end) && minutesOf(b.start) < minutesOf(a.end);

export function courtErrors(d: CourtDraft, rules: Pick<TurfRules, 'maxAddOns'>): CourtErrors {
  const e: CourtErrors = { peaks: {}, addOns: {} };
  const name = d.name.trim();
  if (!name || name.length > 40) e.name = 'Give the court a name of up to 40 letters.';
  if (!d.sports.length) e.sports = 'Pick at least one sport played here.';
  else if (d.sports.length > 5) e.sports = 'Pick up to 5 sports.';
  const open = d.hours.filter((h) => h.open);
  if (!open.length) e.hours = 'Open it at least one day a week.';
  else if (open.some((h) => minutesOf(h.to) <= minutesOf(h.from))) e.hours = 'Each day has to close after it opens.';
  else if (open.some((h) => minutesOf(h.to) - minutesOf(h.from) < d.slotMinutes)) e.hours = 'Each open day needs room for at least one slot.';
  if (!priceOk(paiseOf(d.base))) e.base = 'Enter the price of a slot, from ₹1.';
  if (d.weekend.trim() && !priceOk(paiseOf(d.weekend))) e.weekend = 'Enter a weekend price from ₹1, or leave it empty.';
  d.peaks.forEach((p, i) => {
    if (!p.days.length) e.peaks[i] = 'Pick the days.';
    else if (minutesOf(p.end) <= minutesOf(p.start)) e.peaks[i] = 'It has to end after it starts.';
    else if (!priceOk(paiseOf(p.price))) e.peaks[i] = 'Enter the peak price, from ₹1.';
    else if (d.peaks.some((q, j) => j < i && overlaps(p, q))) e.peaks[i] = 'This overlaps another peak time.';
  });
  if (d.peaks.length > MAX_PEAKS) e.more = `Add up to ${MAX_PEAKS} peak times.`;
  d.addOns.forEach((a, i) => {
    const n = a.name.trim();
    if (n.length < 2 || n.length > 40) e.addOns[i] = 'Name it in 2 to 40 letters.';
    else if (!priceOk(paiseOf(a.price), 0)) e.addOns[i] = 'Enter its price; ₹0 is fine.';
    else if (d.addOns.some((b, j) => j < i && b.name.trim().toLowerCase() === n.toLowerCase())) e.addOns[i] = 'Another add-on has this name.';
  });
  if (d.addOns.length > rules.maxAddOns) e.more = `Add up to ${rules.maxAddOns} add-ons.`;
  return e;
}

export const hasCourtErrors = (e: CourtErrors) =>
  !!(e.name || e.sports || e.hours || e.base || e.weekend || e.more || Object.keys(e.peaks).length || Object.keys(e.addOns).length);

export const toPrices = (d: Pick<CourtDraft, 'base' | 'weekend' | 'peaks'>) => ({
  base: paiseOf(d.base) ?? 0,
  weekend: d.weekend.trim() ? (paiseOf(d.weekend) ?? null) : null,
  peak: d.peaks.map((p): Peak => ({ days: [...p.days].sort((a, b) => a - b), start: p.start, end: p.end, price: paiseOf(p.price) ?? 0 })),
});

export const toAddOns = (addOns: readonly AddOnDraft[]) =>
  addOns.map((a) => ({ ...(a.id ? { id: a.id } : {}), name: a.name.trim(), price: paiseOf(a.price) ?? 0, per: a.per }));

export function toCourtInput(d: CourtDraft): CourtInput {
  return {
    name: d.name.trim(),
    sports: d.sports,
    slotMinutes: d.slotMinutes,
    hours: d.hours.flatMap((h, day) => (h.open ? [{ day, open: h.from, close: h.to }] : [])),
    prices: toPrices(d),
    addOns: toAddOns(d.addOns),
    status: d.paused ? 'paused' : 'live',
  };
}
