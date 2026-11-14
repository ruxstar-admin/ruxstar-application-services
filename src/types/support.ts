/** Help tickets, `/v1/support`, and the console's help desk, `/v1/ruxstar/support` (Architecture decision 60). */

export type SupportCategory = 'orders' | 'refunds' | 'verification' | 'business' | 'delivery' | 'account' | 'safety' | 'app' | 'other';
export type SupportPriority = 'urgent' | 'high' | 'normal' | 'low';
/** `waiting` is waiting on the customer. A resolved ticket can be reopened by replying for 7 days, then it is `closed`. */
export type SupportStatus = 'open' | 'waiting' | 'resolved' | 'closed';
export type SupportContextType = 'order' | 'business' | 'verification' | 'post' | 'coupon' | 'delivery';

/** What a ticket is about. Verification ids are the track, `base` or `delivery`; delivery ids are a delivery job's, from the delivery app. */
export interface SupportContextRef {
  type: SupportContextType;
  id: string;
}

export interface SupportContext extends SupportContextRef {
  /** For example `Order #1042`. */
  label: string;
}

/** Signed links that work for 10 minutes. */
export interface SupportPhoto {
  id: string;
  url: string;
}

export interface SupportMessage {
  id: string;
  from: 'customer' | 'staff';
  text: string;
  photos: SupportPhoto[];
  at: string;
  mine: boolean;
}

export interface Ticket {
  id: string;
  /** For example `RX-1042`. */
  number: string;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  context: SupportContext | null;
  createdAt: string;
  lastAt: string;
  resolvedAt: string | null;
  reopenUntil: string | null;
  /** Ruxstar replied since the customer last opened it. */
  unread: boolean;
}

export interface TicketDetail extends Ticket {
  messages: SupportMessage[];
}

export interface NewTicket {
  category: SupportCategory;
  subject: string;
  text: string;
  context?: SupportContextRef;
}

/** What a login answers for an account on hold: a short pass that only opens help tickets. */
export interface SupportPass {
  token: string;
  expiresAt: string;
  message: string;
}

// The console.

export interface StaffMessage extends Omit<SupportMessage, 'mine'> {
  /** A staff note the customer never sees. */
  internal: boolean;
  author: { id: string; name: string };
}

export interface StaffTicket extends Omit<Ticket, 'unread' | 'context'> {
  context: (SupportContext & { state: string | null; kycCaseId: string | null }) | null;
  priority: SupportPriority;
  assignee: { id: string; name: string } | null;
  requester: { id: string; name: string; username: string; status: 'active' | 'locked' | 'deleted' };
  slaDueAt: string | null;
  /** Waiting for Ruxstar past its reply-by time. */
  overdue: boolean;
  lastFrom: 'customer' | 'staff';
}

export interface StaffTicketDetail extends StaffTicket {
  messages: StaffMessage[];
}

export type QueueStatus = 'open' | 'waiting' | 'resolved';

export interface QueueFilter {
  status: QueueStatus;
  category?: SupportCategory;
  assignee?: 'me' | 'none';
  q?: string;
}

export interface StaffReply {
  text: string;
  internal?: boolean;
  /** Where the ticket goes after a reply. Defaults to `waiting`; notes leave it as it is. */
  status?: QueueStatus;
}

export interface TicketPatch {
  status?: QueueStatus;
  priority?: SupportPriority;
  category?: SupportCategory;
  assigneeId?: string | null;
}

export interface SupportAgent {
  id: string;
  name: string;
  title: string;
}

export interface SupportSummary {
  open: number;
  waiting: number;
  overdue: number;
  unassigned: number;
  mine: number;
}

/** Hours Ruxstar has to answer, by priority (1 to 336). */
export type SlaHours = Record<SupportPriority, number>;

export interface SupportSettings {
  hours: SlaHours;
  updatedAt: string | null;
}
