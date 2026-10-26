import { addBreadcrumb } from '@/lib/monitoring';
import { redact } from '@/lib/redact';

type Level = 'debug' | 'info' | 'warn' | 'error';

/**
 * Feature-tagged logger. Debug output goes to the console in dev only; info and above also become
 * Sentry breadcrumbs in release. Data is always redacted first, so callers can pass request bodies.
 */
export const createLogger = (tag: string) => {
  const log = (level: Level, message: string, data?: unknown) => {
    const safe = data === undefined ? undefined : redact(data);
    if (__DEV__) {
      console[level](`[${tag}] ${message}`, ...(safe === undefined ? [] : [safe]));
    }
    if (level !== 'debug') addBreadcrumb(tag, message, level, safe);
  };

  return {
    debug: (message: string, data?: unknown) => log('debug', message, data),
    info: (message: string, data?: unknown) => log('info', message, data),
    warn: (message: string, data?: unknown) => log('warn', message, data),
    error: (message: string, data?: unknown) => log('error', message, data),
  };
};
