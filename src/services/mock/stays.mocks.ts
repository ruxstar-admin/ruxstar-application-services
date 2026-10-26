import { ApiError } from '@/lib/api-error';
import { freeBeds, nightKeys, stayTotal, type BookedBeds } from '@/features/stays/lib/availability';
import type { Booking, FacilityKey, NewProperty, Property, PropertyDetail, Room, StayResult } from '@/types/stays';
import { dateKey } from '@/lib/dates';
import { recordEngagement, registerCanceller, registerListings } from './commerce-state';
import { defineMocks } from './registry';

let properties: Property[] = [
  { id: 'pg1', name: 'Green Nest PG', area: 'Madhapur', address: 'Plot 14, Ayyappa Society', facilities: ['wifi', 'ac', 'meals', 'laundry'], rating: 4.5 },
  { id: 'pg2', name: 'Campus Corner Hostel', area: 'Gachibowli', address: 'Near IIIT Gate 2', facilities: ['wifi', 'power_backup', 'parking'], rating: 4.2 },
  { id: 'pg3', name: 'Lakeview Stays', area: 'Kondapur', address: 'Lane 3, Raghavendra Colony', facilities: ['wifi', 'ac', 'laundry', 'parking', 'meals'], rating: 4.7 },
];

let rooms: Room[] = [
  { id: 'r1', propertyId: 'pg1', name: 'Double sharing · AC', sharing: 2, beds: 6, ratePerNight: 450 },
  { id: 'r2', propertyId: 'pg1', name: 'Single room', sharing: 1, beds: 3, ratePerNight: 800 },
  { id: 'r3', propertyId: 'pg2', name: 'Four-bed dorm', sharing: 4, beds: 12, ratePerNight: 300 },
  { id: 'r4', propertyId: 'pg3', name: 'Double sharing · AC', sharing: 2, beds: 8, ratePerNight: 550 },
];

interface StoredBooking extends Booking, BookedBeds {
  roomId: string;
}
let bookings: StoredBooking[] = [];
let counter = 5100;

const field = (body: Record<string, unknown> | undefined, key: string) => String(body?.[key] ?? '');
const propertyOf = (id: string) => {
  const found = properties.find((p) => p.id === id);
  if (!found) throw new ApiError(404, 'Property not found');
  return found;
};
const roomOf = (id: string) => {
  const found = rooms.find((r) => r.id === id);
  if (!found) throw new ApiError(404, 'Room not found');
  return found;
};
const bookedFor = (roomId: string) => bookings.filter((b) => b.roomId === roomId && b.status === 'confirmed');
const roomFree = (room: Room, from: string, to: string) => freeBeds(room.beds, bookedFor(room.id), { from, to });
const validRange = (from: string, to: string) => {
  if (!from || !to || nightKeys({ from, to }).length === 0) throw new ApiError(400, 'Choose check-in and check-out dates');
};

