import type { BusinessType, PodProduct } from './business';
import type { Rating } from './review';

export interface ShopPhotoFile {
  url: string;
  width: number;
  height: number;
}

/** `smaller` are narrower copies, narrowest first, for cards and grids. */
export interface ShopPhoto extends ShopPhotoFile {
  smaller: ShopPhotoFile[];
}

/** GET /v1/pod/shops: a print shop as Discover shows it. Prices are paise. */
export interface ShopCard {
  id: string;
  name: string;
  type: BusinessType;
  typeLabel: string;
  cover: ShopPhoto | null;
  area: string | null;
  city: string;
  state: string;
  open: boolean;
  deliversEverywhere: boolean;
  fromPrice: number | null;
  fromUnit: 'unit' | 'page' | null;
  turnaroundDays: number;
  products: PodProduct[];
  rating: Rating;
}

export interface ShopProduct {
  id: PodProduct;
  label: string;
  description: string;
  pricing: 'per_unit' | 'per_page';
  minQuantity: number;
  turnaroundDays: number;
  basePrice: number | null;
  bw: number | null;
  color: number | null;
  extras: { option: string; value: string; price: number }[];
  tiers: { from: number; unitPrice: number }[];
  options: { option: string; values: string[] }[];
}

/** GET /v1/pod/shops/{id}: the public shop page. No street address or phone. */
export interface Shop extends ShopCard {
  description: string | null;
  photos: ShopPhoto[];
  pincode: string | null;
  /** Lower case; empty when it delivers everywhere. */
  cities: string[];
  minOrder: number;
  notes: string | null;
  catalog: ShopProduct[];
  deliveryFee: DeliveryFee;
}

/** Paise: `base` covers the first `includedKm`, then `perKm` for each km after. All 0 is free delivery. */
export interface DeliveryFee {
  base: number;
  includedKm: number;
  perKm: number;
}

export type ShopFilters = {
  city?: string;
  product?: PodProduct;
  q?: string;
};
