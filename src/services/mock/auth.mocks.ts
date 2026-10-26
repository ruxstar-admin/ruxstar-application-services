import { ApiError } from '@/lib/api-error';
import { defineMocks } from './registry';

/** Any 6-digit code works except this one fails, so the wrong-OTP path can be exercised in the app. */
const DEMO_OTP = '123456';
const WRONG_OTP_DEMO = '000000';
const MAX_OTP_ATTEMPTS = 5;
const PASSWORD_HISTORY = 3;
const TAKEN_USERNAMES = new Set(['ruxstar', 'admin', 'support', 'priya.nair', 'you.ster']);

const attempts = new Map<string, number>();
const history = new Map<string, string[]>();

const text = (body: Record<string, unknown> | undefined, key: string) => String(body?.[key] ?? '');

defineMocks({
  'POST /auth/forgot-password/send-otp': {
    mocked: true,
    handle: ({ body }) => {
      attempts.delete(text(body, 'mobile'));
      return { message: 'OTP sent', otp: DEMO_OTP };
    },
  },

  'POST /auth/forgot-password/verify-otp': {
    mocked: true,
    handle: ({ body }) => {
      const mobile = text(body, 'mobile');
      const used = (attempts.get(mobile) ?? 0) + 1;
      if (used > MAX_OTP_ATTEMPTS) throw new ApiError(429, 'Too many attempts');
      attempts.set(mobile, used);
      if (text(body, 'otp') === WRONG_OTP_DEMO) throw new ApiError(401, 'Invalid OTP');
      attempts.delete(mobile);
      return { resetToken: `mock-reset-${mobile}` };
    },
  },

  'POST /auth/forgot-password/reset': {
    mocked: true,
    handle: ({ body }) => {
      const token = text(body, 'resetToken');
      if (!token.startsWith('mock-reset-')) throw new ApiError(401, 'Reset session expired');
      const mobile = token.replace('mock-reset-', '');
      const password = text(body, 'password');
      const previous = history.get(mobile) ?? [];
      if (previous.includes(password)) throw new ApiError(409, 'Password recently used');
      history.set(mobile, [password, ...previous].slice(0, PASSWORD_HISTORY));
      return { message: 'Password updated' };
    },
  },

  'POST /account/username/check': {
    mocked: true,
    latencyMs: 250,
    handle: ({ body }) => {
      const username = text(body, 'username');
      const available = !TAKEN_USERNAMES.has(username);
      return { available, suggestions: available ? [] : [`${username}_`, `${username}.official`, `${username}7`] };
    },
  },

  'POST /account/username': {
    mocked: true,
    handle: ({ body }) => {
      const username = text(body, 'username');
      if (TAKEN_USERNAMES.has(username)) throw new ApiError(409, 'Username taken');
      TAKEN_USERNAMES.add(username);
      return { username };
    },
  },

  'POST /account/consent': {
    mocked: true,
    handle: ({ body }) => ({ version: text(body, 'version'), acceptedAt: new Date().toISOString() }),
  },
});
