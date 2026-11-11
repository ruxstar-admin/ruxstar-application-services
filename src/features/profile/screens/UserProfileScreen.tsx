import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Spacing } from '@/constants/theme';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { ProfilePosts } from '@/features/social/components/ProfilePosts';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ProfileService } from '@/services/profile-service';

const TABS = [
  { key: 'personal', label: 'Personal' },
  { key: 'business', label: 'Business' },
] as const;

/**
 * Someone else's profile and their posts, with a Business tab when they are a vendor. The posts
 * load alongside the profile: the id in the route is all they need. Reporting a person and
 * blocking come with the moderation API.
 */
export function UserProfileScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => ProfileService.getUser(token, id));
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('personal');
  const vendor = !!data?.badges.includes('vendor');

  return (
    <ScreenContainer title={data ? `@${data.username}` : 'Profile'}>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={3}>
        {data ? (
          <>
            <ProfileHeader profile={data} name={data.name} />
            <View style={styles.actions}>
              <PrimaryButton label="Message" onPress={() => router.push('/(customer)/(tabs)/messages')} />
            </View>
            {vendor ? <SegmentedTabs options={TABS} value={tab} onChange={setTab} /> : null}
          </>
        ) : null}
      </AsyncBoundary>
      {error ? null : (
        <View style={styles.posts}>
          {vendor && tab === 'business' ? (
            <ProfilePosts key="business" owner={id} kind="business" empty={{ icon: 'storefront-outline', title: 'No business posts yet' }} />
          ) : (
            <ProfilePosts key="personal" owner={id} kind="personal" empty={{ icon: 'images-outline', title: 'No posts yet' }} />
          )}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actions: { marginTop: Spacing.three },
  posts: { marginTop: Spacing.two },
});
