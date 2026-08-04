/**
 * Print-on-Demand types.
 * Mirrors: ruxstar-frontend-services/lib/api.ts (POD section)
 */

// ─── Catalog ─────────────────────────────────────────────────────────────────

export type PrintPricingModel = 'per_unit' | 'per_page';

export type PrintRequirementType = 'select' | 'text' | 'textarea' | 'file';

export type PrintRequirementField = {
  key:         string;
  label:       string;
  type:        PrintRequirementType;
  required:    boolean;
  hint:        string;
  placeholder: string;
};

export type PrintCategory = {
  id:            string;
  label:         string;
  icon:          string;
  description:   string;
  pricingModel:  PrintPricingModel;
  minQuantity:   number;
  sizes:         string[];
  printTypes:    string[];
  materials:     string[];
  colorOptions:  string[];
  sides:         string[];
  bindingOptions: string[];
  requirements:  PrintRequirementField[];
};

// ─── Pricing ─────────────────────────────────────────────────────────────────

export type PricingTier = { minQty?: number; minPages?: number; unitPrice: number };

export type PricingAddons = {
  sides?:      Record<string, number>;
  size?:       Record<string, number>;
  printType?:  Record<string, number>;
  material?:   Record<string, number>;
  color?:      Record<string, number>;
  doubleSided?: number;
  binding?:    Record<string, number>;
  paperSize?:  Record<string, number>;
};

export type CategoryPricing = {
  enabled:       boolean;
  minQuantity:   number;
  turnaroundDays: number;
  basePrice?:    number;
  perPage?:      { bw: number; color: number };
  addons?:       PricingAddons;
  tiers?:        PricingTier[];
};

// ─── Shops ───────────────────────────────────────────────────────────────────

export type PrintShop = {
  businessId:      string;
  vendorId:        string;
  name:            string;
  thumbnailUrl:    string;
  city:            string;
  acceptingOrders: boolean;
  pricingModel:    PrintPricingModel;
  turnaroundDays:  number;
  minQuantity:     number;
  fromPrice:       number;
  pricing:         CategoryPricing;
};

// ─── Orders ──────────────────────────────────────────────────────────────────

export type PrintOrderStatus =
  | 'open'
  | 'accepted'
  | 'pending_payment'
  | 'confirmed'
  | 'in_production'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type PrintOrderAttributes = {
  printType?: string;
  material?:  string;
  color?:     string;
  size?:      string;
  extras?:    Record<string, string>;
};

export type PrintOrderSelection = {
  quantity?:   number;
  copies?:     number;
  options?:    Record<string, string>;
  sections?:   { pages: number; color: 'bw' | 'color' }[];
  doubleSided?: boolean;
  binding?:    string;
  paperSize?:  string;
};

export type PrintOrder = {
  id:                  string;
  customerName:        string;
  customerMobile:      string;
  categoryId:          string;
  categoryLabel:       string;
  title:               string;
  attributes:          PrintOrderAttributes;
  quantity:            number | null;
  notes:               string;
  city:                string;
  pincode:             string;
  hasDesign:           boolean;
  designImageUrl:      string | null;
  designImage?:        string;
  status:              PrintOrderStatus;
  assignedVendorId:    string | null;
  assignedBusinessId:  string | null;
  vendorName:          string | null;
  businessName:        string | null;
  vendorMobile:        string | null;
  vendorNote:          string;
  quoteAmount:         number | null;
  currency:            string;
  paymentStatus:       string | null;
  acceptedAt:          string | null;
  paidAt:              string | null;
  createdAt:           string | null;
  updatedAt:           string | null;
};

// ─── Configurator (client-side draft before order is placed) ─────────────────

export type PriceSelection = {
  quantity?:   number;
  copies?:     number;
  options?:    Record<string, string>;
  pages?:      number;
  color?:      'bw' | 'color';
  sections?:   { pages: number; color: 'bw' | 'color' }[];
  doubleSided?: boolean;
  binding?:    string;
  paperSize?:  string;
};

export type PriceResult = {
  total:       number;
  currency:    string;
  unavailable?: boolean;
  unitPrice?:  number;
  perCopy?:    number;
  totalPages?: number;
};

export type PrintOrderDraft = {
  category:        PrintCategory;
  shop:            PrintShop;
  city:            string;
  quantity:        number;
  selection:       PriceSelection;
  attributes:      PrintOrderAttributes;
  notes:           string;
  designImage?:    string;
  designFileName?: string;
  price:           PriceResult;
};

// ─── Vendor helpers ───────────────────────────────────────────────────────────

export type VendorPrintOrders = {
  assigned: PrintOrder[];
  eligible: { hasPrintBusiness: boolean };
};

// ─── Notifications ────────────────────────────────────────────────────────────

export type AppNotification = {
  id:        string;
  type:      string;
  title:     string;
  body:      string;
  data:      Record<string, unknown>;
  read:      boolean;
  createdAt: string | null;
};

export type NotificationsResult = {
  notifications: AppNotification[];
  unreadCount:   number;
};

// ─── Vendor print profile (business setup) ────────────────────────────────────

export type PrintProfile = {
  serviceCategories: string[];
  cities:            string[];
  serveAll:          boolean;
  turnaroundDays:    number;
  minOrderValue:     number;
  notes:             string;
  acceptingOrders:   boolean;
  pricing:           Record<string, CategoryPricing>;
};

export type CreatePrintOrderInput = {
  businessId:   string;
  categoryId:   string;
  selection:    PrintOrderSelection;
  city:         string;
  pincode?:     string;
  notes?:       string;
  attributes?:  PrintOrderAttributes;
  designImage?: string;
};

export type InitiatePaymentResult = {
  orderId:          string;
  cashfreeOrderId:  string;
  paymentSessionId: string;
  amount:           number;
  currency:         string;
  expiresAt:        string;
  mode:             'sandbox' | 'production';
};