registerCanceller('pg', (refId) => {
  const booking = bookings.find((b) => b.id === refId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  return {
    completed: booking.to <= dateKey(new Date()),
    apply: () => {
      booking.status = 'cancelled';
    },
  };
});

registerListings(() =>
  properties.map((p) => {
    const own = rooms.filter((r) => r.propertyId === p.id);
    const cheapest = own.length ? Math.min(...own.map((r) => r.ratePerNight)) : 0;
    return {
      id: p.id,
      module: 'pg' as const,
      title: p.name,
      subtitle: `${p.area} · ${p.facilities.length} facilities`,
      price: cheapest ? `from ₹${cheapest} / night` : 'No rooms',
      badge: `★ ${p.rating}`,
    };
  }),
);

defineMocks({
  /** Indexed by location text and facilities (scope review #5). A property appears only if a room has a free bed for the dates. */
  'POST /stays/search': {
    mocked: true,
    latencyMs: 350,
    handle: ({ body }): StayResult[] => {
      const from = field(body, 'from');
      const to = field(body, 'to');
      validRange(from, to);
      const q = field(body, 'q').trim().toLowerCase();
      const wanted = (body?.facilities as FacilityKey[] | undefined) ?? [];
      return properties
        .filter((p) => (!q || `${p.name} ${p.area} ${p.address}`.toLowerCase().includes(q)) && wanted.every((f) => p.facilities.includes(f)))
        .map((property) => {
          const open = rooms
            .filter((r) => r.propertyId === property.id)
            .map((room) => ({ room, free: roomFree(room, from, to) }))
            .filter((r) => r.free > 0);
          return {
            property,
            fromRate: open.length ? Math.min(...open.map((r) => r.room.ratePerNight)) : 0,
            freeBeds: open.reduce((sum, r) => sum + r.free, 0),
          };
        })
        .filter((r) => r.freeBeds > 0);
    },
  },

  'POST /stays/get': {
    mocked: true,
    handle: ({ body }): PropertyDetail => {
      const property = propertyOf(field(body, 'id'));
      const from = field(body, 'from');
      const to = field(body, 'to');
      const ranged = !!from && !!to && nightKeys({ from, to }).length > 0;
      return {
        property: { ...property },
        rooms: rooms
          .filter((r) => r.propertyId === property.id)
          .map((room) => ({ room: { ...room }, free: ranged ? roomFree(room, from, to) : room.beds })),
      };
    },
  },

  'POST /stays/book': {
    mocked: true,
    latencyMs: 500,
    handle: ({ body }) => {
      const room = roomOf(field(body, 'roomId'));
      const property = propertyOf(room.propertyId);
      const from = field(body, 'from');
      const to = field(body, 'to');
      const beds = Number(body?.beds ?? 1);
      validRange(from, to);
      if (!field(body, 'paymentRef')) throw new ApiError(402, 'Payment required');
      if (beds < 1 || beds > roomFree(room, from, to)) throw new ApiError(409, 'Those beds are no longer available');

      const nights = nightKeys({ from, to }).length;
      const booking: StoredBooking = {
        id: `bk${++counter}`,
        roomId: room.id,
        propertyName: property.name,
        area: property.area,
        roomName: room.name,
        beds,
        from,
        to,
        nights,
        total: stayTotal(room.ratePerNight, beds, nights),
        status: 'confirmed',
      };
      bookings = [booking, ...bookings];
      recordEngagement({
        module: 'pg',
        title: property.name,
        subtitle: `${room.name} · ${nights} night${nights > 1 ? 's' : ''} from ${from}`,
        amount: booking.total,
        status: 'confirmed',
        refId: booking.id,
        paymentRef: field(body, 'paymentRef'),
      });
      return { ...booking };
    },
  },

  'POST /stays/booking': {
    mocked: true,
    handle: ({ body }) => {
      const found = bookings.find((b) => b.id === field(body, 'id'));
      if (!found) throw new ApiError(404, 'Booking not found');
      return { ...found };
    },
  },

  'POST /stays/vendor/properties': { mocked: true, handle: () => properties.map((p) => ({ ...p })) },

  'POST /stays/vendor/create': {
    mocked: true,
    latencyMs: 500,
    handle: ({ body }) => {
      const input = body as unknown as NewProperty;
      if (!input.name?.trim() || !input.area?.trim()) throw new ApiError(400, 'Name and area are required');
      if (input.room.beds < 1 || input.room.ratePerNight < 1) throw new ApiError(400, 'Room beds and rate must be positive');
      const property: Property = {
        id: `pg${properties.length + 1}`,
        name: input.name.trim(),
        area: input.area.trim(),
        address: input.address.trim(),
        facilities: input.facilities,
        rating: 0,
      };
      properties = [property, ...properties];
      rooms = [{ id: `r${rooms.length + 1}`, propertyId: property.id, ...input.room }, ...rooms];
      return { ...property };
    },
  },

  'POST /stays/vendor/room/save': {
    mocked: true,
    handle: ({ body }) => {
      const propertyId = field(body, 'propertyId');
      propertyOf(propertyId);
      const input = body?.room as { id?: string; name: string; sharing: number; beds: number; ratePerNight: number };
      if (!input.name?.trim() || input.beds < 1 || input.ratePerNight < 1) throw new ApiError(400, 'Room needs a name, beds and a rate');
      if (input.id) {
        const existing = roomOf(input.id);
        Object.assign(existing, { name: input.name, sharing: input.sharing, beds: input.beds, ratePerNight: input.ratePerNight });
        return { ...existing };
      }
      const created: Room = { id: `r${rooms.length + 1}`, propertyId, name: input.name.trim(), sharing: input.sharing, beds: input.beds, ratePerNight: input.ratePerNight };
      rooms = [...rooms, created];
      return { ...created };
    },
  },

  'POST /stays/vendor/facilities': {
    mocked: true,
    handle: ({ body }) => {
      const property = propertyOf(field(body, 'propertyId'));
      property.facilities = (body?.facilities as FacilityKey[]) ?? [];
      return { ...property };
    },
  },
});
