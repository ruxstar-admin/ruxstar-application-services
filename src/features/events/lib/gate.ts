import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { DeskEvent, OfflineList, OfflineTicket, ScanOutcome, SyncScan } from '@/types/events';
import { istParts } from './events';

/** Sent to /sync in batches this size. */
export const SYNC_BATCH = 500;
/** How often the gate screen refreshes the live count while online. */
export const POLL_MS = 10_000;

export const sha256 = (text: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);

/** What the gate shows for each result: green to let in, amber when they're back, red to stop. */
export const OUTCOME: Record<ScanOutcome, { color: 'green' | 'amber' | 'red'; title: string }> = {
  ok: { color: 'green', title: 'Let them in' },
  inside: { color: 'amber', title: 'Already inside today' },
  wrong_event: { color: 'red', title: 'Wrong event' },
  wrong_day: { color: 'red', title: 'Not today' },
  cancelled: { color: 'red', title: 'Not valid' },
  unknown: { color: 'red', title: 'Not a ticket' },
};

export interface LocalResult {
  result: ScanOutcome;
  ticket: OfflineTicket | null;
  firstAt: string | null;
  message: string;
}

const time = (iso: string) => {
  const { time: hhmm } = istParts(iso);
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};

/**
 * Checks a ticket against the list saved on the phone, the same way the server would: once a day, amber when
 * they're already in (here or as the list said when it was saved), red when cancelled, not on the list, or not today.
 */
export function checkLocal(
  list: Pick<OfflineList, 'day' | 'tickets'>,
  ticket: OfflineTicket | undefined,
  { days, queue, now = new Date().toISOString() }: { days: string[]; queue: SyncScan[]; now?: string },
): LocalResult {
  if (!ticket) return { result: 'unknown', ticket: null, firstAt: null, message: 'Not on this event’s ticket list.' };
  if (ticket.s === 'x') return { result: 'cancelled', ticket, firstAt: null, message: 'This ticket was cancelled.' };
  const today = istParts(now).day;
  if (!days.includes(today)) return { result: 'wrong_day', ticket, firstAt: null, message: 'Not today.' };
  const server = list.day === today ? ticket.i : null;
  const here = queue.find((s) => s.ticketId === ticket.id && istParts(s.at).day === today)?.at ?? null;
  const firstAt = [server, here].filter((x): x is string => !!x).sort()[0] ?? null;
  if (firstAt) return { result: 'inside', ticket, firstAt, message: `Already inside since ${time(firstAt)}.` };
  return { result: 'ok', ticket, firstAt: null, message: `Welcome, ${ticket.n}.` };
}

/** A camera reads the same QR many times a second: true the first time, then false for that code for `ms`. */
export function repeatFilter(ms: number) {
  let last = { data: '', at: 0 };
  return (data: string) => {
    const now = Date.now();
    if (data === last.data && now - last.at < ms) return false;
    last = { data, at: now };
    return true;
  };
}

export const byHash = (list: OfflineList, hash: string) => list.tickets.find((t) => t.h === hash);
export const byCode = (list: OfflineList, code: string) => list.tickets.find((t) => t.c === code.trim().toUpperCase());

/** What was typed at the gate: a 10-digit mobile (with or without +91) or a six-letter code. */
export function lookupKind(text: string): { phone: string } | { code: string } | null {
  const digits = text.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  if (/^\d{10}$/.test(digits)) return { phone: digits };
  const code = text.replace(/\s/g, '').toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? { code } : null;
}

/** Tickets on the saved list for a mobile number or code; the list only keeps each phone's hash. */
export async function findOffline(list: OfflineList, text: string): Promise<OfflineTicket[]> {
  const kind = lookupKind(text);
  if (!kind) return [];
  if ('code' in kind) return list.tickets.filter((t) => t.c === kind.code);
  const hash = await sha256(kind.phone);
  return list.tickets.filter((t) => t.p === hash);
}

/** Check-ins saved on this phone today, from the list and from the queue. */
export function insideToday(list: OfflineList | null, queue: SyncScan[], now = new Date().toISOString()): number {
  if (!list) return 0;
  const today = istParts(now).day;
  const ids = new Set(list.day === today ? list.tickets.filter((t) => t.i).map((t) => t.id) : []);
  for (const s of queue) if (istParts(s.at).day === today) ids.add(s.ticketId);
  return ids.size;
}

const listKey = (eventId: string) => `gate:list:${eventId}`;
const queueKey = (eventId: string) => `gate:queue:${eventId}`;
const eventKey = (eventId: string) => `gate:event:${eventId}`;

async function read<T>(key: string): Promise<T | null> {
  try {
    const text = await AsyncStorage.getItem(key);
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

export const GateStore = {
  /** The event as last seen online, so the gate still opens without a connection. */
  event: (eventId: string) => read<DeskEvent>(eventKey(eventId)),
  saveEvent: (event: DeskEvent) => AsyncStorage.setItem(eventKey(event.id), JSON.stringify(event)),
  list: (eventId: string) => read<OfflineList>(listKey(eventId)),
  saveList: (list: OfflineList) => AsyncStorage.setItem(listKey(list.eventId), JSON.stringify(list)),
  queue: async (eventId: string) => (await read<SyncScan[]>(queueKey(eventId))) ?? [],
  saveQueue: (eventId: string, queue: SyncScan[]) => AsyncStorage.setItem(queueKey(eventId), JSON.stringify(queue)),
  /** Drops what the server has now: the first `count` in the queue. */
  dropSynced: async (eventId: string, count: number) => {
    const queue = (await read<SyncScan[]>(queueKey(eventId))) ?? [];
    await AsyncStorage.setItem(queueKey(eventId), JSON.stringify(queue.slice(count)));
  },
};
