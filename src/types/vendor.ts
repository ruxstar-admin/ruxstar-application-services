/**
 * Vendor domain types
 * Business CRUD types now live in vendor-business-service.ts (re-exported here for compat)
 */

import type { BusinessInput } from '@/services/vendor-business-service';

// Re-export canonical types from the service layer
export type {
  Business as VendorBusiness,
  BusinessInput as BusinessFormData,
  BusinessCatalog,
  CatalogBusinessCategory,
  CatalogBusinessType,
  BookingMode,
} from '@/services/vendor-business-service';

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface VendorProfile {
  businessName?: string;
  category?:     string;
  description?:  string;
  phone?:        string;
  address?:      string;
}

// ─── Legacy category list (kept for any remaining static references) ──────────

export const BUSINESS_CATEGORIES: string[] = [
  'Retail & Shopping',
  'Food & Restaurants',
  'Beauty & Wellness',
  'Health & Medical',
  'Home Services',
  'Education & Tutoring',
  'Automotive',
  'Sports & Fitness',
  'Technology',
  'Creative & Design',
  'Logistics & Delivery',
  'Real Estate',
  'Events & Entertainment',
  'Travel & Tourism',
  'Finance & Insurance',
  'Agriculture & Farming',
  'Manufacturing',
  'Digital Services',
  'Construction & Engineering',
  'Gifts & Specialties',
];

export const emptyBusinessForm: BusinessInput = {
  name: '', typeId: '', phone: '', address: '', description: '',
};
