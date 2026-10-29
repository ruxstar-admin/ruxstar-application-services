import { apiGet } from '@/lib/api-client';
import type { UsernameCheckResponse } from '@/types/auth';

/** Username lookups. Works before signup: suggestions then come from `name`. Signed in, the API uses your own name. */
export const AccountService = {
  checkUsername: (username: string, name?: string, token?: string) =>
    apiGet<UsernameCheckResponse>('/v1/account/usernames', token, { check: username, name: name?.trim() || undefined }),
};
