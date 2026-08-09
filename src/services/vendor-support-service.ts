/**
 * Vendor Support Service
 * ---------------
 * API calls for vendor support tickets.
 * Mirrors the web's lib/api.ts support section + components/support-portal.tsx.
 * Base URL matches kyc-service.ts / vendor-service.ts.
 */

import { API_URL } from '@/constants/config';

const BASE_URL = API_URL;

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as Record<string, string>).message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

async function apiPost<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as Record<string, string>).message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

// ─── Types (mirror models/SupportTicket.js sanitize()) ────────────────────────

export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type TicketCategory = 'payment' | 'booking' | 'order' | 'refund' | 'account' | 'other';

export interface TicketMessage {
  authorUserId: string | null;
  authorRole: 'user' | 'admin';
  authorName: string | null;
  body: string;
  createdAt: string | null;
}

export interface SupportTicket {
  id: string;
  ticketRef: string;
  raisedByUserId: string | null;
  raisedByRole: 'customer' | 'vendor';
  raisedByName: string | null;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  relatedType: string | null;
  relatedId: string | null;
  assignedTo: string | null;
  messages: TicketMessage[];
  lastMessageAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface NewTicketInput {
  subject: string;
  category: TicketCategory;
  message: string;
  relatedType?: string;
  relatedId?: string;
}

// ─── Vendor Support Service ────────────────────────────────────────────────────

export const VendorSupportService = {
  /** GET /vendor/support/tickets */
  listMyTickets(token: string): Promise<SupportTicket[]> {
    return apiGet<{ tickets: SupportTicket[] }>('vendor/support/tickets', token).then(
      (r) => r.tickets ?? [],
    );
  },

  /** POST /vendor/support/tickets */
  createTicket(input: NewTicketInput, token: string): Promise<SupportTicket> {
    return apiPost<{ ticket: SupportTicket }>('vendor/support/tickets', input, token).then(
      (r) => r.ticket,
    );
  },

  /** GET /vendor/support/tickets/:id */
  getTicket(id: string, token: string): Promise<SupportTicket> {
    return apiGet<{ ticket: SupportTicket }>(
      `vendor/support/tickets/${encodeURIComponent(id)}`,
      token,
    ).then((r) => r.ticket);
  },

  /** POST /vendor/support/tickets/:id/reply */
  replyToTicket(id: string, body: string, token: string): Promise<SupportTicket> {
    return apiPost<{ ticket: SupportTicket }>(
      `vendor/support/tickets/${encodeURIComponent(id)}/reply`,
      { body },
      token,
    ).then((r) => r.ticket);
  },
};
