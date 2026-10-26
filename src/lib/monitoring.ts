import type { ComponentType } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ApiError } from '@/lib/api-error';
import { redact } from '@/lib/redact';

type SentryModule = typeof import('@sentry/react-native');

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

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
      beforeSend: (event) => redact(event) as typeof event,
      beforeBreadcrumb: (breadcrumb) => redact(breadcrumb) as typeof breadcrumb,
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

/** Adds a breadcrumb to the next Sentry event. `data` must already be redacted. Never throws. */
export const addBreadcrumb = (category: string, message: string, level: 'info' | 'warn' | 'error', data?: unknown) => {
  try {
    getSentry()?.addBreadcrumb({
      category,
      message,
      level: level === 'warn' ? 'warning' : level,
      data: data as Record<string, unknown> | undefined,
    });
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
