/** `bill_of_supply` is a sale without GST: the seller has no GSTIN, or the sale is exempt. */
export type InvoiceKind = 'tax_invoice' | 'bill_of_supply' | 'credit_note';
export type GstModule = 'pod' | 'events' | 'coaching' | 'stays' | 'turf' | 'ecommerce' | 'gigs';
/** `vendor`: the business's own document. `ruxstar`: Ruxstar's. */
export type InvoiceIssuer = 'vendor' | 'ruxstar';
/** `supply`: what was bought. `fee`: Ruxstar's platform fee. */
export type InvoiceRole = 'supply' | 'fee';
/** Who is looking: customers don't see TCS, businesses see only their own sales. */
export type InvoiceAudience = 'customer' | 'vendor' | 'staff';

/** The short form on print orders, ticket orders and statement lines. Paise. */
export interface InvoiceRef {
  id: string;
  kind: InvoiceKind;
  number: string;
  issuer: InvoiceIssuer;
  role: InvoiceRole;
  total: number;
  /** Credit notes: the refund behind it. */
  refundId: string | null;
  issuedAt: string;
}

export interface InvoiceParty {
  name: string;
  legalName: string | null;
  gstin: string | null;
  address: string | null;
  state: string | null;
  /** Two-digit GST state code. */
  stateCode: string | null;
}

/** Paise. `rateBps` 1800 = 18%. `code` is HSN for goods, SAC for services, empty when not set. */
export interface InvoiceLine {
  description: string;
  code: string;
  codeKind: 'hsn' | 'sac';
  quantity: number;
  unitPrice: number;
  discount: number;
  rateBps: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

/** GET /v1/{account|vendor|ruxstar}/invoices/:id. Frozen when issued; later changes never alter it. Paise. */
export interface Invoice {
  id: string;
  kind: InvoiceKind;
  number: string;
  /** Indian financial year, like 2026-27. */
  fy: string;
  issuer: InvoiceIssuer;
  role: InvoiceRole;
  module: GstModule;
  order: { type: 'pod_order' | 'event_order' | 'coaching_order' | 'turf_booking' | 'stay_reservation' | 'shop_order' | 'gig_order'; id: string; orderNo: number };
  business: { id: string; name: string };
  seller: InvoiceParty;
  buyer: InvoiceParty;
  /** Ruxstar as the e-commerce operator, on a business's documents. */
  operator: { name: string; gstin: string | null } | null;
  placeOfSupply: { state: string; code: string } | null;
  /** `intra`: CGST and SGST. `inter`: IGST. */
  supply: 'intra' | 'inter';
  /** Ruxstar pays the GST on the business's sale as the e-commerce operator (section 9(5)). */
  operatorPays: boolean;
  lines: InvoiceLine[];
  totals: { taxable: number; cgst: number; sgst: number; igst: number; tax: number; total: number; ruxstarDiscount: number; payable: number };
  /** Tax Ruxstar collects from the business. Null for customers. */
  tcs: { rateBps: number; amount: number } | null;
  /** Credit notes: the invoice it reduces. */
  against: { id: string; number: string; issuedAt: string } | null;
  refund: { id: string; reason: string | null } | null;
  /** Invoices: paise credited back so far. */
  credited: number;
  notes: string[];
  issuedAt: string;
  /** Opens the PDF without signing in, for 10 minutes. Add `download=1` to save it. */
  pdfUrl: string;
}

export interface InvoiceFilter {
  kind?: InvoiceKind;
  /** Customers: one order's documents. */
  orderId?: string;
  /** Businesses and the console: one business's documents. */
  business?: string;
  /** Console: an exact document number. */
  number?: string;
  /** Console: an order number. */
  orderNo?: number;
  limit?: number;
}

// Console GST settings.

/** Units priced at or below `upTo` paise (tax included) use `rateBps` instead. */
export interface GstLowRate {
  upTo: number;
  rateBps: number;
}

export interface GstItemRate {
  key: string;
  label: string;
  code: string;
  codeKind: 'hsn' | 'sac';
  rateBps: number;
  lowRate: GstLowRate | null;
}

export interface GstModuleSettings {
  module: GstModule;
  enabled: boolean;
  /** `vendor`: the business sells and Ruxstar is the operator. `ruxstar`: Ruxstar invoices the sale itself. */
  seller: 'vendor' | 'ruxstar';
  /** A business without a GSTIN issues a bill of supply, or Ruxstar invoices the sale and pays the GST. */
  withoutGstin: 'bill_of_supply' | 'ruxstar';
  code: string;
  codeKind: 'hsn' | 'sac';
  rateBps: number;
  lowRate: GstLowRate | null;
  items: GstItemRate[];
  pricesIncludeTax: boolean;
  tcsBps: number;
  /** Null while on the defaults. */
  updatedAt: string | null;
}

export type GstModulePatch = Partial<Pick<GstModuleSettings, 'enabled' | 'code' | 'codeKind' | 'rateBps' | 'tcsBps'>>;

export interface GstAddress {
  line: string;
  city: string;
  state: string;
  pincode: string;
}

export interface GstSellerSettings {
  legalName: string;
  tradeName: string;
  gstin: string | null;
  address: GstAddress | null;
  feeCode: string;
  feeRateBps: number;
  updatedAt: string | null;
}

export type GstSellerPatch = Partial<Omit<GstSellerSettings, 'updatedAt'>>;

export interface GstSettings {
  seller: GstSellerSettings;
  modules: GstModuleSettings[];
}
