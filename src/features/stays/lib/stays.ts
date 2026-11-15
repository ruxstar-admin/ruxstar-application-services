import type { Ionicons } from '@expo/vector-icons';
import { dayLabel, dayText, timeText } from '@/features/events/lib/events';
import { money } from '@/features/vendor/lib/pod';
import { addDays } from '@/lib/dates';
import { clockText } from '@/lib/booking/slots';
import type {
  BoardBedState,
  Deposit,
  Food,
  FoodType,
  HouseRules,
  Meal,
  NearbyKind,
  Occupant,
  Payout,
  PropertyCard,
  PropertyKind,
  PropertyStatus,
  RoomFeature,
  RoomKind,
  RoomPrices,
  StayFor,
  StayReservation,
  StayStatus,
  StayUnit,
} from '@/types/stays';

type Icon = keyof typeof Ionicons.glyphMap;
type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'error';

export { deskCan, mapsUrl } from '@/features/turf/lib/turf';

export const KIND_LABEL: Record<PropertyKind, string> = { pg: 'PG', hostel: 'Hostel', coliving: 'Co-living' };
export const KINDS = Object.keys(KIND_LABEL) as PropertyKind[];

export const FOR_LABEL: Record<StayFor, string> = { men: 'Men only', women: 'Women only', any: 'Anyone' };
export const OCCUPANT_LABEL: Record<Occupant, string> = { students: 'Students', working: 'Working people' };
export const MEAL_LABEL: Record<Meal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
export const MEALS = Object.keys(MEAL_LABEL) as Meal[];
export const FOOD_LABEL: Record<FoodType, string> = { veg: 'Veg food', non_veg: 'Veg and non-veg food', none: 'No food' };
export const FEATURE_LABEL: Record<RoomFeature, string> = {
  ac: 'AC',
  attached_bath: 'Attached bathroom',
  balcony: 'Balcony',
  furnished: 'Furnished',
  window: 'Window',
};
export const FEATURES = Object.keys(FEATURE_LABEL) as RoomFeature[];
export const NEARBY: Record<NearbyKind, { label: string; icon: Icon }> = {
  college: { label: 'College', icon: 'school-outline' },
  office: { label: 'Office', icon: 'briefcase-outline' },
  metro: { label: 'Metro', icon: 'train-outline' },
  other: { label: 'Place', icon: 'location-outline' },
};
export const NEARBY_KINDS = Object.keys(NEARBY) as NearbyKind[];
export const ROOM_KIND_LABEL: Record<RoomKind, string> = { private: 'Private room', shared: 'Shared room' };

export const STAY_STATUS: Record<StayStatus, { label: string; tone: Tone }> = {
  awaiting_payment: { label: 'Not paid yet', tone: 'warning' },
  confirmed: { label: 'Reserved', tone: 'success' },
  moved_in: { label: 'Moved in', tone: 'success' },
  moved_out: { label: 'Moved out', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const PROPERTY_STATUS: Record<PropertyStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'warning' },
  live: { label: 'Live', tone: 'success' },
  removed: { label: 'Taken down', tone: 'error' },
};

export const BED_STATE: Record<BoardBedState, string> = {
  free: 'Free',
  held: 'Someone is paying',
  reserved: 'Reserved',
  occupied: 'Moved in',
  closed: 'Marked full',
};

export const PAYOUT_LABEL: Record<Payout, string> = {
  none: 'No payout',
  waiting: 'Paid out after the tenant moves in and the check window closes',
  objection: 'On hold: the tenant says something is wrong',
  released: 'Paid out',
  refunded: 'Refunded to the tenant',
};

// Words.

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
export const PER_UNIT: Record<StayUnit, string> = { month: 'a month', night: 'a night' };

/** "Sat 21 Nov" for India's `YYYY-MM-DD`. */
export const dayShort = dayLabel;

/** "Tue, 2 Dec, 9:30 pm". */
export const momentText = (iso: string) => `${dayText(iso)}, ${timeText(iso)}`;

