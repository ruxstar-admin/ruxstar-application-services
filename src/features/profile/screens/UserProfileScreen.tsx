import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Spacing } from '@/constants/theme';
import { ReportSheet } from '@/features/moderation/components/ReportSheet';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { ProfilePosts } from '@/features/social/components/ProfilePosts';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ProfileService } from '@/services/profile-service';

const TABS = [
  { key: 'personal', label: 'Personal' },
  { key: 'business', label: 'Business' },
] as const;

/** Someone else's profile: message, report, and their posts, with a Business tab when they are a vendor. */
export function UserProfileScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => ProfileService.getUser(token, id));
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('personal');
  const [reporting, setReporting] = useState(false);

  return (
    <ScreenContainer title={data ? `@${data.username}` : 'Profile'}>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={3}>
        {data ? (
          <>
            <ProfileHeader profile={data} name={data.name} />
            <View style={styles.actions}>
              <View style={styles.action}>
                <PrimaryButton label="Message" onPress={() => router.push('/(customer)/(tabs)/messages')} />
              </View>
              <View style={styles.action}>
                <PrimaryButton label="Report" variant="outline" onPress={() => setReporting(true)} />
              </View>
            </View>
            {data.badges.includes('vendor') ? <SegmentedTabs options={TABS} value={tab} onChange={setTab} /> : null}
            <View style={styles.posts}>
              {data.badges.includes('vendor') && tab === 'business' ? (
                <ProfilePosts key="business" owner={data.id} kind="business" empty={{ icon: 'storefront-outline', title: 'No business posts yet' }} />
              ) : (
                <ProfilePosts key="personal" owner={data.id} kind="personal" empty={{ icon: 'images-outline', title: 'No posts yet' }} />
              )}
            </View>
            <ReportSheet
              visible={reporting}
              onClose={() => setReporting(false)}
              title={`Report ${data.name}`}
              subject={data.name}
              onReport={(reason) => ProfileService.report(token, data.id, reason)}
              onBlock={() => ProfileService.block(token, { userId: data.id, name: data.name, username: data.username })}
            />
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  action: { flex: 1 },
  posts: { marginTop: Spacing.two },
});
