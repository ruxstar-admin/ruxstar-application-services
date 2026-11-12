/** The modules a business can be opened in. Each business is in exactly one. */
export type BusinessModule = 'pod' | 'events' | 'coaching' | 'stays';

/** Each type belongs to one module; the catalog lists them. */
export type BusinessType = 'print_shop' | 'concert' | 'sports_event' | 'coaching' | 'pg' | 'hostel';

export type PodProduct =
  | 'tshirts'
  | 'hoodies'
  | 'jerseys'
  | 'business_cards'
  | 'posters'
  | 'flex_banners'
  | 'stickers'
  | 'invitations'
  | 'photo_prints'
  | 'documents';

/** As in the v1 picker: state and city always, the rest when given. */
export interface BusinessLocation {
  state: string;
  city: string;
  doorNo: string | null;
  building: string | null;
  street: string | null;
  area: string | null;
  pincode: string | null;
  /** From "Use current location". */
  point: { lat: number; lng: number } | null;
}

export interface Gstin {
  number: string;
  legalName: string | null;
  status: string | null;
}

export interface BusinessPhoto {
  id: string;
  url: string;
  width: number;
  height: number;
}

/** An extra charge per unit (per page for documents) for one option value, such as size XXL. Paise. */
export interface PodExtra {
  option: string;
  value: string;
  price: number;
}

/** From `from` units (pages for documents) the unit price becomes `unitPrice` paise. */
export interface PodTier {
  from: number;
  unitPrice: number;
}

/** One product's prices, in paise. `per_unit` uses `basePrice`; documents (`per_page`) use `bw` and `color`. */
export interface PodPrice {
  product: PodProduct;
  model: 'per_unit' | 'per_page';
  minQuantity: number;
  turnaroundDays: number | null;
  basePrice: number | null;
  bw: number | null;
  color: number | null;
  extras: PodExtra[];
  tiers: PodTier[];
}

export interface PodSetup {
  products: PodProduct[];
  serveAll: boolean;
  /** Lower case. */
  cities: string[];
  turnaroundDays: number;
  /** Paise. */
  minOrder: number;
  notes: string | null;
  prices: PodPrice[];
  /** Chosen products still without a price. */
  unpriced: PodProduct[];
}

/** What is still needed before a draft can be published; the last three are print on demand only. */
export type BusinessMissing = 'photo' | 'phone' | 'location' | 'products' | 'area' | 'pricing';

/** GET /v1/vendor/businesses/{id} */
export interface Business {
  id: string;
  module: BusinessModule;
  type: BusinessType;
  name: string;
  description: string | null;
  phone: string | null;
  location: BusinessLocation | null;
  gstin: Gstin | null;
  /** The first is the cover. */
  photos: BusinessPhoto[];
  /** Print on demand only. */
  pod: PodSetup | null;
  status: 'draft' | 'live';
  /** A live business takes orders and bookings only while open. */
  open: boolean;
  /** False while the Ruxstar team has paused this module. */
  moduleLive: boolean;
  missing: BusinessMissing[];
  /** Set while the Ruxstar team has the business on hold. */
  suspension: { reason: string; at: string } | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What the vendor types; empty parts are sent as null. */
export interface LocationInput {
  state: string;
  city: string;
  doorNo?: string | null;
  building?: string | null;
  street?: string | null;
  area?: string | null;
  pincode?: string | null;
  point?: { lat: number; lng: number } | null;
}

/** POST /v1/vendor/businesses: category (module), type and profile. */
export interface NewBusiness {
  module: BusinessModule;
  type: BusinessType;
  name: string;
  phone: string;
  location: LocationInput;
  description?: string | null;
}

/** Send only what changes; null clears an optional field. */
export interface BusinessUpdate {
  name?: string;
  description?: string | null;
  phone?: string | null;
  location?: LocationInput | null;
  gstin?: string | null;
}

export interface PodPriceInput {
  product: PodProduct;
  minQuantity?: number;
  turnaroundDays?: number | null;
  basePrice?: number | null;
  bw?: number | null;
  color?: number | null;
  extras?: PodExtra[];
  tiers?: PodTier[];
}

/** PATCH /v1/vendor/businesses/{id}/pod. `prices` replaces the prices of the products it names. */
export interface PodSetupUpdate {
  products?: PodProduct[];
  serveAll?: boolean;
  cities?: string[];
  turnaroundDays?: number;
  minOrder?: number;
  notes?: string | null;
  prices?: PodPriceInput[];
}

export interface BusinessTypeInfo {
  id: BusinessType;
  label: string;
  description: string;
  examples: string;
  namePlaceholder: string;
  detailHint: string;
}

export interface PodProductInfo {
  id: PodProduct;
  label: string;
  description: string;
  pricing: 'per_unit' | 'per_page';
  minQuantity: number;
  /** The values a vendor can charge extra for, by option. */
  options: { option: string; values: string[] }[];
}

/** GET /v1/vendor/catalog: the lists the Add a business and setup screens choose from. */
export interface BusinessCatalog {
  categories: {
    module: BusinessModule;
    label: string;
    description: string;
    live: boolean;
    /** Whether new businesses can be created in it. */
    signupsOpen: boolean;
    types: BusinessTypeInfo[];
  }[];
  states: { name: string; cities: string[] }[];
  podProducts: PodProductInfo[];
  limits: { businesses: number; photos: number; description: number; cities: number; turnaroundDays: number; tiers: number };
}

export interface PayoutMethod {
  kind: 'bank' | 'upi';
  /** For example "YES BANK ••1191" or "asha@upi". */
  label: string;
  /** The name the bank has for the account. */
  holderName: string | null;
  ifsc: string | null;
  verifiedAt: string;
}

export type PayoutMethodInput = { kind: 'bank'; accountNumber: string; ifsc: string } | { kind: 'upi'; vpa: string };

export interface Payout {
  id: string;
  /** Paise. */
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  to: string;
  utr: string | null;
  paidAt: string | null;
  createdAt: string;
}

/** GET /v1/vendor/payments. Amounts are paise. */
export interface Payments {
  balance: { available: number; pending: number; paidOut: number };
  payoutMethod: PayoutMethod | null;
  payouts: Payout[];
}
