import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { FreelanceService, GigsService } from '@/services/gigs-service';
import { useAuthStore } from '@/stores/auth-store';
import type { GigsRules, MyFreelancer } from '@/types/gigs';
import { limitsOf } from '../lib/files';

/** The rules change only when the Ruxstar team edits them; a few minutes old is fine. */
const RULES_FRESH_MS = 5 * 60_000;
let rules: { at: number; value: GigsRules } | null = null;

export function useGigsRules() {
  const token = useAuthToken();
  return useAsyncResource(async () => {
    if (rules && Date.now() - rules.at < RULES_FRESH_MS) return rules.value;
    const value = await GigsService.rules(token);
    rules = { at: Date.now(), value };
    return value;
  });
}

/** The API's fixed limits, from the rules once they're loaded. */
export function useGigLimits() {
  return limitsOf(useGigsRules().data);
}

/** People who haven't started freelancing aren't asked again this session, so chats don't each look it up. */
let notStarted: string | null = null;

/** Your freelancer profile, or null until you start. */
export async function loadMyFreelancer(token: string, userId: string | null): Promise<MyFreelancer | null> {
  if (userId && notStarted === userId) return null;
  try {
    const profile = await FreelanceService.me(token);
    notStarted = null;
    return profile;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.code === 'NOT_FOUND')) {
      notStarted = userId;
      return null;
    }
    throw err;
  }
}

/** Call after starting, so the next look-up asks the API again. */
export const freelancerStarted = () => {
  notStarted = null;
};

/** Your freelancer profile; `skip` answers null without asking, for screens that only sometimes need it. */
export function useMyFreelancer(skip = false) {
  const token = useAuthToken();
  const userId = useAuthStore((s) => s.userId);
  return useAsyncResource(() => (skip ? Promise.resolve(null) : loadMyFreelancer(token, userId)), skip ? 'skip' : 'load');
}
