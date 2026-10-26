export interface EventItem {
  id: string;
  title: string;
  organiser: string;
  startsAt: string;
  venue: string;
  area: string;
  description: string;
  /** Rupees; 0 for a free event. */
  price: number;
  capacity: number;
  registered: number;
}

export type TicketStatus = 'valid' | 'checked_in' | 'waitlisted' | 'cancelled';

export interface Ticket {
  id: string;
  eventId: string;
  eventTitle: string;
  startsAt: string;
  venue: string;
  /** Short code the organiser enters (or scans) at the door. */
  code: string;
  status: TicketStatus;
  holder: string;
  /** Position in the FIFO waitlist, when waitlisted. */
  waitlistPosition?: number;
  /** When a waitlisted seat opens, the holder has until then to claim it. */
  claimBy?: string;
}

export interface EventDetail extends EventItem {
  /** The signed-in user's ticket for this event, if any. */
  myTicket?: Ticket;
}

export interface NewEvent {
  title: string;
  startsAt: string;
  venue: string;
  area: string;
  price: number;
  capacity: number;
  description: string;
}
