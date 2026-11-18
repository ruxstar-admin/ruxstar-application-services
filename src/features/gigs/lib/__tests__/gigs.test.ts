import type { GigOrder } from '@/types/gigs';
import {
  cardPriceLine,
  categoryLabel,
  deadlineText,
  deliveryLine,
  isOpenOrder,
  maxPartRefund,
  orderPrice,
  orderStatus,
  orderTimeline,
  packageLine,
  pickPackage,
  quoteBadge,
  quoteNote,
  quoteStatus,
  sortedPackages,
  timeLeftText,
} from '../gigs';

const NOW = Date.parse('2026-11-18T10:00:00.000Z');
const inHours = (h: number) => new Date(NOW + h * 3_600_000).toISOString();

const order = (over: Partial<GigOrder> = {}): GigOrder => ({
  id: 'o1',
  orderNo: 40000001,
  status: 'in_progress',
  role: 'customer',
  title: 'A logo for my café',
  category: 'design',
  gigId: 'g1',
  quoteId: null,
  freelancer: { businessId: 'b1', userId: 'u2', username: 'asha', name: 'Asha', avatarUrl: null },
  customer: { id: 'u1', name: 'Ravi' },
  package: { tier: 'basic', name: 'Basic', description: 'One logo', deliveryDays: 3, revisions: 2 },
  answers: [],
  files: [],
  note: null,
  price: { items: 150000, discount: 0, platformFee: 1000, total: 151000 },
  coupon: null,
  share: 135000,
  refunds: [],
  payBy: null,
  paidAt: '2026-11-17T09:05:00.000Z',
  acceptBy: null,
  acceptedAt: '2026-11-17T10:00:00.000Z',
  dueAt: inHours(30),
  late: false,
  revisions: { included: 2, used: 0, left: 2 },
  deliveries: [],
  autoCompleteAt: null,
  completedAt: null,
  dispute: null,
  cancellation: null,
  timeline: [
    { status: 'awaiting_payment', at: '2026-11-17T09:00:00.000Z', by: 'customer' },
    { status: 'paid', at: '2026-11-17T09:05:00.000Z', by: 'system' },
    { status: 'in_progress', at: '2026-11-17T10:00:00.000Z', by: 'vendor' },
  ],
  filesDeleted: false,
  can: { pay: false, cancel: false, accept: false, decline: false, deliver: false, approve: false, revise: false, report: false },
  invoices: [],
  createdAt: '2026-11-17T09:00:00.000Z',
  ...over,
});

describe('orderStatus', () => {
  it('words the badge for whoever is looking', () => {
    expect(orderStatus({ status: 'paid', role: 'customer', late: false }).label).toBe('Waiting for the freelancer');
    expect(orderStatus({ status: 'paid', role: 'freelancer', late: false }).label).toBe('New: accept or decline');
  });
  it('says late only while work is owed', () => {
    expect(orderStatus({ status: 'in_progress', role: 'customer', late: true })).toEqual({ label: 'Late', tone: 'error' });
    expect(orderStatus({ status: 'delivered', role: 'customer', late: true }).label).toBe('Delivered: check it');
  });
  it('knows which orders are done with', () => {
    expect(isOpenOrder('disputed')).toBe(true);
    expect(isOpenOrder('completed')).toBe(false);
    expect(isOpenOrder('cancelled')).toBe(false);
  });
});

describe('packages', () => {
  const packages = [{ tier: 'premium' as const }, { tier: 'basic' as const }, { tier: 'standard' as const }];
  it('sorts Basic, Standard, Premium', () => {
    expect(sortedPackages(packages).map((p) => p.tier)).toEqual(['basic', 'standard', 'premium']);
  });
  it('picks the one asked for, else the first', () => {
    expect(pickPackage(packages, 'standard')?.tier).toBe('standard');
    expect(pickPackage(packages, 'gold')?.tier).toBe('basic');
    expect(pickPackage([], 'basic')).toBeUndefined();
  });
  it('writes the lines', () => {
    expect(deliveryLine({ deliveryDays: 1, revisions: 0 })).toBe('1 day delivery · No revisions');
    expect(deliveryLine({ deliveryDays: 3, revisions: 2 })).toBe('3 days delivery · 2 revisions');
    expect(cardPriceLine({ priceFrom: 150000, fastestDays: 2 })).toBe('From ₹1,500 · 2 days');
    expect(packageLine(order())).toBe('Basic · 3 days · 2 revisions');
    expect(packageLine(order({ quoteId: 'q1' }))).toBe('Custom offer · 3 days · 2 revisions');
  });
});

describe('orderPrice', () => {
  it('takes the discount off the package and adds the fee', () => {
    expect(orderPrice(150000, 1000, 20000)).toEqual({ items: 150000, discount: 20000, platformFee: 1000, total: 131000 });
  });
  it('never discounts below nothing', () => {
    expect(orderPrice(10000, 500, 50000).total).toBe(500);
    expect(orderPrice(10000, 500, -10).discount).toBe(0);
  });
});

