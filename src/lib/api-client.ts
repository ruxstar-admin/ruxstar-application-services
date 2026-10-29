import Constants from 'expo-constants';
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
  token?: string;
  query?: Query;
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

const realRequest = async <T>({ method, path, body, token, query }: RequestOptions): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${withQuery(path, query)}`, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      headers: {
        ...CLIENT_HEADERS,
        // An empty body with a JSON content type is a 400 on the API, so the header goes only with a body.
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (err) {
    throw err instanceof Error && err.name === 'AbortError' ? ApiError.timeout() : ApiError.network();
  } finally {
    clearTimeout(timer);
  }

  const parsed = await res.json().catch(() => ({}));
  if (!res.ok) throw toApiError(res.status, parsed);
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

export const apiPost = <T>(path: string, body?: Json, token?: string): Promise<T> =>
  request<T>({ method: 'POST', path, body, token });

export const apiGet = <T>(path: string, token?: string, query?: Query): Promise<T> => request<T>({ method: 'GET', path, token, query });

export const apiPatch = <T>(path: string, body: Json, token: string): Promise<T> => request<T>({ method: 'PATCH', path, body, token });

export const apiDelete = <T>(path: string, token: string): Promise<T> => request<T>({ method: 'DELETE', path, token });
