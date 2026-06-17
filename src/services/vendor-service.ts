/**
 * Vendor Service
 * ---------------
 * API calls for vendor profile management and role switching.
 * Mirrors the web's lib/api.ts vendor section.
 * Base URL matches kyc-service.ts.
 */

import type { VendorProfile } from '@/types/vendor';
import { API_URL } from '@/constants/config';

const BASE_URL = API_URL;

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as Record<string, string>).message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

async function apiPost<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as Record<string, string>).message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

async function apiPatch<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as Record<string, string>).message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

// ─── Vendor Service ───────────────────────────────────────────────────────────

export const VendorService = {
  /**
   * GET /vendor/profile
   * Fetch the vendor's business profile (requires KYC verified).
   */
  getProfile(token: string): Promise<VendorProfile> {
    return apiGet<VendorProfile>('vendor/profile', token);
  },

  /**
   * PATCH /vendor/profile
   * Update vendor profile fields (partial update).
   */
  updateProfile(token: string, patch: Partial<VendorProfile>): Promise<{ message?: string }> {
    return apiPatch('vendor/profile', patch, token);
  },

  /**
   * POST /user/become-vendor
   * Convert a customer account to vendor role.
   */
  becomeVendor(token: string, businessName?: string): Promise<{ token?: string; message?: string }> {
    return apiPost('user/become-vendor', { businessName }, token);
  },

  /**
   * POST /vendor/become-customer
   * Convert a vendor account back to customer role.
   */
  becomeCustomer(token: string): Promise<{ token?: string; message?: string }> {
    return apiPost('vendor/become-customer', {}, token);
  },
};
