import type { CartLineInput, StoreQuote } from '@/types/store';

/** One variant in the cart, with what the product page showed so the cart can draw it offline. */
export interface CartLine {
  productId: string;
  variantId: string;
  title: string;
  options: { name: string; value: string }[];
  photoUrl: string | null;
  /** Paise, as last seen; checkout refreshes them from the quote. */
  price: number;
  mrp: number | null;
  /** Left when last seen. */
  stock: number;
  quantity: number;
}

/** One shop's cart. Orders are one shop at a time. */
export interface Cart {
  store: { id: string; name: string };
  lines: CartLine[];
}

/** Ruxstar's limits on one order: lines per order and how many of one variant. */
export interface CartLimits {
  maxLines: number;
  maxQuantity: number;
}

export type AddResult = { cart: Cart; capped: boolean } | { problem: 'other_store'; current: Cart['store'] } | { problem: 'too_many_lines'; max: number };

/** The most of one line that can be ordered: the stock, and Ruxstar's limit. */
export const lineMax = (line: Pick<CartLine, 'stock'>, limits: CartLimits) => Math.max(0, Math.min(line.stock, limits.maxQuantity));

/**
 * Adds a line, merging with the same variant. A cart from another shop isn't touched: `other_store` asks to start a new one,
 * and `replace` starts it. `capped` says the quantity was cut to the stock or Ruxstar's limit.
 */
export function addToCart(cart: Cart | null, store: Cart['store'], line: CartLine, limits: CartLimits, replace = false): AddResult {
  const base = cart && (cart.store.id === store.id || !cart.lines.length) ? cart : null;
  if (cart && !base && !replace) return { problem: 'other_store', current: cart.store };
  const lines = base?.lines ?? [];
  const existing = lines.find((l) => l.variantId === line.variantId);
  if (!existing && lines.length >= limits.maxLines) return { problem: 'too_many_lines', max: limits.maxLines };
  const want = (existing?.quantity ?? 0) + line.quantity;
  const max = lineMax(line, limits);
  const quantity = Math.min(want, max);
  const merged: CartLine = { ...line, quantity };
  const next = existing ? lines.map((l) => (l.variantId === line.variantId ? merged : l)) : [...lines, merged];
  return { cart: { store, lines: next.filter((l) => l.quantity > 0) }, capped: quantity < want };
}

/** Sets one line's quantity; it can't go up past its stock or Ruxstar's limit, and 0 removes it. Null once the cart is empty. */
export function setQuantity(cart: Cart, variantId: string, quantity: number, limits: CartLimits): Cart | null {
  const lines = cart.lines
    .map((l) => (l.variantId === variantId ? { ...l, quantity: Math.max(0, Math.min(quantity, Math.max(lineMax(l, limits), l.quantity))) } : l))
    .filter((l) => l.quantity > 0);
  return lines.length ? { ...cart, lines } : null;
}

export const removeLine = (cart: Cart, variantId: string): Cart | null => {
  const lines = cart.lines.filter((l) => l.variantId !== variantId);
  return lines.length ? { ...cart, lines } : null;
};

/** Pieces in the cart, for the cart button. */
export const cartCount = (cart: Cart | null | undefined) => cart?.lines.reduce((s, l) => s + l.quantity, 0) ?? 0;

/** Items at the prices last seen, and what the MRPs save. */
export function cartTotals(lines: readonly Pick<CartLine, 'price' | 'mrp' | 'quantity'>[]): { items: number; mrp: number; saved: number } {
  const items = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const mrp = lines.reduce((s, l) => s + Math.max(l.mrp ?? l.price, l.price) * l.quantity, 0);
  return { items, mrp, saved: mrp - items };
}

/** What the quote and the order take. */
export const linesOf = (cart: Cart): CartLineInput[] => cart.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity }));

/** The cart with the quote's prices, titles and stock, so it matches what the server charges. Lines the quote dropped stay as they were. */
export function withQuote(cart: Cart, quote: Pick<StoreQuote, 'lines'>): Cart {
  const lines = cart.lines.map((l) => {
    const q = quote.lines.find((x) => x.variantId === l.variantId);
    return q ? { ...l, title: q.title, options: q.options, price: q.unitPrice, mrp: q.mrp, stock: q.stock } : l;
  });
  return { ...cart, lines };
}

/** Lines that can't be bought as they are, from the quote: "Blue tee: only 2 left" or "sold out". */
export function shortLines(quote: Pick<StoreQuote, 'lines'>): string[] {
  return quote.lines.filter((l) => l.stock < l.quantity).map((l) => `${l.title}: ${l.stock > 0 ? `only ${l.stock} left` : 'sold out'}`);
}
