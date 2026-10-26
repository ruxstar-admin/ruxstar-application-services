import { apiPost } from '@/lib/api-client';
import type { UsernameCheckResponse } from '@/types/auth';

/** Profile identity endpoints. Not in the backend yet — mocked in `src/services/mock/auth.mocks.ts`. */
export const AccountService = {
  checkUsername: (username: string) => apiPost<UsernameCheckResponse>('/account/username/check', { username }),

  setUsername: (token: string, username: string) => apiPost<{ username: string }>('/account/username', { username }, token),

  acceptConsent: (token: string, version: string) =>
    apiPost<{ version: string; acceptedAt: string }>('/account/consent', { version }, token),
};
