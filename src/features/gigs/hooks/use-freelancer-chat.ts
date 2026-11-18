import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import type { FreelancerRef } from '@/types/gigs';

/** Opens your chat with a freelancer, or null on your own gig. */
export function useFreelancerChat(freelancer: Pick<FreelancerRef, 'userId' | 'username' | 'name' | 'avatarUrl'>): (() => void) | null {
  const router = useRouter();
  const me = useAuthStore((s) => s.userId);
  if (freelancer.userId === me) return null;
  return () =>
    router.push({
      pathname: '/(customer)/chat/with/[userId]',
      params: { userId: freelancer.userId, title: freelancer.name, username: freelancer.username ?? '', avatar: freelancer.avatarUrl ?? '' },
    });
}
