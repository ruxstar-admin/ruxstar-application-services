import { MOCK_MODE, type MockMode } from '@/constants/config';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface MockRequest {
  path: string;
  body?: Record<string, unknown>;
  token?: string;
  query?: Record<string, string | number | undefined>;
}

export interface MockRoute {
  /** true while the backend endpoint does not exist. Flip to false the day it ships — nothing else changes. */
  mocked: boolean;
  /** Return the response body, or throw an `ApiError` to simulate a failure. */
  handle: (req: MockRequest) => unknown | Promise<unknown>;
  latencyMs?: number;
}

const DEFAULT_LATENCY_MS = 350;
const routes = new Map<string, MockRoute>();

const key = (method: HttpMethod, path: string) => `${method} ${path}`;

/** Registers mock handlers keyed `'POST /kyc/submit'`. Called once per `*.mocks.ts` file. */
export const defineMocks = (definitions: Record<string, MockRoute>) => {
  Object.entries(definitions).forEach(([route, definition]) => routes.set(route, definition));
};

/** The mock to use for this call under the given mode, or undefined to hit the real API. */
export const findMock = (method: HttpMethod, path: string, mode: MockMode = MOCK_MODE): MockRoute | undefined => {
  if (mode === 'off') return undefined;
  const route = routes.get(key(method, path));
  if (!route) return undefined;
  return mode === 'all' || route.mocked ? route : undefined;
};

export const runMock = async (route: MockRoute, req: MockRequest) => {
  await new Promise((resolve) => setTimeout(resolve, route.latencyMs ?? DEFAULT_LATENCY_MS));
  return route.handle(req);
};
