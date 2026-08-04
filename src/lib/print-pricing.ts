/**
 * Frontend price calculator — mirrors backend utils/printPricing.js.
 * Used for live price display; backend recomputes authoritatively at order time.
 * Mirrors: ruxstar-frontend-services/lib/print-pricing.ts
 */

import type {
  CategoryPricing,
  PricingTier,
  PrintCategory,
  PriceSelection,
  PriceResult,
  PrintOrderAttributes,
} from '@/types/print';

const num = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);

function bestTier(
  tiers: PricingTier[] | undefined,
  amount: number,
  key: 'minQty' | 'minPages',
): PricingTier | null {
  if (!Array.isArray(tiers)) return null;
  let best: PricingTier | null = null;
  for (const t of tiers) {
    if (!t || !Number.isFinite(Number(t.unitPrice))) continue;
    const threshold = num(t[key]);
    if (amount >= threshold && (!best || threshold > num(best[key]))) best = t;
  }
  return best;
}

function computePerUnit(pricing: CategoryPricing, selection: PriceSelection): PriceResult {
  const quantity = Math.max(1, Math.round(num(selection.quantity)));
  const options  = selection.options || {};
  const addons   = pricing.addons   || {};

  const tier = bestTier(pricing.tiers, quantity, 'minQty');
  const base = tier ? num(tier.unitPrice) : num(pricing.basePrice);

  let addonSum = 0;
  for (const [dim, value] of Object.entries(options)) {
    if (!value) continue;
    const map = (addons as Record<string, Record<string, number> | undefined>)[dim];
    addonSum += num(map?.[value]);
  }

  const unitPrice = base + addonSum;
  return { total: Math.max(0, unitPrice * quantity), unitPrice, currency: 'INR' };
}

function computePerPage(pricing: CategoryPricing, selection: PriceSelection): PriceResult {
  const copies  = Math.max(1, Math.round(num(selection.copies ?? selection.quantity ?? 1)));
  const perPage = pricing.perPage || { bw: 0, color: 0 };
  const addons  = pricing.addons  || {};

  const sections =
    Array.isArray(selection.sections) && selection.sections.length
      ? selection.sections
      : [{ pages: num(selection.pages), color: selection.color === 'color' ? 'color' : 'bw' as const }];

  const paperSizeAddon = selection.paperSize ? num(addons.paperSize?.[selection.paperSize]) : 0;
  const doubleSidedAddon = selection.doubleSided ? num(addons.doubleSided) : 0;

  let totalPages = 0;
  let pagesCost  = 0;
  for (const sec of sections) {
    const pages = Math.max(0, Math.round(num(sec.pages)));
    totalPages += pages;
    const rate = sec.color === 'color' ? num(perPage.color) : num(perPage.bw);
    pagesCost += pages * (rate + paperSizeAddon + doubleSidedAddon);
  }

  const tier = bestTier(pricing.tiers, totalPages, 'minPages');
  if (tier) pagesCost = totalPages * (num(tier.unitPrice) + paperSizeAddon + doubleSidedAddon);

  const bindingPrice = selection.binding ? num(addons.binding?.[selection.binding]) : 0;
  const perCopy = pagesCost + bindingPrice;
  return { total: Math.max(0, perCopy * copies), perCopy, totalPages, currency: 'INR' };
}

export function computePrice(
  category: Pick<PrintCategory, 'pricingModel'>,
  pricing: CategoryPricing | undefined,
  selection: PriceSelection = {},
): PriceResult {
  if (!pricing || pricing.enabled === false) {
    return { total: 0, currency: 'INR', unavailable: true };
  }
  return category.pricingModel === 'per_page'
    ? computePerPage(pricing, selection)
    : computePerUnit(pricing, selection);
}

export type PricingDimension = {
  key:    'sides' | 'size' | 'printType' | 'material' | 'color';
  label:  string;
  values: string[];
};

const DIMENSION_LABELS: Record<PricingDimension['key'], string> = {
  sides:     'Print sides',
  size:      'Size',
  printType: 'Print method',
  material:  'Material',
  color:     'Colour',
};

export function pricingDimensions(category: PrintCategory): PricingDimension[] {
  const map: { key: PricingDimension['key']; values: string[] }[] = [
    { key: 'sides',     values: category.sides },
    { key: 'size',      values: category.sizes },
    { key: 'printType', values: category.printTypes },
    { key: 'material',  values: category.materials },
    { key: 'color',     values: category.colorOptions },
  ];
  return map
    .filter((d) => Array.isArray(d.values) && d.values.length > 0)
    .map((d) => ({ key: d.key, label: DIMENSION_LABELS[d.key], values: d.values }));
}

export function formatPrintOrderAttributes(attrs: PrintOrderAttributes): string {
  const parts = [attrs.size, attrs.material, attrs.printType, attrs.color].filter(Boolean);
  if (attrs.extras) {
    for (const value of Object.values(attrs.extras)) {
      if (value.trim()) parts.push(value.trim());
    }
  }
  return parts.join(' · ');
}

const ATTR_LABELS: Record<string, string> = {
  size:      'Size',
  material:  'Material',
  printType: 'Print type',
  color:     'Colour',
};

function humanizeExtraKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function orderAttributeRows(
  attrs: PrintOrderAttributes,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  for (const key of ['size', 'material', 'printType', 'color'] as const) {
    const value = attrs[key]?.trim();
    if (value) rows.push({ label: ATTR_LABELS[key], value });
  }
  if (attrs.extras) {
    for (const [key, value] of Object.entries(attrs.extras)) {
      const v = value.trim();
      if (v) rows.push({ label: humanizeExtraKey(key), value: v });
    }
  }
  return rows;
}
