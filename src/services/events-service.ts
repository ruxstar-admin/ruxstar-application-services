import { apiPost } from '@/lib/api-client';
import type { EventDetail, EventItem, NewEvent, Ticket } from '@/types/events';

/** Events: browse, register, waitlist, tickets, organiser tools. Not in the backend yet — mocked (events.mocks.ts). */
export const EventsService = {
  get: (token: string, id: string) => apiPost<EventDetail>('/events/get', { id }, token),
  register: (token: string, eventId: string, paymentRef?: string) => apiPost<Ticket>('/events/register', { eventId, paymentRef }, token),
  joinWaitlist: (token: string, eventId: string) => apiPost<Ticket>('/events/waitlist/join', { eventId }, token),
  ticket: (token: string, id: string) => apiPost<Ticket>('/events/ticket', { id }, token),

  vendorEvents: (token: string) => apiPost<EventItem[]>('/events/vendor/list', undefined, token),
  create: (token: string, event: NewEvent) => apiPost<EventItem>('/events/vendor/create', { ...event }, token),
  registrations: (token: string, eventId: string) => apiPost<Ticket[]>('/events/vendor/registrations', { eventId }, token),
  checkIn: (token: string, code: string) => apiPost<Ticket>('/events/vendor/checkin', { code }, token),
};
