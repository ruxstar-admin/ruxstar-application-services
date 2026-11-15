import type { ProductOption, Variant } from '@/types/store';
import { addToCart, cartCount, cartTotals, linesOf, removeLine, setQuantity, shortLines, withQuote, type Cart, type CartLine } from '../cart';
import {
  areaText,
  deliveryFeeText,
  feeFor,
  linesText,
  methodsText,
  moveLabel,
  orderTimeline,
  percentOff,
  priceSpoken,
  returnSplit,
  returnWindowText,
  statusOf,
  tripPaidBy,
  tripText,
} from '../store';
import {
  bulkSet,
  combinations,
  firstPick,
  optionsText,
  pickValue,
  rowsOf,
  stockChanges,
  stockLine,
  syncRows,
  tableChanged,
  tableProblem,
  valueState,
  variantFor,
  variantsOf,
  type VariantRow,
} from '../variants';

const v = (id: string, values: string[], stock: number, price = 49900, mrp: number | null = 69900): Variant => ({ id, values, price, mrp, stock, sku: null });
const options: ProductOption[] = [
  { name: 'Size', values: ['S', 'M', 'L'] },
  { name: 'Colour', values: ['Blue', 'Black'] },
];
const tee = {
  options,
  variants: [v('sb', ['S', 'Blue'], 0), v('sk', ['S', 'Black'], 4), v('mb', ['M', 'Blue'], 2), v('mk', ['M', 'Black'], 0), v('lb', ['L', 'Blue'], 0)],
};

describe('variant picker', () => {
  it('starts on the first variant in stock and finds a variant by its values', () => {
    expect(firstPick(tee)).toEqual(['S', 'Black']);
    expect(variantFor(tee, ['M', 'Blue'])?.id).toBe('mb');
    expect(variantFor(tee, ['L', 'Black'])).toBeUndefined();
    expect(firstPick({ options: [], variants: [v('one', [], 3)] })).toEqual([]);
  });

  it('marks values sold out or not sold with what is picked before them', () => {
    expect(valueState(tee, [], 0, 'S')).toBe('ok');
    expect(valueState(tee, [], 0, 'L')).toBe('sold_out');
    expect(valueState(tee, ['S'], 1, 'Blue')).toBe('sold_out');
    expect(valueState(tee, ['L'], 1, 'Black')).toBe('missing');
    expect(valueState(tee, ['M'], 1, 'Blue')).toBe('ok');
  });

  it('moves the next option to a value in stock when the first changes', () => {
    expect(pickValue(tee, ['S', 'Black'], 0, 'M')).toEqual(['M', 'Blue']);
    expect(pickValue(tee, ['M', 'Blue'], 1, 'Black')).toEqual(['M', 'Black']);
    expect(pickValue(tee, ['S', 'Black'], 0, 'L')).toEqual(['L', 'Blue']);
  });

  it('says how many are left when few are', () => {
    expect(stockLine(0)).toBe('Out of stock');
    expect(stockLine(2)).toBe('Only 2 left');
    expect(stockLine(3)).toBe('Only 3 left');
    expect(stockLine(4)).toBeNull();
    expect(optionsText([{ name: 'Size', value: 'M' }, { name: 'Colour', value: 'Blue' }])).toBe('Size M · Colour Blue');
  });
});

