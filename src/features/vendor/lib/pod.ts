import type { BusinessLocation, PodPrice, PodSetup } from '@/types/business';

export const OPTION_LABELS: Record<string, string> = {
  size: 'Size',
  material: 'Material',
  printType: 'Print type',
  color: 'Colour',
  sides: 'Sides',
  paperSize: 'Paper size',
  binding: 'Binding',
  doubleSided: 'Double-sided',
};

/** 12550 paise → "125.50"; whole rupees drop the decimals. */
export const rupeesText = (paise: number | null | undefined) => {
  if (paise == null) return '';
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
};

/** What a vendor types in a rupee field: digits and up to two decimals. */
export const rupeeInput = (text: string) => {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  return rest.length ? `${whole.slice(0, 6)}.${rest.join('').slice(0, 2)}` : whole.slice(0, 6);
};

/** "125.5" → 12550; empty → null. */
export const paiseOf = (text: string): number | null => {
  if (!text.trim()) return null;
  const value = Number(text);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
};

/** ₹125 or ₹125.50 */
export const money = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const titleCase = (text: string) => text.replace(/\b\p{L}/gu, (c) => c.toUpperCase());

/** "From ₹250 a unit" style line for the price list. */
export function priceLine(price: PodPrice | undefined): string | null {
  if (!price) return null;
  if (price.model === 'per_page') {
    const parts = [price.bw ? `B/W ${money(price.bw)}` : null, price.color ? `Colour ${money(price.color)}` : null].filter(Boolean);
    return parts.length ? `${parts.join(' · ')} a page` : null;
  }
  return price.basePrice ? `${money(price.basePrice)} a unit · min ${price.minQuantity}` : null;
}

export function areaLine(pod: PodSetup): string {
  if (pod.serveAll) return 'Every city';
  if (!pod.cities.length) return 'Not set';
  return pod.cities.map(titleCase).join(', ');
}

export function addressOf(location: BusinessLocation | null): string | null {
  if (!location) return null;
  const street = [location.doorNo, location.building, location.street].filter(Boolean).join(', ');
  const place = [location.area, location.city].filter(Boolean).join(', ');
  return [street, place, `${location.state}${location.pincode ? ` ${location.pincode}` : ''}`].filter(Boolean).join('\n');
}
