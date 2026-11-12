import { money, titleCase } from '@/features/vendor/lib/pod';
import type { ShopCard, ShopPhoto, ShopProduct } from '@/types/shop';

/** "From ₹2/page", or null while a shop has no price a customer can pay. */
export function fromLine(shop: Pick<ShopCard, 'fromPrice' | 'fromUnit'>): string | null {
  if (shop.fromPrice == null) return null;
  return `From ${money(shop.fromPrice)}/${shop.fromUnit === 'page' ? 'page' : 'unit'}`;
}

export const readyLine = (days: number) => (days <= 1 ? 'Ready in 1 day' : `Ready in ${days} days`);

export const placeLine = (shop: Pick<ShopCard, 'area' | 'city'>) => [shop.area, shop.city].filter(Boolean).join(', ');

/** Cards carry no city list, so they say the shop's own city. */
export function deliveryLine(shop: Pick<ShopCard, 'deliversEverywhere' | 'city'> & { cities?: string[] }): string {
  if (shop.deliversEverywhere) return 'Delivers everywhere';
  if (!shop.cities?.length) return `Delivers in ${shop.city}`;
  return `Delivers to ${shop.cities.map(titleCase).join(', ')}`;
}

/** The narrowest copy at least `width` pixels wide, so a card does not download the full photo. */
export function photoFor(photo: ShopPhoto, width: number): string {
  return photo.smaller.find((s) => s.width >= width)?.url ?? photo.url;
}

/** What a product costs, in the words a customer reads on the shop page. */
export function productPrice(product: ShopProduct): string {
  if (product.pricing === 'per_page') {
    const parts = [product.bw ? `B/W ${money(product.bw)}` : null, product.color ? `Colour ${money(product.color)}` : null].filter(Boolean);
    return `${parts.join(' · ')} a page`;
  }
  return product.basePrice ? `${money(product.basePrice)} each` : '';
}

const COVER_COLOURS: readonly [string, string][] = [
  ['#7C3AED', '#32B2FA'],
  ['#B45CF2', '#FF6B8B'],
  ['#0EA5E9', '#22C55E'],
  ['#F59E0B', '#EF4444'],
  ['#6366F1', '#B45CF2'],
];

/** A shop with no photo still gets its own colours, picked from its name so they stay the same everywhere. */
export function coverColours(name: string): [string, string] {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COVER_COLOURS[hash % COVER_COLOURS.length];
}

export const initialOf = (name: string) => name.trim().charAt(0).toUpperCase() || 'R';