describe('variant table', () => {
  const limits = { maxOptions: 2, maxValues: 10, maxVariants: 50 };
  const row = (values: string[], over: Partial<VariantRow> = {}): VariantRow => ({ values, on: true, price: '499', mrp: '699', stock: '5', sku: '', ...over });

  it('makes every combination of the values, or one row without options', () => {
    expect(combinations(options)).toHaveLength(6);
    expect(combinations(options)[1]).toEqual(['S', 'Black']);
    expect(combinations([])).toEqual([[]]);
  });

  it('keeps typed rows when a value is added, and starts the new ones off', () => {
    const before = syncRows([{ name: 'Size', values: ['S'] }], [row(['S'], { price: '450' })]);
    const after = syncRows([{ name: 'Size', values: ['S', 'M'] }], before);
    expect(after[0]).toMatchObject({ values: ['S'], price: '450', on: true });
    expect(after[1]).toMatchObject({ values: ['M'], on: false, price: '' });
  });

  it('turns every combination on with the old price when the first option is added', () => {
    const rows = syncRows([{ name: 'Size', values: ['S', 'M'] }], [row([], { price: '300', stock: '9' })]);
    expect(rows.map((r) => [r.values[0], r.on, r.price, r.stock])).toEqual([
      ['S', true, '300', ''],
      ['M', true, '300', ''],
    ]);
  });

  it('reads a saved product back with combinations it does not sell off', () => {
    const rows = rowsOf(tee);
    expect(rows).toHaveLength(6);
    expect(rows.find((r) => r.values.join() === 'L,Black')).toMatchObject({ on: false });
    expect(rows.find((r) => r.values.join() === 'M,Blue')).toMatchObject({ on: true, price: '499', mrp: '699', stock: '2' });
  });

  it('bulk sets only the rows that are on, and only the fields given', () => {
    const rows = bulkSet([row(['S']), row(['M'], { on: false, price: '' })], { price: '599', stock: '' });
    expect(rows[0]).toMatchObject({ price: '599', stock: '5' });
    expect(rows[1]).toMatchObject({ price: '' });
  });

  it('refuses a table that cannot be saved, naming the row', () => {
    expect(tableProblem(options, [row(['S', 'Blue'], { on: false })], limits)).toBe('Turn on at least one row to sell it.');
    expect(tableProblem(options, [row(['S', 'Blue'], { price: '0.5' })], limits)).toBe('S / Blue: enter a price from ₹1 to ₹1,00,000.');
    expect(tableProblem(options, [row(['S', 'Blue'], { mrp: '400' })], limits)).toBe("S / Blue: the MRP can't be less than the price.");
    expect(tableProblem(options, [row(['S', 'Blue'], { stock: '2.5' })], limits)).toMatch(/enter how many you have/);
    expect(tableProblem([{ name: 'Size', values: [] }], [row([])], limits)).toBe('Add a value to Size, like S or Blue.');
    expect(tableProblem([{ name: 'Size', values: ['S'] }, { name: 'size', values: ['M'] }], [row(['S', 'M'])], limits)).toBe('Two options have the same name.');
    expect(tableProblem(options, [row(['S', 'Blue'], { mrp: '' })], limits)).toBeNull();
  });

  it('sends the rows that are on, in paise', () => {
    expect(variantsOf([row(['S', 'Blue'], { sku: ' TEE-S ' }), row(['M', 'Blue'], { on: false })])).toEqual([
      { values: ['S', 'Blue'], price: 49900, mrp: 69900, stock: 5, sku: 'TEE-S' },
    ]);
    expect(variantsOf([row([], { mrp: '' })])).toEqual([{ price: 49900, mrp: null, stock: 5, sku: null }]);
  });

  it('notices whether the table changed', () => {
    expect(tableChanged(tee, options, rowsOf(tee))).toBe(false);
    expect(tableChanged(tee, options, bulkSet(rowsOf(tee), { stock: '7' }))).toBe(true);
    expect(tableChanged(tee, [options[0]!], rowsOf(tee))).toBe(true);
  });

  it('sends only the stock boxes that changed', () => {
    expect(stockChanges(tee.variants, { sb: '0', sk: '10', mb: '2' })).toEqual({ changes: [{ variantId: 'sk', stock: 10 }], valid: true });
    expect(stockChanges(tee.variants, { sk: 'x' }).valid).toBe(false);
  });
});

