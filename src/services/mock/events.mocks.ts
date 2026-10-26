import { ApiError } from '@/lib/api-error';
import type { EventDetail, EventItem, NewEvent, Ticket } from '@/types/events';
import { recordEngagement, registerCanceller, registerListings, updateEngagement } from './commerce-state';
import { defineMocks } from './registry';

const DAY = 86_400_000;
const inDays = (days: number, hour: number) => {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

let events: EventItem[] = [
  { id: 'ev1', title: 'Open mic night', organiser: 'Studio 9', startsAt: inDays(2, 20), venue: 'Studio 9, Road 12', area: 'Banjara Hills', description: 'Bring your own mic or borrow ours. Poetry, music and stand-up.', price: 0, capacity: 80, registered: 41 },
  { id: 'ev2', title: 'Weekend flea market', organiser: 'Hyderabad Makers', startsAt: inDays(4, 10), venue: 'Shilparamam grounds', area: 'Madhapur', description: 'Over 60 stalls: handmade, vintage and street food.', price: 50, capacity: 500, registered: 320 },
  { id: 'ev3', title: 'Wheel pottery masterclass', organiser: 'Priya Nair', startsAt: inDays(6, 16), venue: 'Claymate Studio', area: 'Jubilee Hills', description: 'Three hours, one bowl, all materials included.', price: 1200, capacity: 12, registered: 12 },
];

let tickets: (Ticket & { mine: boolean })[] = [];
let counter = 4000;

const field = (body: Record<string, unknown> | undefined, key: string) => String(body?.[key] ?? '');
const eventOf = (id: string) => {
  const found = events.find((e) => e.id === id);
  if (!found) throw new ApiError(404, 'Event not found');
  return found;
};
const ticketOf = (id: string) => {
  const found = tickets.find((t) => t.id === id);
  if (!found) throw new ApiError(404, 'Ticket not found');
  return found;
};
const strip = ({ mine: _mine, ...ticket }: Ticket & { mine: boolean }): Ticket => ticket;

const detail = (event: EventItem): EventDetail => {
  const mine = tickets.find((t) => t.eventId === event.id && t.mine && t.status !== 'cancelled');
  return { ...event, myTicket: mine ? strip(mine) : undefined };
};

const issue = (event: EventItem, status: Ticket['status'], extra: Partial<Ticket> = {}) => {
  const ticket: Ticket & { mine: boolean } = {
    id: `tk${++counter}`,
    eventId: event.id,
    eventTitle: event.title,
    startsAt: event.startsAt,
    venue: event.venue,
    code: `RX${Math.floor(1000 + Math.random() * 9000)}`,
    status,
    holder: 'You',
    mine: true,
    ...extra,
  };
  tickets = [ticket, ...tickets];
  return ticket;
};

registerCanceller('events', (refId) => {
  const ticket = ticketOf(refId);
  return {
    completed: ticket.status === 'checked_in',
    apply: () => {
      ticket.status = 'cancelled';
      const event = events.find((e) => e.id === ticket.eventId);
      if (event) event.registered = Math.max(0, event.registered - 1);
    },
  };
});

registerListings(() =>
  events.map((e) => ({
    id: e.id,
    module: 'events' as const,
    title: e.title,
    subtitle: `${new Date(e.startsAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · ${e.area}`,
    price: e.price === 0 ? 'Free' : `₹${e.price}`,
    badge: e.registered >= e.capacity ? 'Full' : `${e.capacity - e.registered} left`,
  })),
);

defineMocks({
  'POST /events/get': { mocked: true, handle: ({ body }) => detail(eventOf(field(body, 'id'))) },

  'POST /events/register': {
    mocked: true,
    latencyMs: 450,
    handle: ({ body }) => {
      const event = eventOf(field(body, 'eventId'));
      if (tickets.some((t) => t.eventId === event.id && t.mine && t.status !== 'cancelled')) throw new ApiError(409, 'Already registered');
      if (event.registered >= event.capacity) throw new ApiError(409, 'Event is full');
      if (event.price > 0 && !field(body, 'paymentRef')) throw new ApiError(402, 'Payment required');
      event.registered += 1;
      const ticket = issue(event, 'valid');
      recordEngagement({
        module: 'events',
        title: event.title,
        subtitle: 'Ticket confirmed',
        amount: event.price,
        status: 'confirmed',
        refId: ticket.id,
        paymentRef: field(body, 'paymentRef') || undefined,
      });
      return strip(ticket);
    },
  },

  /** FIFO waitlist; a freed seat is held for the first person for 24 h (PRD Module 9b). */
  'POST /events/waitlist/join': {
    mocked: true,
    handle: ({ body }) => {
      const event = eventOf(field(body, 'eventId'));
      if (event.registered < event.capacity) throw new ApiError(409, 'Seats are available — register instead');
      if (tickets.some((t) => t.eventId === event.id && t.mine && t.status !== 'cancelled')) throw new ApiError(409, 'Already on the list');
      const position = tickets.filter((t) => t.eventId === event.id && t.status === 'waitlisted').length + 1;
      return strip(issue(event, 'waitlisted', { waitlistPosition: position }));
    },
  },

  'POST /events/ticket': { mocked: true, handle: ({ body }) => strip(ticketOf(field(body, 'id'))) },

  'POST /events/vendor/list': { mocked: true, handle: () => events.map((e) => ({ ...e })) },

  'POST /events/vendor/create': {
    mocked: true,
    latencyMs: 500,
    handle: ({ body }) => {
      const input = body as unknown as NewEvent;
      if (!input.title?.trim() || !input.venue?.trim()) throw new ApiError(400, 'Title and venue are required');
      if (new Date(input.startsAt).getTime() < Date.now()) throw new ApiError(400, 'Choose a future date');
      if (input.capacity < 1) throw new ApiError(400, 'Capacity must be at least 1');
      const created: EventItem = { id: `ev${events.length + 1}`, organiser: 'Sunrise Print Works', registered: 0, ...input };
      events = [created, ...events];
      return { ...created };
    },
  },

  'POST /events/vendor/registrations': {
    mocked: true,
    handle: ({ body }) => {
      const id = field(body, 'eventId');
      eventOf(id);
      return tickets.filter((t) => t.eventId === id && t.status !== 'cancelled').map(strip);
    },
  },

  'POST /events/vendor/checkin': {
    mocked: true,
    latencyMs: 250,
    handle: ({ body }) => {
      const code = field(body, 'code').trim().toUpperCase();
      const ticket = tickets.find((t) => t.code === code);
      if (!ticket) throw new ApiError(404, 'No ticket with that code');
      if (ticket.status === 'checked_in') throw new ApiError(409, 'Already checked in');
      if (ticket.status !== 'valid') throw new ApiError(403, 'Ticket is not valid');
      ticket.status = 'checked_in';
      updateEngagement(ticket.id, { status: 'completed', subtitle: 'Attended' });
      return strip(ticket);
    },
  },
});
