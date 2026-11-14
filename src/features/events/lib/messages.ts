import { ApiError } from '@/lib/api-error';

/** The API's own words when it explains, otherwise a line about the connection. */
export const errorText = (err: unknown) =>
  err instanceof ApiError && err.kind !== 'network' && err.kind !== 'timeout' && err.kind !== 'server'
    ? err.message
    : 'Could not reach Ruxstar. Check your connection and try again.';

export const isOffline = (err: unknown) => err instanceof ApiError && (err.kind === 'network' || err.kind === 'timeout');
