import { apiGet, apiGetPage, apiPatch, apiPost, apiPostBytes, apiPut } from '@/lib/api-client';
import type {
  NewTicket,
  QueueFilter,
  SlaHours,
  StaffReply,
  StaffTicket,
  StaffTicketDetail,
  SupportAgent,
  SupportSettings,
  SupportSummary,
  Ticket,
  TicketDetail,
  TicketPatch,
} from '@/types/support';

const PHOTO_TIMEOUT_MS = 60_000;
const ticket = (id: string) => `/v1/support/tickets/${encodeURIComponent(id)}`;
const desk = (id: string) => `/v1/ruxstar/support/tickets/${encodeURIComponent(id)}`;
const keyed = (idempotencyKey: string) => ({ idempotencyKey });

/**
 * Your help tickets, `/v1/support`. `token` is the session's, or the support pass a login gives an account on hold.
 * Every write answers with the whole ticket.
 */
export const SupportService = {
  list: (token: string, cursor?: string) => apiGetPage<Ticket>('/v1/support/tickets', token, { cursor }),
  /** Opening it marks Ruxstar's replies read. */
  get: (token: string, id: string) => apiGet<TicketDetail>(ticket(id), token),
  /** Up to 5 open at once. A context must be yours, except a post. */
  create: (token: string, body: NewTicket, key: string) => apiPost<TicketDetail>('/v1/support/tickets', { ...body }, token, keyed(key)),
  /** Replying to a resolved ticket reopens it, for 7 days. */
  reply: (token: string, id: string, text: string, key: string) => apiPost<TicketDetail>(`${ticket(id)}/messages`, { text }, token, keyed(key)),
  /** A JPEG on your own message, up to 3, within 30 minutes of sending it. */
  addPhoto: (token: string, id: string, messageId: string, jpeg: Uint8Array<ArrayBuffer>, key: string) =>
    apiPostBytes<TicketDetail>(`${ticket(id)}/messages/${encodeURIComponent(messageId)}/photos`, { data: jpeg, type: 'image/jpeg' }, token, {
      headers: { 'Idempotency-Key': key },
      timeoutMs: PHOTO_TIMEOUT_MS,
    }),
  resolve: (token: string, id: string, key: string) => apiPost<TicketDetail>(`${ticket(id)}/resolve`, undefined, token, keyed(key)),
};

/** The console's help desk, `/v1/ruxstar/support`. Seeing it needs `support.view`; answering, `support.manage`. */
export const SupportDeskService = {
  queue: (token: string, filter: QueueFilter, cursor?: string) => apiGetPage<StaffTicket>('/v1/ruxstar/support/tickets', token, { ...filter, cursor }),
  summary: (token: string) => apiGet<SupportSummary>('/v1/ruxstar/support/summary', token),
  agents: (token: string) => apiGet<SupportAgent[]>('/v1/ruxstar/support/agents', token),
  get: (token: string, id: string) => apiGet<StaffTicketDetail>(desk(id), token),
  /** A reply goes to the customer and the ticket waits on them; a note stays with the team. */
  reply: (token: string, id: string, body: StaffReply, key: string) => apiPost<StaffTicketDetail>(`${desk(id)}/messages`, { ...body }, token, keyed(key)),
  update: (token: string, id: string, patch: TicketPatch, key: string) => apiPatch<StaffTicketDetail>(desk(id), { ...patch }, token, keyed(key)),
  settings: (token: string) => apiGet<SupportSettings>('/v1/ruxstar/support/settings', token),
  saveSettings: (token: string, hours: SlaHours, key: string) => apiPut<SupportSettings>('/v1/ruxstar/support/settings', token, { hours }, keyed(key)),
};
