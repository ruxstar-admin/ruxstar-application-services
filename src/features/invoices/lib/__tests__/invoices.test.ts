import type { Invoice, InvoiceLine } from '@/types/invoice';
import { csvName, financialYearToDate, indiaDay, kindNote, monthPeriod, pageInPeriod, pdfName, percent, recentMonths, taxRows } from '../invoices';

const line = (rateBps: number): InvoiceLine => ({
  description: 'Poster',
  code: '4911',
  codeKind: 'hsn',
  quantity: 1,
  unitPrice: 11800,
  discount: 0,
  rateBps,
  taxable: 10000,
  cgst: 900,
  sgst: 900,
  igst: 0,
  total: 11800,
});
const totals = { taxable: 10000, cgst: 900, sgst: 900, igst: 0, tax: 1800, total: 11800, ruxstarDiscount: 0, payable: 11800 };
const party = { name: 'Shop', legalName: null, gstin: null, address: null, state: null, stateCode: null };

describe('taxRows', () => {
  it('splits CGST and SGST in the same state, with half the rate each', () => {
    expect(taxRows({ supply: 'intra', totals, lines: [line(1800)] })).toEqual([
      { label: 'CGST 9%', amount: 900 },
      { label: 'SGST 9%', amount: 900 },
    ]);
  });

  it('shows IGST across states', () => {
    const inter = { ...totals, cgst: 0, sgst: 0, igst: 1800 };
    expect(taxRows({ supply: 'inter', totals: inter, lines: [line(1800)] })).toEqual([{ label: 'IGST 18%', amount: 1800 }]);
  });

  it('drops the rate when lines differ', () => {
    expect(taxRows({ supply: 'intra', totals, lines: [line(1800), line(500)] }).map((r) => r.label)).toEqual(['CGST', 'SGST']);
  });

  it('has no rows without tax', () => {
    expect(taxRows({ supply: 'intra', totals: { ...totals, tax: 0 }, lines: [line(0)] })).toEqual([]);
  });
});

describe('kindNote', () => {
  const base = { issuer: 'vendor' as const, role: 'supply' as const, seller: party, operatorPays: false };

  it('says a bill of supply is because the business has no GSTIN', () => {
    expect(kindNote({ ...base, kind: 'bill_of_supply' }, 'customer')).toBe("Bill of supply — this business isn't GST registered, so there's no GST on it.");
  });

  it('says an exempt sale has no GST', () => {
    expect(kindNote({ ...base, kind: 'bill_of_supply', seller: { ...party, gstin: '27AAPFU0939F1ZV' } }, 'customer')).toMatch(/no GST applies/);
  });

  it('words credit notes for each audience', () => {
    expect(kindNote({ ...base, kind: 'credit_note' }, 'customer')).toMatch(/^Credit note for your refund/);
    expect(kindNote({ ...base, kind: 'credit_note' }, 'vendor')).toMatch(/refund to the customer/);
  });

  it("names Ruxstar's fee", () => {
    expect(kindNote({ ...base, kind: 'tax_invoice', issuer: 'ruxstar', role: 'fee' }, 'customer')).toMatch(/platform fee/);
  });
});

describe('dates in India', () => {
  it('shows the India day, not the phone’s', () => {
    expect(indiaDay('2026-11-14T19:00:00.000Z')).toBe('15 Nov 2026');
  });

  it('lists recent months across a year end', () => {
    const now = Date.parse('2027-01-31T20:00:00.000Z');
    expect(recentMonths(now, 3)).toEqual([
      { key: '2027-02', label: 'Feb 2027' },
      { key: '2027-01', label: 'Jan 2027' },
      { key: '2026-12', label: 'Dec 2026' },
    ]);
  });

  it('turns a month into India-time bounds', () => {
    const p = monthPeriod('2026-02');
    expect(p.from).toBe('2026-02-01');
    expect(p.to).toBe('2026-02-28');
    expect(new Date(p.start).toISOString()).toBe('2026-01-31T18:30:00.000Z');
    expect(new Date(p.end).toISOString()).toBe('2026-02-28T18:30:00.000Z');
    expect(monthPeriod('2026-12').to).toBe('2026-12-31');
  });

  it('runs the financial year from April', () => {
    expect(financialYearToDate(Date.parse('2026-11-15T06:00:00.000Z'))).toMatchObject({ from: '2026-04-01', to: '2026-11-15', label: '2026-27 so far' });
    expect(financialYearToDate(Date.parse('2027-03-10T06:00:00.000Z'))).toMatchObject({ from: '2026-04-01', label: '2026-27 so far' });
  });
});

describe('names and numbers', () => {
  it('formats rates', () => {
    expect(percent(1800)).toBe('18%');
    expect(percent(250)).toBe('2.5%');
    expect(percent(50)).toBe('0.5%');
  });

  it('makes safe file names', () => {
    expect(pdfName('INV/26-27/00001')).toBe('INV-26-27-00001.pdf');
    expect(csvName({ from: '2026-11-01', to: '2026-11-30' })).toBe('ruxstar-gst-2026-11-01-to-2026-11-30.csv');
  });
});

describe('pageInPeriod', () => {
  const doc = (id: string, issuedAt: string) => ({ id, issuedAt } as Pick<Invoice, 'id' | 'issuedAt'>);
  const period = monthPeriod('2026-10');

  it('skips newer pages until it reaches the month', async () => {
    const pages: Record<string, { items: ReturnType<typeof doc>[]; nextCursor: string | null }> = {
      first: { items: [doc('a', '2026-11-10T10:00:00Z')], nextCursor: 'b' },
      b: { items: [doc('b', '2026-10-20T10:00:00Z'), doc('c', '2026-10-02T10:00:00Z')], nextCursor: 'c' },
    };
    const fetchPage = jest.fn((cursor?: string) => Promise.resolve(pages[cursor ?? 'first']));
    expect(await pageInPeriod(fetchPage, period)).toEqual({ items: [pages.b.items[0], pages.b.items[1]], nextCursor: 'c' });
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('stops once it is past the month', async () => {
    const fetchPage = jest.fn(() => Promise.resolve({ items: [doc('a', '2026-10-05T10:00:00Z'), doc('b', '2026-09-28T10:00:00Z')], nextCursor: 'more' }));
    expect(await pageInPeriod(fetchPage, period)).toEqual({ items: [doc('a', '2026-10-05T10:00:00Z')], nextCursor: null });
  });
});
