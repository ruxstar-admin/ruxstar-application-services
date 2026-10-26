import { ApiError } from '@/lib/api-error';
import type { KycFlow, KycOverview, KycState } from '@/types/kyc';
import { addProfileBadge } from './profile.mocks';
import { defineMocks } from './registry';

/** Demo: a submitted flow is approved this long after submission, so the pending → verified UX can be seen. */
const AUTO_APPROVE_MS = 6000;
const DEMO_OTP = '123456';
const WRONG_OTP_DEMO = '000000';
const BADGE_FOR_FLOW = { vendor: 'vendor', delivery: 'delivery' } as const;

const submittedAt: Partial<Record<KycFlow, number>> = {};
const granted = new Set<KycFlow>();

const field = (body: Record<string, unknown> | undefined, key: string) => String(body?.[key] ?? '');

const stateOf = (flow: KycFlow): KycState => {
  const submitted = submittedAt[flow];
  if (submitted === undefined) return { status: 'not_started' };
  if (Date.now() - submitted < AUTO_APPROVE_MS) return { status: 'pending_review' };
  if (flow !== 'base' && !granted.has(flow)) {
    granted.add(flow);
    addProfileBadge(BADGE_FOR_FLOW[flow]);
  }
  return { status: 'verified' };
};

const ok = { ok: true };

defineMocks({
  'GET /kyc/status': {
    mocked: true,
    handle: (): KycOverview => ({ base: stateOf('base'), vendor: stateOf('vendor'), delivery: stateOf('delivery') }),
  },

  'POST /kyc/aadhaar/send-otp': { mocked: true, handle: () => ({ message: 'OTP sent to the mobile linked with Aadhaar', otp: DEMO_OTP }) },

  'POST /kyc/aadhaar/verify-otp': {
    mocked: true,
    handle: ({ body }) => {
      if (field(body, 'otp') === WRONG_OTP_DEMO) throw new ApiError(401, 'Invalid OTP');
      return ok;
    },
  },

  'POST /kyc/upload': { mocked: true, latencyMs: 700, handle: ({ body }) => ({ fileId: `mock-${field(body, 'kind')}-${Date.now()}` }) },

  'POST /kyc/bank': {
    mocked: true,
    latencyMs: 800,
    handle: ({ body }) => {
      const account = field(body, 'accountNumber');
      if (account.endsWith('0000')) throw new ApiError(400, 'Bank account could not be verified');
      return { ok: true, last4: account.slice(-4) };
    },
  },

  'POST /kyc/vendor/business-id': { mocked: true, handle: () => ok },

  'POST /kyc/delivery/licence': { mocked: true, handle: () => ok },

  'POST /kyc/submit': {
    mocked: true,
    latencyMs: 600,
    handle: ({ body }) => {
      const flow = field(body, 'flow') as KycFlow;
      submittedAt[flow] = Date.now();
      return { status: 'pending_review' };
    },
  },
});
