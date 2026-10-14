import { API_BASE_URL } from '@/constants/config';
import { ApiError } from './api-error';

type Json = Record<string, unknown>;

const REQUEST_TIMEOUT_MS = 15_000;

const request = async <T>(path: string, init: RequestInit): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch (err) {
    throw err instanceof Error && err.name === 'AbortError' ? ApiError.timeout() : ApiError.network();
  } finally {
    clearTimeout(timer);
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = typeof body?.message === 'string' ? body.message : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }

  return body as T;
};

export const apiPost = <T>(path: string, body?: Json, token?: string): Promise<T> =>
  request<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

export const apiGet = <T>(path: string, token?: string): Promise<T> =>
  request<T>(path, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