export const listText = (items: readonly string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/** "₹8,000 a month · ₹600 a night" for one bed, or the whole private room. */
export const pricesText = (prices: RoomPrices) =>
  [prices.month !== null ? `${money(prices.month)} a month` : null, prices.night !== null ? `${money(prices.night)} a night` : null].filter(Boolean).join(' · ');

/** "From ₹8,000 a month", the lowest of the reservable rooms, or that it's full. */
export function priceFromText(priceFrom: PropertyCard['priceFrom']): string {
  const text = pricesText(priceFrom);
  return text ? `From ${text}` : 'Full right now';
}

export const perText = (kind: RoomKind) => (kind === 'private' ? 'for the room' : 'per bed');

export function foodText(food: Food): string {
  if (food.type === 'none') return 'No food';
  const meals = MEALS.filter((m) => food.meals.includes(m)).map((m) => MEAL_LABEL[m].toLowerCase());
  return meals.length ? `${FOOD_LABEL[food.type]} · ${listText(meals)} included` : FOOD_LABEL[food.type];
}

export const forText = (forWhom: StayFor, occupants: readonly Occupant[]) =>
  [FOR_LABEL[forWhom], occupants.length ? listText(occupants.map((o) => OCCUPANT_LABEL[o].toLowerCase())) : null].filter(Boolean).join(' · ');

export const noticeText = (days: number) => (days > 0 ? `${plural(days, 'day')}’ notice to move out` : 'No notice period');

export const kmText = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${Number.isInteger(km) ? km : km.toFixed(1)} km`);

export const depositLine = (deposit: Deposit) =>
  deposit.amount > 0 ? `${money(deposit.amount)} deposit, paid to the owner at move-in, not through Ruxstar${deposit.note ? `. ${deposit.note}` : ''}` : 'No deposit';

/** House rules as yes and no lines, the entry time first. */
export function rulesList(rules: HouseRules): { text: string; ok: boolean }[] {
  return [
    { text: rules.curfew ? `Be in by ${clockText(rules.curfew)}` : 'No entry time', ok: !rules.curfew },
    { text: rules.guests ? 'Guests allowed' : 'No guests', ok: rules.guests },
    { text: rules.smoking ? 'Smoking allowed' : 'No smoking', ok: rules.smoking },
    { text: rules.alcohol ? 'Alcohol allowed' : 'No alcohol', ok: rules.alcohol },
    { text: rules.pets ? 'Pets allowed' : 'No pets', ok: rules.pets },
  ];
}

/** "From Mon 1 Dec · 1 month paid" or "Mon 1 Dec – Thu 4 Dec · 3 nights". */
export function stayText(r: { stay: StayUnit; units: number; moveIn: string }): string {
  if (r.stay === 'night') return `${dayShort(r.moveIn)} – ${dayShort(addDays(r.moveIn, r.units))} · ${plural(r.units, 'night')}`;
  return `From ${dayShort(r.moveIn)} · ${plural(r.units, 'month')} paid`;
}

export const bedsText = (r: { whole: boolean; beds: readonly { label: string }[]; room: { name: string; kind: RoomKind } }) =>
  r.whole || r.room.kind === 'private' ? `${r.room.name} · whole room` : `${r.room.name} · bed ${r.beds.map((b) => b.label).join(', ')}`;

/** Where a cancelled reservation's money went, in one line. */
export function cancelText(r: Pick<StayReservation, 'cancellation' | 'refund'>, viewer: 'tenant' | 'desk'): string | null {
  if (!r.cancellation) return null;
  const who =
    r.cancellation.by === 'customer'
      ? viewer === 'tenant' ? 'You cancelled' : 'The tenant cancelled'
      : r.cancellation.by === 'property'
        ? viewer === 'tenant' ? 'The property cancelled' : 'You cancelled'
        : r.cancellation.by === 'ruxstar'
          ? 'Ruxstar cancelled'
          : 'It wasn’t paid in time';
  const refund = r.refund ? ` ${money(r.refund.amount)} ${r.refund.status === 'done' ? 'refunded' : 'is being refunded'}.` : '';
  return `${who}: ${r.cancellation.reason}.${refund}`;
}

// The stay's timeline.

export type StepState = 'done' | 'now' | 'todo' | 'problem';
export interface TimelineStep {
  title: string;
  detail: string | null;
  state: StepState;
}

type TimelineFields = Pick<StayReservation, 'status' | 'moveIn' | 'movedInAt' | 'objectionUntil' | 'objection' | 'moveOut' | 'stay' | 'units' | 'payBy'>;

/**
 * Where a reservation is, for the tenant or the owner: reserved, moved in, the window to say something's wrong, then all set.
 * Cancelled reservations have no timeline.
 */
export function stayTimeline(r: TimelineFields, now: number, owner = false): TimelineStep[] {
  const paid = r.status !== 'awaiting_payment';
  const movedIn = r.movedInAt !== null;
  const windowOpen = movedIn && r.objectionUntil !== null && Date.parse(r.objectionUntil) > now;
  const objection = r.objection;
  const open = objection?.status === 'open';

  const reserved: TimelineStep = paid
    ? { title: 'Reserved', detail: `Paid · moving in ${dayShort(r.moveIn)}`, state: 'done' }
    : { title: 'Pay to reserve', detail: r.payBy ? `Pay by ${timeText(r.payBy)} or the bed goes back.` : null, state: 'now' };

  const arrived: TimelineStep = movedIn
    ? { title: 'Moved in', detail: momentText(r.movedInAt!), state: 'done' }
    : {
        title: 'Move in',
        detail: owner ? `Tap Moved in when they arrive, on or after ${dayShort(r.moveIn)}.` : `On ${dayShort(r.moveIn)}. The owner marks it when you arrive.`,
        state: paid ? 'now' : 'todo',
      };

  let check: TimelineStep;
  if (open) {
    check = {
      title: 'Something’s wrong',
      detail: owner
        ? 'The tenant told Ruxstar something is wrong. Your payout waits while Ruxstar looks into it.'
        : 'Ruxstar support is looking into it. The owner isn’t paid until it’s sorted.',
      state: 'problem',
    };
  } else if (objection?.status === 'refunded') {
    check = { title: 'Refunded by Ruxstar', detail: objection.note, state: 'done' };
  } else if (objection?.status === 'released') {
    check = { title: 'Looked into by Ruxstar', detail: objection.note ?? 'Ruxstar looked into it and paid the owner.', state: 'done' };
  } else if (windowOpen) {
    check = owner
      ? { title: 'Tenant is checking the place', detail: `They can say something’s wrong until ${momentText(r.objectionUntil!)}. You’re paid after that.`, state: 'now' }
      : { title: 'Check everything is right', detail: `Something wrong? Tell us by ${momentText(r.objectionUntil!)}. After that the owner is paid.`, state: 'now' };
  } else if (movedIn) {
    check = { title: 'Checked', detail: 'The time to say something’s wrong has passed.', state: 'done' };
  } else {
    check = {
      title: owner ? 'Tenant checks the place' : 'Check everything is right',
      detail: owner
        ? 'After moving in, the tenant has 24 hours to say something’s wrong before you’re paid.'
        : 'After you move in, you have 24 hours to tell us if something’s wrong.',
      state: 'todo',
    };
  }

  const settled = movedIn && !windowOpen && !open;
  const end: TimelineStep =
    r.status === 'moved_out'
      ? { title: 'Moved out', detail: r.moveOut ? dayShort(r.moveOut.on) : null, state: 'done' }
      : {
          title: 'All set',
          detail: r.moveOut
            ? `Moving out ${dayShort(r.moveOut.on)}`
            : r.stay === 'night'
              ? `Check out ${dayShort(addDays(r.moveIn, r.units))}`
              : 'The stay runs until notice is given.',
          state: settled ? 'done' : 'todo',
        };

  return [reserved, arrived, check, end];
}
