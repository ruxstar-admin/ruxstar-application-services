/**
 * Vendor domain types — shared across stores, services, and screens.
 * Mirrors the web frontend's lib/vendor-businesses.ts & lib/api.ts shapes.
 */

// ─── Business ─────────────────────────────────────────────────────────────────

export interface VendorBusiness {
  id:          string;
  name:        string;
  category:    string;
  phone:       string;
  address:     string;
  description: string;
  createdAt:   string;
}

export type BusinessFormData = Omit<VendorBusiness, 'id' | 'createdAt'>;

export const emptyBusinessForm: BusinessFormData = {
  name:        '',
  category:    '',
  phone:       '',
  address:     '',
  description: '',
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface VendorProfile {
  businessName?: string;
  category?:     string;
  description?:  string;
  phone?:        string;
  address?:      string;
}

// ─── Categories ───────────────────────────────────────────────────────────────

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
