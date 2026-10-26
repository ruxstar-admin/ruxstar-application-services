const PRODUCTION_API_URL = 'https://ruxstar-backend-services-391710984982.us-central1.run.app';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? PRODUCTION_API_URL;

/**
 * `auto` (default): only routes flagged `mocked: true` in src/services/mock use their mock.
 * `all`: every route that has a mock uses it (offline demo). `off`: always call the real API.
 */
export type MockMode = 'auto' | 'all' | 'off';

const parseMockMode = (value: string | undefined): MockMode =>
  value === 'all' || value === 'off' ? value : 'auto';

export const MOCK_MODE = parseMockMode(process.env.EXPO_PUBLIC_USE_MOCKS);
