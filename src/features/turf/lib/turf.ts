import type { Ionicons } from '@expo/vector-icons';
import type { RefundTier } from '@/lib/booking/refund';
import { clockText, rangeText, type Slot } from '@/lib/booking/slots';
import { dayText } from '@/features/events/lib/events';
import { money } from '@/features/vendor/lib/pod';
import { istParts } from '@/lib/dates';
import type { Amenity, CourtView, DaySlots, GroundStatus, Hours, Occurrence, Peak, Sport, TurfBookingStatus } from '@/types/turf';

type Icon = keyof typeof Ionicons.glyphMap;
type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'error';

export const AMENITY: Record<Amenity, { label: string; icon: Icon }> = {
  parking: { label: 'Parking', icon: 'car-outline' },
  washrooms: { label: 'Washrooms', icon: 'water-outline' },
  changing_rooms: { label: 'Changing rooms', icon: 'shirt-outline' },
  showers: { label: 'Showers', icon: 'rainy-outline' },
  drinking_water: { label: 'Drinking water', icon: 'beaker-outline' },
  floodlights: { label: 'Floodlights', icon: 'bulb-outline' },
  seating: { label: 'Seating', icon: 'people-outline' },
  cafe: { label: 'Café', icon: 'cafe-outline' },
  first_aid: { label: 'First aid', icon: 'medkit-outline' },
  equipment: { label: 'Equipment to rent', icon: 'basketball-outline' },
  lockers: { label: 'Lockers', icon: 'lock-closed-outline' },
  wifi: { label: 'Wi-Fi', icon: 'wifi-outline' },
};
export const AMENITIES = Object.keys(AMENITY) as Amenity[];

export const GROUND_STATUS: Record<GroundStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'warning' },
  live: { label: 'Live', tone: 'success' },
  removed: { label: 'Taken down', tone: 'error' },
};