describe('cart', () => {
  const limits = { maxLines: 2, maxQuantity: 5 };
  const store = { id: 's1', name: 'Asha Clothing' };
  const line = (variantId: string, quantity: number, stock = 10): CartLine => ({
    productId: 'p1',
    variantId,
    title: 'Tee',
    options: [],
    photoUrl: null,
    price: 49900,
    mrp: 69900,
    stock,
    quantity,
  });
  const cartWith = (...lines: CartLine[]): Cart => ({ store, lines });

  it('starts a cart, and merges the same variant within its stock and the limit', () => {
    const first = addToCart(null, store, line('a', 2), limits);
    expect(first).toEqual({ cart: cartWith(line('a', 2)), capped: false });
    const again = addToCart(cartWith(line('a', 4)), store, line('a', 3), limits);
    expect(again).toEqual({ cart: cartWith(line('a', 5)), capped: true });
    expect(addToCart(null, store, line('b', 4, 3), limits)).toMatchObject({ cart: { lines: [{ quantity: 3 }] }, capped: true });
  });

  it('asks before switching shops, and starts over when told to', () => {
    const other = { id: 's2', name: 'Gift Box' };
    expect(addToCart(cartWith(line('a', 1)), other, line('g', 1), limits)).toEqual({ problem: 'other_store', current: store });
    expect(addToCart(cartWith(line('a', 1)), other, line('g', 1), limits, true)).toEqual({ cart: { store: other, lines: [line('g', 1)] }, capped: false });
  });

  it('stops at the most lines one order can have', () => {
    expect(addToCart(cartWith(line('a', 1), line('b', 1)), store, line('c', 1), limits)).toEqual({ problem: 'too_many_lines', max: 2 });
  });

  it('changes quantities without going over the stock, and empties when the last line goes', () => {
    expect(setQuantity(cartWith(line('a', 2, 3)), 'a', 9, limits)?.lines[0]?.quantity).toBe(3);
    expect(setQuantity(cartWith(line('a', 4, 1)), 'a', 3, limits)?.lines[0]?.quantity).toBe(3);
    expect(setQuantity(cartWith(line('a', 1)), 'a', 0, limits)).toBeNull();
    expect(removeLine(cartWith(line('a', 1), line('b', 1)), 'a')?.lines.map((l) => l.variantId)).toEqual(['b']);
  });

  it('counts pieces, totals the items and what the MRP saves', () => {
    const cart = cartWith(line('a', 2), { ...line('b', 1), price: 30000, mrp: null });
    expect(cartCount(cart)).toBe(3);
    expect(cartCount(null)).toBe(0);
    expect(cartTotals(cart.lines)).toEqual({ items: 129800, mrp: 169800, saved: 40000 });
    expect(linesOf(cart)).toEqual([
      { productId: 'p1', variantId: 'a', quantity: 2 },
      { productId: 'p1', variantId: 'b', quantity: 1 },
    ]);
  });

  it('takes prices and stock from the quote and lists lines short of stock', () => {
    const quote = { lines: [{ productId: 'p1', variantId: 'a', title: 'Tee', options: [], unitPrice: 45000, mrp: null, quantity: 2, total: 90000, stock: 1 }] };
    expect(withQuote(cartWith(line('a', 2)), quote).lines[0]).toMatchObject({ price: 45000, mrp: null, stock: 1 });
    expect(shortLines(quote)).toEqual(['Tee: only 1 left']);
    expect(shortLines({ lines: [{ ...quote.lines[0]!, stock: 0 }] })).toEqual(['Tee: sold out']);
  });
});

describe('prices and delivery', () => {
  it('works out the percent off the MRP', () => {
    expect(percentOff(69900, 99900)).toBe(30);
    expect(percentOff(69900, 69900)).toBeNull();
    expect(percentOff(69900, null)).toBeNull();
    expect(priceSpoken(69900, 99900, true)).toBe('From ₹699, MRP ₹999, 30% off');
  });

  it('prices delivery by km and says it in words', () => {
    const fee = { base: 4000, includedKm: 3, perKm: 1000 };
    expect(feeFor(fee, 2)).toBe(4000);
    expect(feeFor(fee, 5)).toBe(6000);
    expect(deliveryFeeText(fee)).toBe('₹40 for the first 3 km, then ₹10 a km');
    expect(deliveryFeeText({ base: 0, includedKm: 0, perKm: 0 })).toBe('Free delivery');
    expect(deliveryFeeText({ base: 3000, includedKm: 0, perKm: 0 })).toBe('₹30 delivery');
    expect(areaText({ radiusKm: 5 }, 'Bengaluru')).toBe('Delivers within 5 km');
    expect(areaText({ radiusKm: null }, 'Bengaluru')).toBe('Delivers anywhere in Bengaluru');
    expect(methodsText({ delivery: false, pickup: true })).toBe('Pickup only');
  });
});

