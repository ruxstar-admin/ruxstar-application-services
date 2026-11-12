import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { VendorTabScreen } from '@/features/vendor/components/VendorTabScreen';
import { ProfilePosts } from '@/features/social/components/ProfilePosts';
import { useFeedStore } from '@/features/social/stores/feed-store';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ProfileService } from '@/services/profile-service';

/** The vendor's business posts (their profile's Business tab), and Post as business. */
export function VendorPostsScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const me = useAsyncResource(() => ProfileService.getMe(token));
  const version = useFeedStore((s) => s.version);
  const create = () => router.push({ pathname: '/(customer)/create-post', params: { kind: 'business' } });

  return (
    <VendorTabScreen title="Posts" onRefresh={me.reload}>
      <PrimaryButton label="Post as business" onPress={create} />
      <AsyncBoundary loading={me.loading} error={me.error} hasData={!!me.data} onRetry={me.reload} skeletonRows={3}>
        {me.data ? (
          <ProfilePosts
            key={`business-${version}`}
            owner={me.data.id}
            kind="business"
            empty={{ icon: 'megaphone-outline', title: 'No business posts yet', message: 'Offers and updates you post show on your Business tab and in the feed.' }}
          />
        ) : null}
      </AsyncBoundary>
    </VendorTabScreen>
  );
}
