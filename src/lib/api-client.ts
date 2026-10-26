import { API_BASE_URL } from '@/constants/config';
import { createLogger } from '@/lib/logger';
import { findMock, runMock, type HttpMethod } from '@/services/mock';
import { ApiError } from './api-error';

type Json = Record<string, unknown>;

const REQUEST_TIMEOUT_MS = 15_000;
const log = createLogger('api');

interface RequestOptions {
  method: HttpMethod;
  path: string;
  body?: Json;
  token?: string;
}

const realRequest = async <T>({ method, path, body, token }: RequestOptions): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch (err) {
    throw err instanceof Error && err.name === 'AbortError' ? ApiError.timeout() : ApiError.network();
  } finally {
    clearTimeout(timer);
  }

  const parsed = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = typeof parsed?.message === 'string' ? parsed.message : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }

  return parsed as T;
};

/** Routes through a mock when one is active for this endpoint, otherwise the real API. */
const request = async <T>(options: RequestOptions): Promise<T> => {
  const { method, path, body, token } = options;
  const started = Date.now();
  const mock = findMock(method, path);

  try {
    const result = mock ? ((await runMock(mock, { path, body, token })) as T) : await realRequest<T>(options);
    log.debug(`${method} ${path} ok`, { mocked: !!mock, ms: Date.now() - started });
    return result;
  } catch (err) {
    log.warn(`${method} ${path} failed`, {
      mocked: !!mock,
      ms: Date.now() - started,
      status: err instanceof ApiError ? err.status : undefined,
    });
    throw err;
  }
};

export const apiPost = <T>(path: string, body?: Json, token?: string): Promise<T> =>
  request<T>({ method: 'POST', path, body, token });

export const apiGet = <T>(path: string, token?: string): Promise<T> => request<T>({ method: 'GET', path, token });
