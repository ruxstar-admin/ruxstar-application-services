import { ApiError } from '@/lib/api-error';
import { discountFor } from '@/features/money/lib/rules';
import type { PaymentMethod } from '@/types/commerce';
import type { ModuleKey } from '@/types/vendor';
import { allListings, coupons, engagements, payments, type PaymentRecord } from './commerce-state';
import { defineMocks } from './registry';

const sessions = new Map<string, { record: PaymentRecord; attempts: number }>();
let sessionCounter = 0;

const text = (body: Record<string, unknown> | undefined, key: string) => String(body?.[key] ?? '');

/** The coupon (if any) that applies to this purchase, validated server-side. */
export const resolveCoupon = (code: string, module: ModuleKey | undefined, itemTotal: number) => {
  const coupon = coupons.find((c) => c.code === code.trim().toUpperCase());
  if (!coupon || !coupon.active) throw new ApiError(404, 'Coupon not found');
  if (coupon.module && module && coupon.module !== module) throw new ApiError(409, 'Coupon does not apply here');
  return { code: coupon.code, fundedBy: coupon.fundedBy, discount: discountFor(coupon.percent, coupon.cap, itemTotal) };
};

defineMocks({
  /** `amount` = everything the lines add up to; `itemTotal` = the part a coupon may discount (no delivery fee). */
  'POST /payments/start': {
    mocked: true,
    latencyMs: 300,
    handle: ({ body }) => {
      const total = Number(body?.amount ?? 0);
      const itemTotal = Number(body?.itemTotal ?? total);
      if (!(total > 0)) throw new ApiError(400, 'Nothing to pay');
      const code = text(body, 'couponCode');
      const coupon = code ? resolveCoupon(code, text(body, 'module') as ModuleKey, itemTotal) : undefined;
      const discount = coupon?.discount ?? 0;
      const sessionId = `sess-${++sessionCounter}`;
      sessions.set(sessionId, {
        attempts: 0,
        record: { paid: total - discount, itemTotal, total, discount, fundedBy: coupon?.fundedBy, couponCode: coupon?.code },
      });
      return { sessionId, amount: total - discount, discount };
    },
  },

  /** Demo rule: the first card payment of a session is declined so the retry path can be seen. */
  'POST /payments/confirm': {
    mocked: true,
    latencyMs: 900,
    handle: ({ body }) => {
      const session = sessions.get(text(body, 'sessionId'));
      if (!session) throw new ApiError(404, 'Payment session expired');
      session.attempts += 1;
      const method = text(body, 'method') as PaymentMethod;
      if (method === 'card' && session.attempts === 1) return { status: 'failed' };
      sessions.delete(text(body, 'sessionId'));
      const reference = `PAY${Date.now().toString(36).toUpperCase()}${sessionCounter}`;
      payments.set(reference, session.record);
      return { status: 'paid', reference };
    },
  },

  'POST /orders/list': { mocked: true, handle: () => engagements.map((e) => ({ ...e })) },

  'POST /discover/list': {
    mocked: true,
    latencyMs: 300,
    handle: ({ body }) => {
      const module = body?.module as ModuleKey | undefined;
      return allListings().filter((l) => !module || l.module === module);
    },
  },
});
