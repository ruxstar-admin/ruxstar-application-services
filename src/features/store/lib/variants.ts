import { paiseOf, rupeesText } from '@/features/vendor/lib/pod';
import type { ProductDetail, ProductOption, Variant, VariantInput } from '@/types/store';

/** ₹1,00,000 for one variant, and the most stock one can have, as the API allows. */
export const MAX_PRICE = 1_00_000_00;
export const MAX_STOCK = 100_000;

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

// The customer's picker.

type Sellable = Pick<ProductDetail, 'options' | 'variants'>;

/** The variant for one value of each option; undefined for a combination the shop doesn't sell. */
export const variantFor = (product: Pick<ProductDetail, 'variants'>, picked: readonly string[]) => product.variants.find((v) => same(v.values, picked));

/** Where the picker starts: the first variant in stock, or the first one. */
export function firstPick(product: Sellable): string[] {
  const v = product.variants.find((x) => x.stock > 0) ?? product.variants[0];
  return v ? [...v.values] : product.options.map((o) => o.values[0] ?? '');
}

/** `missing`: no variant has it with what's picked before it. `sold_out`: every one that has it is out of stock. */
export type ValueState = 'ok' | 'sold_out' | 'missing';

/** Whether `value` of option `index` can be bought with the values picked for the options before it. */
export function valueState(product: Sellable, picked: readonly string[], index: number, value: string): ValueState {
  const matching = product.variants.filter((v) => v.values[index] === value && v.values.slice(0, index).every((x, j) => x === picked[j]));
  if (!matching.length) return 'missing';
  return matching.some((v) => v.stock > 0) ? 'ok' : 'sold_out';
}

/** Picks a value; each later option keeps its value when it can still be bought, or moves to the first one that can. */
export function pickValue(product: Sellable, picked: readonly string[], index: number, value: string): string[] {
  const next = [...picked];
  next[index] = value;
  for (let j = index + 1; j < product.options.length; j += 1) {
    const values = product.options[j]!.values;
    if (valueState(product, next, j, next[j] ?? '') === 'ok') continue;
    next[j] = values.find((v) => valueState(product, next, j, v) === 'ok') ?? values.find((v) => valueState(product, next, j, v) !== 'missing') ?? next[j] ?? '';
  }
  return next;
}

/** "Only 2 left" when 1 to 3 are left, "Out of stock" at 0. */
export function stockLine(stock: number): string | null {
  if (stock <= 0) return 'Out of stock';
  return stock <= 3 ? `Only ${stock} left` : null;
}

/** "Size M · Colour Blue", or empty without options. */
export const optionsText = (options: readonly { name: string; value: string }[]) => options.map((o) => `${o.name} ${o.value}`).join(' · ');

/** A variant's values with their option names. */
export const namedValues = (options: readonly ProductOption[], values: readonly string[]) => options.map((o, i) => ({ name: o.name, value: values[i] ?? '' }));

// The owner's variant table.

/** One combination as typed in the table. Rupees are as typed; `on` means it's sold. */
export interface VariantRow {
  values: string[];
  on: boolean;
  price: string;
  mrp: string;
  stock: string;
  sku: string;
}

/** Every combination of the options' values, in their order; one empty combination without options. */
export function combinations(options: readonly ProductOption[]): string[][] {
  return options.reduce<string[][]>((acc, o) => acc.flatMap((prefix) => o.values.map((v) => [...prefix, v])), [[]]);
}

const keyOf = (values: readonly string[]) => values.join('\u0000');

const blankRow = (values: string[], on: boolean, from?: VariantRow): VariantRow => ({ values, on, price: from?.price ?? '', mrp: from?.mrp ?? '', stock: '', sku: '' });

/**
 * The table for these options. Rows already typed keep their numbers when values are added or moved. New combinations start
 * off, except when none of the old rows fit (the first option was just added): then they start on, with the old price.
 */
export function syncRows(options: readonly ProductOption[], rows: readonly VariantRow[]): VariantRow[] {
  const byKey = new Map(rows.map((r) => [keyOf(r.values), r]));
  const combos = combinations(options);
  const fresh = !combos.some((c) => byKey.has(keyOf(c)));
  const template = rows.find((r) => r.on) ?? rows[0];
  return combos.map((values) => byKey.get(keyOf(values)) ?? blankRow(values, fresh, fresh ? template : undefined));
}

