import { istParts } from '@/lib/dates';
import type { Page } from '@/types/social';
import type { Invoice, InvoiceAudience, InvoiceKind, InvoiceRef } from '@/types/invoice';

export const KIND_LABEL: Record<InvoiceKind, string> = {
  tax_invoice: 'Tax invoice',
  bill_of_supply: 'Bill of supply',
  credit_note: 'Credit note',
};

export const KIND_TONE: Record<InvoiceKind, 'accent' | 'neutral' | 'warning'> = {
  tax_invoice: 'accent',
  bill_of_supply: 'neutral',
  credit_note: 'warning',
};

export const KIND_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'tax_invoice', label: 'Tax invoices' },
  { key: 'bill_of_supply', label: 'Bills of supply' },
  { key: 'credit_note', label: 'Credit notes' },
] as const satisfies readonly { key: InvoiceKind | 'all'; label: string }[];

/** 1800 -> "18%", 250 -> "2.5%". */
export const percent = (bps: number) => `${Number((bps / 100).toFixed(2))}%`;

/** "Tax invoice INV/26-27/00001", and whose it is when it is Ruxstar's platform fee. */
export const refTitle = (ref: Pick<InvoiceRef, 'kind' | 'role'>) => (ref.role === 'fee' ? `${KIND_LABEL[ref.kind]} · Ruxstar platform fee` : KIND_LABEL[ref.kind]);

/** What the document is, in a sentence, for the person looking at it. */
export function kindNote(invoice: Pick<Invoice, 'kind' | 'issuer' | 'role' | 'seller' | 'operatorPays'>, audience: InvoiceAudience): string {
  const ruxstar = invoice.issuer === 'ruxstar';
  if (invoice.kind === 'credit_note') {
    if (audience === 'customer') return 'Credit note for your refund. It reduces the invoice below by the amount refunded.';
    if (audience === 'vendor') return 'Credit note for a refund to the customer. It reduces the invoice below for your GST return.';
    return 'Credit note for a refund. It reduces the invoice below.';
  }
  if (invoice.kind === 'bill_of_supply') {
    if (invoice.seller.gstin) return 'Bill of supply — no GST applies to this sale.';
    return ruxstar
      ? "Bill of supply — Ruxstar isn't GST registered yet, so there's no GST on it."
      : "Bill of supply — this business isn't GST registered, so there's no GST on it.";
  }
  if (invoice.role === 'fee') return "Tax invoice for Ruxstar's platform fee, with GST.";
  if (ruxstar || invoice.operatorPays) return 'Tax invoice from Ruxstar, which sells this on the business’s behalf and pays the GST.';
  return 'Tax invoice from the business, with GST. Ruxstar is shown as the e-commerce operator.';
}

/** The GST split: CGST and SGST in the same state, IGST across states. Each with its rate when every line shares one. */
export function taxRows(invoice: Pick<Invoice, 'supply' | 'totals' | 'lines'>): { label: string; amount: number }[] {
  if (!invoice.totals.tax) return [];
  const rates = [...new Set(invoice.lines.filter((l) => l.rateBps > 0).map((l) => l.rateBps))];
  const rate = rates.length === 1 ? rates[0] : null;
  if (invoice.supply === 'inter') return [{ label: rate ? `IGST ${percent(rate)}` : 'IGST', amount: invoice.totals.igst }];
  const half = rate ? ` ${percent(rate / 2)}` : '';
  return [
    { label: `CGST${half}`, amount: invoice.totals.cgst },
    { label: `SGST${half}`, amount: invoice.totals.sgst },
  ];
}

export const supplyLine = (invoice: Pick<Invoice, 'supply' | 'placeOfSupply'>) => {
  const where = invoice.placeOfSupply ? `${invoice.placeOfSupply.state} (${invoice.placeOfSupply.code})` : 'Not known';
  return `${where} · ${invoice.supply === 'inter' ? 'another state, so IGST' : 'same state, so CGST + SGST'}`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const pad = (n: number) => String(n).padStart(2, '0');

/** "15 Nov 2026", the day in India. */
export function indiaDay(iso: string): string {
  const [y, m, d] = istParts(iso).day.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export interface Month {
  /** YYYY-MM */
  key: string;
  /** "Nov 2026" */
  label: string;
}

/** This month and the `count - 1` before it, newest first, by India's calendar. */
export function recentMonths(now: number, count: number): Month[] {
  const [y, m] = istParts(new Date(now).toISOString()).day.split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const index = y * 12 + (m - 1) - i;
    const year = Math.floor(index / 12);
    const month = index % 12;
    return { key: `${year}-${pad(month + 1)}`, label: `${MONTHS[month]} ${year}` };
  });
}

export interface Period {
  /** YYYY-MM-DD, India time, both days included. */
  from: string;
  to: string;
  /** Instants: `start` included, `end` not. */
  start: number;
  end: number;
  label: string;
}

/** A YYYY-MM month in India time. */
export function monthPeriod(key: string): Period {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const next = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
  return {
    from: `${key}-01`,
    to: `${key}-${pad(last)}`,
    start: Date.parse(`${key}-01T00:00:00+05:30`),
    end: Date.parse(`${next}-01T00:00:00+05:30`),
    label: `${MONTHS[m - 1]} ${y}`,
  };
}

/** The Indian financial year (April to March) up to today, for an export when no month is picked. */
export function financialYearToDate(now: number): Period {
  const today = istParts(new Date(now).toISOString()).day;
  const [y, m] = today.split('-').map(Number);
  const first = m >= 4 ? y : y - 1;
  return {
    from: `${first}-04-01`,
    to: today,
    start: Date.parse(`${first}-04-01T00:00:00+05:30`),
    end: Date.parse(`${today}T00:00:00+05:30`) + 86_400_000,
    label: `${first}-${pad((first + 1) % 100)} so far`,
  };
}

export const csvName = (period: Pick<Period, 'from' | 'to'>) => `ruxstar-gst-${period.from}-to-${period.to}.csv`;
export const pdfName = (number: string) => `${number.replace(/[\\/:*?"<>|]/g, '-')}.pdf`;

/** Pages fetched at most per call while looking for a month's documents. */
const MAX_PAGES = 10;

/**
 * One page of documents issued within `period`. The API lists newest first without a date filter, so this walks pages
 * until it finds some in the month, and stops once it is past the month's start.
 */
export async function pageInPeriod<T extends { issuedAt: string }>(
  fetchPage: (cursor?: string) => Promise<Page<T>>,
  period: Pick<Period, 'start' | 'end'>,
  cursor?: string,
): Promise<Page<T>> {
  let next = cursor;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await fetchPage(next);
    const items = page.items.filter((x) => {
      const at = Date.parse(x.issuedAt);
      return at >= period.start && at < period.end;
    });
    const last = page.items[page.items.length - 1];
    if (page.nextCursor === null || (last && Date.parse(last.issuedAt) < period.start)) return { items, nextCursor: null };
    if (items.length) return { items, nextCursor: page.nextCursor };
    next = page.nextCursor;
  }
  return { items: [], nextCursor: next ?? null };
}