describe('maxPartRefund', () => {
  it('is the share, short of the whole payment', () => {
    expect(maxPartRefund({ share: 135000, price: order().price, refunds: [] })).toBe(135000);
    expect(maxPartRefund({ share: 200000, price: order().price, refunds: [] })).toBe(150999);
  });
  it('counts refunds already made and never goes negative', () => {
    expect(maxPartRefund({ share: 135000, price: order().price, refunds: [{ kind: 'part', amount: 100000, status: 'done', reason: null, at: inHours(-1) }] })).toBe(50999);
    expect(maxPartRefund({ share: null, price: order().price, refunds: [] })).toBe(0);
  });
});

describe('time left', () => {
  it('reads hours, then days, then nothing once past', () => {
    expect(timeLeftText(inHours(0.5), NOW)).toBe('Less than an hour left');
    expect(timeLeftText(inHours(1.5), NOW)).toBe('1 hour left');
    expect(timeLeftText(inHours(30), NOW)).toBe('30 hours left');
    expect(timeLeftText(inHours(72), NOW)).toBe('3 days left');
    expect(timeLeftText(inHours(-1), NOW)).toBeNull();
  });
  it('gives the next deadline for the status', () => {
    expect(deadlineText(order({ status: 'paid', acceptBy: inHours(5) }), NOW)).toBe('5 hours left to accept');
    expect(deadlineText(order(), NOW)).toBe('Due: 30 hours left');
    expect(deadlineText(order({ late: true }), NOW)).toBe('Past its due date');
    expect(deadlineText(order({ status: 'delivered', autoCompleteAt: inHours(72) }), NOW)).toBe('Completes by itself: 3 days left');
    expect(deadlineText(order({ status: 'completed' }), NOW)).toBeNull();
  });
});

describe('quotes', () => {
  it('reads an open offer past its time as expired', () => {
    expect(quoteStatus({ status: 'open', expiresAt: inHours(-1) }, NOW)).toBe('expired');
    expect(quoteStatus({ status: 'paid', expiresAt: inHours(-1) }, NOW)).toBe('paid');
    expect(quoteBadge({ status: 'open', expiresAt: inHours(10) }, NOW).label).toBe('Open');
  });
  it('says what is next under the card', () => {
    expect(quoteNote({ status: 'open', expiresAt: inHours(72) }, NOW)).toBe('3 days left to pay');
    expect(quoteNote({ status: 'open', expiresAt: inHours(-2) }, NOW)).toBe('This offer has expired.');
    expect(quoteNote({ status: 'withdrawn', expiresAt: inHours(10) }, NOW)).toBe('The freelancer withdrew this offer.');
    expect(quoteNote({ status: 'paid', expiresAt: inHours(10) }, NOW)).toBe('Paid. The order has started.');
  });
});

describe('orderTimeline', () => {
  it('shows each delivery and the changes asked for', () => {
    const steps = orderTimeline(
      order({
        status: 'delivered',
        deliveries: [
          { id: 'd1', message: 'v1', links: [], files: [], at: inHours(-20), answer: { kind: 'revision', note: 'Bigger', at: inHours(-10) } },
          { id: 'd2', message: 'v2', links: [], files: [], at: inHours(-2), answer: null },
        ],
      }),
    );
    expect(steps.map((s) => s.label)).toEqual(['Paid', 'The freelancer accepted', 'Delivered', 'Changes asked for', 'Delivered again (2)', 'Completed']);
    expect(steps[5]?.at).toBeUndefined();
  });
  it('dates the first step when it was paid, not when it was placed', () => {
    expect(orderTimeline(order())[0]).toMatchObject({ label: 'Paid', at: '2026-11-17T09:05:00.000Z' });
  });
  it('ends with the cancellation', () => {
    const steps = orderTimeline(order({ status: 'cancelled', acceptedAt: null, cancellation: { by: 'system', reason: 'Not accepted', at: inHours(-1) } }));
    expect(steps.map((s) => s.label)).toEqual(['Paid', 'Cancelled by Ruxstar']);
  });
  it('says the freelancer declined it', () => {
    const steps = orderTimeline(order({ status: 'cancelled', acceptedAt: null, cancellation: { by: 'vendor', reason: 'Fully booked', at: inHours(-1) } }));
    expect(steps.map((s) => s.label)).toEqual(['Paid', 'Declined']);
  });
  it('says when it completed by itself', () => {
    const at = inHours(-1);
    const steps = orderTimeline(order({ status: 'completed', completedAt: at, timeline: [...order().timeline, { status: 'completed', at, by: 'system' }] }));
    expect(steps[steps.length - 1]).toMatchObject({ label: 'Completed by itself', at });
  });
  it('ends with the decision for a disputed order', () => {
    const steps = orderTimeline(order({ status: 'disputed', quoteId: 'q1', dispute: { reason: 'Not what I asked', openedAt: inHours(-1), ticketId: 't1', decision: null } }));
    expect(steps.map((s) => s.label)).toEqual(['Offer paid', 'The freelancer started', 'Delivered', 'Problem reported', 'Ruxstar decided']);
  });
  it('leaves the paid step undated until it is paid', () => {
    expect(orderTimeline(order({ status: 'awaiting_payment', paidAt: null, acceptedAt: null }))[0]?.at).toBeUndefined();
  });
});

describe('categoryLabel', () => {
  it('uses the rules, or tidies the key', () => {
    expect(categoryLabel([{ key: 'design', label: 'Graphic and logo design' }], 'design')).toBe('Graphic and logo design');
    expect(categoryLabel([], 'video_editing')).toBe('Video editing');
  });
});
