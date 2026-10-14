import type { ComponentType } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ApiError } from '@/lib/api-error';

type SentryModule = typeof import('@sentry/react-native');

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

let sentry: SentryModule | null = null;
let loaded = false;

/**
 * Sentry has a native module, which Expo Go doesn't ship. It is therefore loaded lazily, never in
 * Expo Go, and any failure to load or init is swallowed: monitoring must never be able to break the app.
 */
const getSentry = (): SentryModule | null => {
  if (loaded) return sentry;
  loaded = true;
  if (!DSN || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sentry = require('@sentry/react-native') as SentryModule;
  } catch {
    sentry = null;
  }
  return sentry;
};

export const initMonitoring = () => {
  try {
    getSentry()?.init({
      dsn: DSN,
      enabled: !__DEV__,
      sendDefaultPii: false,
      tracesSampleRate: 0.1,
      beforeSend: (event) => scrub(event) as typeof event,
      beforeBreadcrumb: (breadcrumb) => scrub(breadcrumb) as typeof breadcrumb,
    });
  } catch {
    sentry = null;
  }
};

/**
 * Report only failures that are our problem. Wrong passwords, bad OTPs, offline users and
 * rate limits are expected user states, not bugs. Never throws.
 */
export const reportError = (err: unknown, context: string) => {
  try {
    if (err instanceof ApiError && !['server', 'unknown'].includes(err.kind)) return;
    getSentry()?.captureException(err, { tags: { context } });
  } catch {
    // Monitoring is best-effort.
  }
};

/** Wraps the root component for Sentry's navigation/touch instrumentation; returns it untouched if unavailable. */
export const wrapRoot = (Root: ComponentType): ComponentType => {
  try {
    return getSentry()?.wrap(Root) ?? Root;
  } catch {
    return Root;
  }
};
