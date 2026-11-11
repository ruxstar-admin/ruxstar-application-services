import Constants from 'expo-constants';
import { fetch as expoFetch } from 'expo/fetch';
import { API_BASE_URL } from '@/constants/config';
import { createLogger } from '@/lib/logger';
import { findMock, runMock, type HttpMethod } from '@/services/mock';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthTokens } from '@/types/auth';
import { ApiError, type ApiErrorDetail } from './api-error';

type Json = Record<string, unknown>;
type Query = Record<string, string | number | undefined>;

const REQUEST_TIMEOUT_MS = 15_000;
const REFRESH_PATH = '/v1/account/refresh';
/** The API refuses `/v1` calls without these, and answers 426 when the app is below its minimum version. */
const CLIENT_HEADERS = { 'X-Client': 'app', 'X-App-Version': Constants.expoConfig?.version ?? '1.0.0' };
const log = createLogger('api');

interface RequestOptions {
  method: HttpMethod;
  path: string;
  body?: Json;
  /** A file sent as the whole body, such as a photo. */
  bytes?: { data: Uint8Array<ArrayBuffer>; type: string };
  token?: string;
  query?: Query;
  /** Resolve to the whole `{ data, meta }` envelope instead of just `data`. */
  envelope?: boolean;
  /** Sent as `Idempotency-Key`. Reuse the same key when retrying the same action, so it is applied once. */
  idempotencyKey?: string;
}

/** Extra options for writes. */
export interface WriteOptions {
  idempotencyKey?: string;
}

const withQuery = (path: string, query?: Query) => {
  const pairs = Object.entries(query ?? {}).filter((pair): pair is [string, string | number] => pair[1] !== undefined && pair[1] !== '');
  if (!pairs.length) return path;
  return `${path}?${pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')}`;
};

/** Reads `{ error: { code, message, details } }`. Bodies in any other shape keep the status-based kind. */
const toApiError = (status: number, parsed: unknown): ApiError => {
  const error = (parsed as { error?: { code?: unknown; message?: unknown; details?: unknown } } | null)?.error;
  const message = typeof error?.message === 'string' ? error.message : `Request failed (${status})`;
  const code = typeof error?.code === 'string' ? error.code : '';
  const details = Array.isArray(error?.details) ? (error.details as ApiErrorDetail[]) : [];
  return new ApiError(status, message, undefined, code, details);
};

const realRequest = async <T>({ method, path, body, bytes, token, query, envelope, idempotencyKey }: RequestOptions): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const url = `${API_BASE_URL}${withQuery(path, query)}`;
  const headers = {
    ...CLIENT_HEADERS,
    // An empty body with a JSON content type is a 400 on the API, so the header goes only with a body.
    ...(bytes ? { 'Content-Type': bytes.type } : body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
  };

  let res: Pick<Response, 'ok' | 'status' | 'json'>;
  try {
    // React Native's fetch cannot send binary bodies; expo/fetch can.
    res = bytes
      ? await expoFetch(url, { method, body: bytes.data, signal: controller.signal, headers })
      : await fetch(url, { method, body: body ? JSON.stringify(body) : undefined, signal: controller.signal, headers });
  } catch (err) {
    throw err instanceof Error && err.name === 'AbortError' ? ApiError.timeout() : ApiError.network();
  } finally {
    clearTimeout(timer);
  }

  const parsed = await res.json().catch(() => ({}));
  if (!res.ok) throw toApiError(res.status, parsed);
  if (envelope) return parsed as T;
  return (parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed) as T;
};

let refreshing: Promise<string | null> | null = null;

/**
 * Swaps the refresh token for a new pair. Refresh tokens work once, so parallel 401s share one call.
 * Resolves to the new access token, or null when the session is over.
 */
const refreshAccessToken = (): Promise<string | null> => {
  refreshing ??= (async () => {
    const { refreshToken, setTokens, clearAuth } = useAuthStore.getState();
    if (!refreshToken) return null;
    try {
      const result = await realRequest<{ tokens?: AuthTokens }>({ method: 'POST', path: REFRESH_PATH, body: { refreshToken } });
      if (!result.tokens) return null;
      setTokens(result.tokens);
      return result.tokens.accessToken;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) clearAuth();
      return null;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
};

/** Signed-in calls retry once with a fresh access token when the current one has expired. */
const authedRequest = async <T>(options: RequestOptions): Promise<T> => {
  try {
    return await realRequest<T>(options);
  } catch (err) {
    // Only an expired or missing session; a wrong current password is also a 401.
    if (!options.token || !(err instanceof ApiError) || err.code !== 'UNAUTHENTICATED') throw err;
    const fresh = await refreshAccessToken();
    if (!fresh) throw err;
    return realRequest<T>({ ...options, token: fresh });
  }
};

/** Routes through a mock when one is active for this endpoint, otherwise the real API. */
const request = async <T>(options: RequestOptions): Promise<T> => {
  const { method, path, body, token } = options;
  const started = Date.now();
  const mock = findMock(method, path);

  try {
    const result = mock ? ((await runMock(mock, { path, body, token, query: options.query })) as T) : await authedRequest<T>(options);
    log.debug(`${method} ${path} ok`, { mocked: !!mock, ms: Date.now() - started });
    return result;
  } catch (err) {
    log.warn(`${method} ${path} failed`, {
      mocked: !!mock,
      ms: Date.now() - started,
      status: err instanceof ApiError ? err.status : undefined,
      code: err instanceof ApiError ? err.code || undefined : undefined,
    });
    throw err;
  }
};

export const apiPost = <T>(path: string, body?: Json, token?: string, options?: WriteOptions): Promise<T> =>
  request<T>({ method: 'POST', path, body, token, ...options });

export const apiGet = <T>(path: string, token?: string, query?: Query): Promise<T> => request<T>({ method: 'GET', path, token, query });

/** A list endpoint: its items and the cursor for the next page (null on the last one). */
export const apiGetPage = async <T>(path: string, token?: string, query?: Query): Promise<{ items: T[]; nextCursor: string | null }> => {
  const { data, meta } = await request<{ data: T[]; meta?: { nextCursor?: string | null } }>({ method: 'GET', path, token, query, envelope: true });
  return { items: data, nextCursor: meta?.nextCursor ?? null };
};

export const apiPut = <T>(path: string, token: string, body?: Json, options?: WriteOptions): Promise<T> =>
  request<T>({ method: 'PUT', path, body, token, ...options });

export const apiPostBytes = <T>(path: string, bytes: NonNullable<RequestOptions['bytes']>, token: string): Promise<T> =>
  request<T>({ method: 'POST', path, bytes, token });

export const apiPatch = <T>(path: string, body: Json, token: string, options?: WriteOptions): Promise<T> =>
  request<T>({ method: 'PATCH', path, body, token, ...options });

export const apiDelete = <T>(path: string, token: string, body?: Json, options?: WriteOptions): Promise<T> =>
  request<T>({ method: 'DELETE', path, body, token, ...options });

/** A fresh `Idempotency-Key`: one per user action, kept for that action's retries. */
export const newIdempotencyKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;

export const apiPutBytes = <T>(path: string, bytes: NonNullable<RequestOptions['bytes']>, token: string): Promise<T> =>
  request<T>({ method: 'PUT', path, bytes, token });