describe('orders and returns', () => {
  const order = {
    method: 'delivery' as const,
    price: { items: 100000, delivery: 5000, discount: 10000 },
    lines: [
      { id: 'l1', unitPrice: 40000 },
      { id: 'l2', unitPrice: 20000 },
    ],
  };

  it('names the status, with returns and pickups in their own words', () => {
    expect(statusOf({ status: 'delivered', method: 'pickup', return: null }).label).toBe('Picked up');
    expect(statusOf({ status: 'delivered', method: 'delivery', return: { status: 'requested' } }).label).toBe('Return asked');
    expect(statusOf({ status: 'paid', method: 'delivery', return: null }).label).toBe('Waiting for the shop');
    expect(moveLabel('delivered', 'pickup')).toBe('Picked up');
    expect(moveLabel('accepted', 'delivery')).toBe('Accept order');
    expect(linesText([{ title: 'Tee' }, { title: 'Cap' }, { title: 'Bag' }])).toBe('Tee and 2 more');
  });

  it('shows the steps for delivery or pickup', () => {
    const steps = orderTimeline({ method: 'pickup', paidAt: '2026-11-15T05:00:00Z', timeline: [{ status: 'accepted', at: '2026-11-15T05:10:00Z' }] });
    expect(steps.map((s) => s.label)).toEqual(['Order placed', 'The shop accepted it', 'Packed', 'Ready for pickup', 'Picked up']);
    expect(steps[1]?.at).toBe('2026-11-15T05:10:00Z');
    expect(steps[2]?.at).toBeUndefined();
  });

  it('has the shop pay the trip back for wrong or damaged items', () => {
    expect(tripPaidBy('damaged')).toBe('shop');
    expect(tripPaidBy('changed_mind')).toBe('customer');
    expect(returnSplit(order, [{ lineId: 'l1', quantity: 1 }], 'wrong_item')).toEqual({ value: 40000, discount: 4000, tripFee: 0, amount: 36000 });
  });

  it('takes one delivery fee off when the customer pays the trip, but not for pickup', () => {
    expect(returnSplit(order, [{ lineId: 'l1', quantity: 1 }, { lineId: 'l2', quantity: 2 }], 'changed_mind')).toEqual({ value: 80000, discount: 8000, tripFee: 5000, amount: 67000 });
    expect(returnSplit({ ...order, method: 'pickup' }, [{ lineId: 'l2', quantity: 1 }], 'changed_mind').tripFee).toBe(0);
    expect(tripText('changed_mind', 'delivery', 5000)).toBe('The trip back costs one delivery fee, ₹50, taken off the refund.');
    expect(tripText('changed_mind', 'pickup', 5000)).toBe('Bring it back to the shop.');
  });

  it('counts down the return window', () => {
    const now = Date.parse('2026-11-15T10:00:00Z');
    expect(returnWindowText('2026-11-17T11:00:00Z', now)).toBe('2 days left to ask for a return');
    expect(returnWindowText('2026-11-15T15:30:00Z', now)).toBe('5 hours left to ask for a return');
    expect(returnWindowText('2026-11-15T10:20:00Z', now)).toBe('Less than an hour left to ask for a return');
    expect(returnWindowText('2026-11-15T09:00:00Z', now)).toBeNull();
    expect(returnWindowText(null, now)).toBeNull();
  });
});