export const BOOKING_STATUS: Record<TurfBookingStatus, { label: string; tone: Tone }> = {
  awaiting_payment: { label: 'Not paid yet', tone: 'warning' },
  confirmed: { label: 'Booked', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
/** Monday first, the way people list opening hours. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const sportsText = (sports: readonly Sport[]) => sports.map((s) => s.name).join(', ');

/** "Box Cricket" → "box_cricket", the key a new sport is saved under. */
export const sportKeyOf = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .slice(0, 30)
    .replace(/_+$/, '');

/** "1 hour", "30 min", "1½ hours". */
export function slotLengthText(minutes: number): string {
  if (minutes === 30) return '30 min';
  if (minutes === 60) return '1 hour';
  if (minutes === 90) return '1½ hours';
  return `${minutes} min`;
}

/** "From ₹800 a slot", or why it can't be booked. */
export const priceFromText = (priceFrom: number | null) => (priceFrom === null ? 'Not taking bookings' : `From ${money(priceFrom)} a slot`);

/** The ground's two refund steps as shared refund tiers. */
export function refundTiers(refunds: { fullHours: number; halfHours: number; halfPercent: number }): RefundTier[] {
  const full = { hoursBefore: refunds.fullHours, percent: 100 };
  return refunds.halfPercent > 0 && refunds.halfHours < refunds.fullHours ? [full, { hoursBefore: refunds.halfHours, percent: refunds.halfPercent }] : [full];
}

/** Weekdays a court never opens, for greying them on the date strip. */
export const closedWeekdays = (hours: readonly Hours[]) => [0, 1, 2, 3, 4, 5, 6].filter((d) => !hours.some((h) => h.day === d));

/** "Every day", "Mon–Fri", "Sat, Sun", "Mon, Wed, Fri". */
export function daysText(days: readonly number[]): string {
  const at = WEEK_ORDER.map((d, i) => (days.includes(d) ? i : -1)).filter((i) => i >= 0);
  if (at.length === 7) return 'Every day';
  const runs: number[][] = [];
  for (const i of at) {
    const run = runs[runs.length - 1];
    if (run && run[run.length - 1] === i - 1) run.push(i);
    else runs.push([i]);
  }
  const name = (i: number) => WEEKDAY_SHORT[WEEK_ORDER[i]!];
  return runs.map((r) => (r.length > 2 ? `${name(r[0]!)}–${name(r[r.length - 1]!)}` : r.map(name).join(', '))).join(', ');
}

/** "6 am–11 pm", "6–10 pm", "5 am–midnight". */
export const spanText = (start: string, end: string) => (end === '24:00' || end === '00:00' ? `${clockText(start)}–midnight` : rangeText(start, end));

/** Opening hours grouped by days with the same times: "Mon–Fri 6 am–11 pm · Sat, Sun 5 am–midnight". */
export function hoursText(hours: readonly Hours[]): string {
  if (!hours.length) return 'Closed every day';
  const groups = new Map<string, number[]>();
  for (const d of WEEK_ORDER) {
    const h = hours.find((x) => x.day === d);
    if (!h) continue;
    const key = `${h.open}|${h.close}`;
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  return [...groups.entries()]
    .map(([key, days]) => {
      const [open, close] = key.split('|') as [string, string];
      return `${daysText(days)} ${spanText(open, close)}`;
    })
    .join(' · ');
}

const peakText = (p: Peak) => `${daysText(p.days)} ${spanText(p.start, p.end)}`;

/** A court's prices in lines: base, weekends, then each peak window. */
export function priceLines(court: Pick<CourtView, 'prices' | 'slotMinutes'>): string[] {
  const { base, weekend, peak } = court.prices;
  return [
    `${money(base)} per ${slotLengthText(court.slotMinutes)} slot`,
    ...(weekend !== null && weekend !== base ? [`${money(weekend)} on Sat and Sun`] : []),
    ...peak.map((p) => `${money(p.price)} at peak: ${peakText(p)}`),
  ];
}

/** A court's day as cells for the slot grid. The key is the slot's start moment, which is what booking sends. */
export function slotsOf(day: DaySlots | null | undefined): Slot[] {
  if (!day || !day.open || !day.bookable) return [];
  return day.slots.map((s) => ({
    key: s.startAt,
    start: s.start,
    end: s.end,
    price: s.price,
    state: s.state === 'free' ? (s.peak ? 'peak' : 'free') : s.state,
  }));
}

/** Why a court's day shows no slots. */
export function noSlotsText(day: DaySlots | null | undefined): string {
  if (!day) return 'No slots on this day. Try another date.';
  if (day.court.status === 'paused') return 'This court isn’t taking bookings right now.';
  if (!day.open) return 'The court is closed on this day. Try another date.';
  if (!day.bookable) return 'You can’t book this far ahead yet.';
  return 'Every slot on this day has gone. Try another date.';
}

/** "Sat, 21 Nov · 7–9 pm" for a booked date, in India. */
export const slotWhen = (startAt: string, endAt: string) => `${dayText(startAt)} · ${spanText(istParts(startAt).time, istParts(endAt).time)}`;

/** How one date of a booking stands, for the customer or the ground's desk. */
export function occurrenceState(o: Pick<Occurrence, 'status' | 'cancelledBy' | 'arrival'>, viewer: 'customer' | 'desk'): string {
  if (o.status === 'cancelled') {
    if (o.cancelledBy === 'customer') return viewer === 'customer' ? 'You cancelled' : 'The customer cancelled';
    if (o.cancelledBy === 'ground') return viewer === 'customer' ? 'The ground cancelled' : 'You cancelled';
    return 'Cancelled by Ruxstar';
  }
  if (o.arrival === 'arrived') return viewer === 'customer' ? 'Played' : 'Arrived';
  if (o.arrival === 'no_show') return 'No-show';
  return 'Booked';
}

const ARRIVE_EARLY_MS = 30 * 60_000;
const MARK_UNTIL_MS = 24 * 60 * 60_000;

/** Which arrival marks the desk can set on a date at `now`: arrived from 30 minutes before, no-show from the start, both until a day after it ends. */
export function arrivalChoices(o: Pick<Occurrence, 'startAt' | 'endAt' | 'status'>, now: number): { arrived: boolean; noShow: boolean } {
  if (o.status !== 'booked') return { arrived: false, noShow: false };
  const start = Date.parse(o.startAt);
  const late = now > Date.parse(o.endAt) + MARK_UNTIL_MS;
  return { arrived: !late && now >= start - ARRIVE_EARLY_MS, noShow: !late && now >= start };
}

/** Whether the desk team has a turf permission; the owner has them all. */
export const deskCan = (ground: { owner: boolean; permissions: readonly string[] } | null | undefined, permission: string) =>
  !!ground && (ground.owner || ground.permissions.includes(permission));

/** What cancelling the picked dates gives back now, by the refund rule. */
export const refundFor = (occurrences: readonly Pick<Occurrence, 'n' | 'refundIfCancelled'>[], picked: readonly number[]) =>
  occurrences.filter((o) => picked.includes(o.n)).reduce((sum, o) => sum + (o.refundIfCancelled?.amount ?? 0), 0);

/** The directions link for a venue: its pin when set, else the address. */
export function mapsUrl(venue: { address: string; city: string; point: { lat: number; lng: number } | null }): string {
  const query = venue.point ? `${venue.point.lat},${venue.point.lng}` : `${venue.address}, ${venue.city}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
