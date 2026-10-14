import * as Sentry from '@sentry/react-native';
import { ApiError } from '@/lib/api-error';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** Keys whose values must never leave the device, even inside breadcrumbs or request bodies. */
const SENSITIVE_KEY = /pass(word)?|otp|token|authorization|mobile|phone/i;

const scrub = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, SENSITIVE_KEY.test(key) ? '[redacted]' : scrub(v)]),
    );
  }
  return value;
};

/** No-op when no DSN is configured (local dev, CI), so the app never depends on Sentry being reachable. */
export const initMonitoring = () => {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    enabled: !__DEV__,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend: (event) => scrub(event) as typeof event,
    beforeBreadcrumb: (breadcrumb) => scrub(breadcrumb) as typeof breadcrumb,
  });
};

/**
 * Report only failures that are our problem. Wrong passwords, bad OTPs, offline users and
 * rate limits are expected user states, not bugs.
 */
export const reportError = (err: unknown, context: string) => {
  if (err instanceof ApiError && !['server', 'unknown'].includes(err.kind)) return;
  Sentry.captureException(err, { tags: { context } });
};

export const wrapRoot = Sentry.wrap;
