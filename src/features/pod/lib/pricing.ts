import type { PriceLine } from '@/types/commerce';
import type { Fulfilment, PodQuote, PodStatus, PrintShop, PrintSpecs } from '@/types/pod';

/** Delivery fee is Ruxstar-set by weight tier, never by the vendor (PRD Module 9a). Rupees. */
const DELIVERY_TIERS: readonly { maxGrams: number; fee: number }[] = [
  { maxGrams: 500, fee: 40 },
  { maxGrams: 2000, fee: 70 },
  { maxGrams: Infinity, fee: 120 },
];

const GRAMS_PER_A4_SHEET = 5;
const PAPER_FACTOR = { A4: 1, Letter: 1, A3: 2 } as const;

export const MAX_COPIES = 100;
export const MAX_PAGES = 500;

/** Sheets of paper used: double-sided halves the sheet count, rounding up. */
export const sheetsFor = (specs: PrintSpecs) => Math.ceil((specs.pages * specs.copies) / (specs.doubleSided ? 2 : 1));

export const weightFor = (specs: PrintSpecs) => sheetsFor(specs) * GRAMS_PER_A4_SHEET * PAPER_FACTOR[specs.paper];

export const deliveryFeeFor = (weightGrams: number) => DELIVERY_TIERS.find((t) => weightGrams <= t.maxGrams)?.fee ?? 0;

/** Authoritative on the server; the app uses the same rules to show the price live. */
export const quotePod = (shop: Pick<PrintShop, 'bwRate' | 'colorRate'>, specs: PrintSpecs, fulfilment: Fulfilment): PodQuote => {
  const rate = (specs.color ? shop.colorRate : shop.bwRate) * PAPER_FACTOR[specs.paper];
  const printing = Math.round(rate * specs.pages * specs.copies * 100) / 100;
  const weightGrams = weightFor(specs);

  const lines: PriceLine[] = [{ label: `Printing · ${specs.pages * specs.copies} pages`, amount: Math.round(printing), kind: 'item' }];
  if (fulfilment === 'delivery') lines.push({ label: 'Delivery', amount: deliveryFeeFor(weightGrams), kind: 'delivery' });

  return { lines, total: lines.reduce((sum, l) => sum + l.amount, 0), weightGrams };
};

/** Next status along the vendor's path; pickup orders skip the delivery leg. Undefined once finished. */
export const nextStatus = (status: PodStatus, fulfilment: Fulfilment): PodStatus | undefined => {
  const path: PodStatus[] =
    fulfilment === 'delivery'
      ? ['placed', 'accepted', 'printing', 'ready', 'out_for_delivery', 'completed']
      : ['placed', 'accepted', 'printing', 'ready', 'completed'];
  const index = path.indexOf(status);
  return index >= 0 ? path[index + 1] : undefined;
};

export const STATUS_LABEL: Record<PodStatus, string> = {
  placed: 'Order placed',
  accepted: 'Accepted',
  printing: 'Printing',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
