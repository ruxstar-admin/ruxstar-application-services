import { findMock, runMock } from '..';
import type { EventDetail, EventItem, Ticket } from '@/types/events';

const call = <T = unknown>(path: string, body?: Record<string, unknown>) => {
  const route = findMock('POST', path, 'auto');
  if (!route) throw new Error(`no mock for ${path}`);
  return runMock({ ...route, latencyMs: 0 }, { path, body }) as Promise<T>;
};

describe('registration', () => {
  it('registers for a free event once and shows the ticket on the event', async () => {
    const ticket = await call<Ticket>('/events/register', { eventId: 'ev1' });
    expect(ticket.status).toBe('valid');
    expect(ticket.code).toMatch(/^RX\d{4}$/);
    await expect(call('/events/register', { eventId: 'ev1' })).rejects.toMatchObject({ kind: 'conflict' });
    await expect(call<EventDetail>('/events/get', { id: 'ev1' })).resolves.toMatchObject({ myTicket: { id: ticket.id } });
  });

  it('requires payment for a paid event', async () => {
    await expect(call('/events/register', { eventId: 'ev2' })).rejects.toMatchObject({ status: 402 });
    await expect(call('/events/register', { eventId: 'ev2', paymentRef: 'P1' })).resolves.toMatchObject({ status: 'valid' });
  });
});

describe('waitlist', () => {
  it('refuses registration when full, but accepts a waitlist join with a position', async () => {
    await expect(call('/events/register', { eventId: 'ev3', paymentRef: 'P' })).rejects.toMatchObject({ kind: 'conflict' });
    const waitlisted = await call<Ticket>('/events/waitlist/join', { eventId: 'ev3' });
    expect(waitlisted).toMatchObject({ status: 'waitlisted', waitlistPosition: 1 });
    await expect(call('/events/waitlist/join', { eventId: 'ev3' })).rejects.toMatchObject({ kind: 'conflict' });
  });

  it('does not offer a waitlist while seats remain', async () => {
    await expect(call('/events/waitlist/join', { eventId: 'ev1' })).rejects.toMatchObject({ kind: 'conflict' });
  });
});

describe('organiser tools', () => {
  it('validates a new event and publishes it to Discover', async () => {
    const base = { title: 'Poetry slam', startsAt: new Date(Date.now() + 86_400_000).toISOString(), venue: 'Cafe 5', area: 'Gachibowli', price: 0, capacity: 30, description: '' };
    await expect(call('/events/vendor/create', { ...base, title: ' ' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(call('/events/vendor/create', { ...base, startsAt: new Date(Date.now() - 1000).toISOString() })).rejects.toMatchObject({ kind: 'validation' });
    const created = await call<EventItem>('/events/vendor/create', base);
    expect(created.registered).toBe(0);
    const listings = await call<{ id: string }[]>('/discover/list', { module: 'events' });
    expect(listings.some((l) => l.id === created.id)).toBe(true);
  });

  it('checks a ticket in once, rejecting repeats and unknown codes', async () => {
    const ticket = await call<Ticket>('/events/register', { eventId: 'ev2', paymentRef: 'P9' }).catch(() => null);
    // ev2 may already hold our ticket from the earlier test; find it through registrations.
    const all = await call<Ticket[]>('/events/vendor/registrations', { eventId: 'ev2' });
    const code = (ticket ?? all[0]).code;
    await expect(call('/events/vendor/checkin', { code })).resolves.toMatchObject({ status: 'checked_in' });
    await expect(call('/events/vendor/checkin', { code })).rejects.toMatchObject({ kind: 'conflict' });
    await expect(call('/events/vendor/checkin', { code: 'ZZ0000' })).rejects.toMatchObject({ kind: 'not_found' });
  });
});
