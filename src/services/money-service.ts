import { apiPost } from '@/lib/api-client';
import type { Page } from '@/types/social';
import type { CancelQuote, CancelResult, Coupon, CouponCheck, EarningsSummary, LedgerEntry, PayoutAccount, Withdrawal } from '@/types/money';
import type { ModuleKey } from '@/types/vendor';

/** Ledger, earnings, payouts, coupons and cancellation/refunds. Not in the backend yet — mocked (money.mocks.ts). */
export const MoneyService = {
  earnings: (token: string) => apiPost<EarningsSummary>('/vendor/earnings', undefined, token),
  ledger: (token: string, cursor?: string) => apiPost<Page<LedgerEntry>>('/vendor/ledger', { cursor }, token),

  payoutAccounts: (token: string) => apiPost<PayoutAccount[]>('/payouts/list', undefined, token),
  addUpi: (token: string, upi: string) => apiPost<PayoutAccount>('/payouts/add-upi', { upi }, token),
  withdraw: (token: string, accountId: string, amount: number) => apiPost<Withdrawal>('/payouts/withdraw', { accountId, amount }, token),
  withdrawals: (token: string) => apiPost<Withdrawal[]>('/payouts/withdrawals', undefined, token),

  validateCoupon: (token: string, code: string, itemTotal: number, module?: ModuleKey) =>
    apiPost<CouponCheck>('/coupons/validate', { code, itemTotal, module }, token),
  vendorCoupons: (token: string) => apiPost<Coupon[]>('/vendor/coupons', undefined, token),
  createCoupon: (token: string, coupon: { code: string; percent: number; cap: number; module?: ModuleKey }) =>
    apiPost<Coupon>('/vendor/coupons/create', { ...coupon }, token),
  setCouponActive: (token: string, code: string, active: boolean) => apiPost<{ message: string }>('/vendor/coupons/toggle', { code, active }, token),

  cancelQuote: (token: string, refId: string) => apiPost<CancelQuote>('/orders/cancel-quote', { refId }, token),
  cancel: (token: string, refId: string) => apiPost<CancelResult>('/orders/cancel', { refId }, token),
};