/** The table for a saved product: its variants on, combinations it doesn't sell off. */
export function rowsOf(product: Pick<ProductDetail, 'options' | 'variants'>): VariantRow[] {
  const sold = new Map(product.variants.map((v) => [keyOf(v.values), v]));
  return combinations(product.options).map((values) => {
    const v = sold.get(keyOf(values));
    return v
      ? { values, on: true, price: rupeesText(v.price), mrp: rupeesText(v.mrp), stock: String(v.stock), sku: v.sku ?? '' }
      : blankRow(values, false);
  });
}

/** Sets price, MRP or stock on every row that is on. Empty fields in `patch` are left alone. */
export function bulkSet(rows: readonly VariantRow[], patch: { price?: string; mrp?: string; stock?: string }): VariantRow[] {
  const set = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined && v.trim() !== ''));
  return rows.map((r) => (r.on ? { ...r, ...set } : r));
}

const wholeOf = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : null);
const label = (values: readonly string[]) => (values.length ? values.join(' / ') : 'The product');

/** What's wrong with the options and table, in one sentence; null when it can be saved. */
export function tableProblem(options: readonly ProductOption[], rows: readonly VariantRow[], limits: { maxOptions: number; maxValues: number; maxVariants: number }): string | null {
  if (options.length > limits.maxOptions) return `Up to ${limits.maxOptions} option${limits.maxOptions === 1 ? '' : 's'}, like size and colour.`;
  for (const o of options) {
    if (!o.name.trim()) return 'Give every option a name, like Size or Colour.';
    if (!o.values.length) return `Add a value to ${o.name}, like S or Blue.`;
    if (o.values.length > limits.maxValues) return `${o.name} can have up to ${limits.maxValues} values.`;
  }
  if (new Set(options.map((o) => o.name.trim().toLowerCase())).size !== options.length) return 'Two options have the same name.';
  const on = rows.filter((r) => r.on);
  if (!on.length) return 'Turn on at least one row to sell it.';
  if (on.length > limits.maxVariants) return `Up to ${limits.maxVariants} rows can be on.`;
  for (const r of on) {
    const price = paiseOf(r.price);
    if (price === null || price < 100 || price > MAX_PRICE) return `${label(r.values)}: enter a price from ₹1 to ₹1,00,000.`;
    const mrp = paiseOf(r.mrp);
    if (r.mrp.trim() && (mrp === null || mrp > MAX_PRICE)) return `${label(r.values)}: enter an MRP up to ₹1,00,000, or leave it empty.`;
    if (mrp !== null && mrp < price) return `${label(r.values)}: the MRP can't be less than the price.`;
    const stock = wholeOf(r.stock);
    if (stock === null || stock > MAX_STOCK) return `${label(r.values)}: enter how many you have, from 0 to ${MAX_STOCK.toLocaleString('en-IN')}.`;
    if (r.sku.trim().length > 40) return `${label(r.values)}: the SKU can be up to 40 characters.`;
  }
  return null;
}

/** The rows that are on, as the API takes them. Call after `tableProblem` comes back null. */
export function variantsOf(rows: readonly VariantRow[]): VariantInput[] {
  return rows
    .filter((r) => r.on)
    .map((r) => ({
      ...(r.values.length ? { values: r.values } : {}),
      price: paiseOf(r.price) ?? 0,
      mrp: paiseOf(r.mrp),
      stock: wholeOf(r.stock) ?? 0,
      sku: r.sku.trim() || null,
    }));
}

/** Whether the options or the table differ from the saved product, so the update needs to send them. */
export function tableChanged(product: Pick<ProductDetail, 'options' | 'variants'>, options: readonly ProductOption[], rows: readonly VariantRow[]): boolean {
  const optionsSame = product.options.length === options.length && product.options.every((o, i) => o.name === options[i]!.name && same(o.values, options[i]!.values));
  if (!optionsSame) return true;
  const next = variantsOf(rows);
  if (next.length !== product.variants.length) return true;
  return next.some((v) => {
    const was = product.variants.find((x) => same(x.values, v.values ?? []));
    return !was || was.price !== v.price || was.mrp !== v.mrp || was.stock !== v.stock || (was.sku ?? null) !== v.sku;
  });
}

/** The stock quick edit: only the variants whose number changed, and whether every box holds a whole number. */
export function stockChanges(variants: readonly Variant[], typed: Readonly<Record<string, string>>): { changes: { variantId: string; stock: number }[]; valid: boolean } {
  const changes: { variantId: string; stock: number }[] = [];
  let valid = true;
  for (const v of variants) {
    const text = typed[v.id];
    if (text === undefined) continue;
    const n = wholeOf(text);
    if (n === null || n > MAX_STOCK) {
      valid = false;
      continue;
    }
    if (n !== v.stock) changes.push({ variantId: v.id, stock: n });
  }
  return { changes, valid };
}
