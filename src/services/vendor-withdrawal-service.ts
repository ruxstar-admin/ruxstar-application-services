/**
 * Vendor Withdrawal Service
 * ---------------
 * API calls for the vendor earnings ledger + withdrawals.
 * Mirrors the web's lib/api.ts vendor-ledger section + app/business/payments/page.tsx.
 * Base URL matches kyc-service.ts / vendor-service.ts.
 */

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

// ─── Types (mirror models/Payment.js + models/Withdrawal.js sanitize()) ───────

export type PayoutMethodType = 'bank' | 'vpa';

export interface PayoutMethod {
  type: PayoutMethodType;
  accountName: string | null;
  accountNumberMasked: string | null;
  ifsc: string | null;
  vpa: string | null;
}

export type PayoutMethodInput =
  | { type: 'bank'; accountName: string; accountNumber: string; ifsc: string }
  | { type: 'vpa'; vpa: string };

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';

export interface Withdrawal {
  id: string;
  withdrawalRef: string;
  vendorId: string | null;
  vendorName: string | null;
  amount: number;
  currency: string;
  count: number;
  paymentIds: string[];
  status: WithdrawalStatus;
  payoutMethod: PayoutMethod;
  cfTransferId: string | null;
  transferStatus: string | null;
  failureReason: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  note: string | null;
  requestedAt: string | null;
  decidedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type PaymentSource = 'booking' | 'print' | 'event';

export interface VendorPayment {
  id: string;
  refId: string;
  source: PaymentSource;
  sourceRef: string | null;
  amount: number;
  status: string;
  refundStatus: string | null;
  payoutRef: string | null;
  withdrawalStatus: string | null;
  withdrawalRef: string | null;
  paidAt: string | null;
  refundable: boolean;
  matured: boolean;
}

export interface VendorLedgerSummary {
  totals: {
    earned: number;
    withdrawable: number;
    holding: number;
    inProcess: number;
    withdrawn: number;
  };
  canWithdraw: boolean;
  hasPayoutMethod: boolean;
  payoutMethod: PayoutMethod | null;
  activeWithdrawal: Withdrawal | null;
  withdrawals: Withdrawal[];
}

export interface VendorLedger {
  payments: VendorPayment[];
  summary: VendorLedgerSummary;
}

// ─── Vendor Withdrawal Service ─────────────────────────────────────────────────

export const VendorWithdrawalService = {
  /** GET /vendor/payments — full ledger + earnings/withdrawal summary */
  getLedger(token: string): Promise<VendorLedger> {
    return apiGet<VendorLedger>('vendor/payments', token);
  },

  /** PATCH /vendor/payout-method */
  updatePayoutMethod(input: PayoutMethodInput, token: string): Promise<void> {
    return apiPatch('vendor/payout-method', input, token).then(() => undefined);
  },

  /** POST /vendor/withdrawals — request a withdrawal of the full matured balance */
  requestWithdrawal(token: string): Promise<Withdrawal> {
    return apiPost<{ withdrawal: Withdrawal }>('vendor/withdrawals', {}, token).then(
      (r) => r.withdrawal,
    );
  },
};
