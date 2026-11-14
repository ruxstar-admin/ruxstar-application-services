import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { ReportSheet } from '@/features/moderation/components/ReportSheet';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { ProfilePosts } from '@/features/social/components/ProfilePosts';
import { useFeedStore } from '@/features/social/stores/feed-store';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { ProfileService } from '@/services/profile-service';
import { SocialService } from '@/services/social-service';
import { USER_REPORT_REASONS, type Relation } from '@/types/social';

const TABS = [
  { key: 'personal', label: 'Personal' },
  { key: 'business', label: 'Business' },
] as const;

/**
 * Someone else's profile and their posts, with a Business tab when they are a vendor. Follow is
 * open (no request). The "…" menu blocks or reports them; a block hides both of you from each other.
 */
export function UserProfileScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const markFeedDirty = useFeedStore((s) => s.markDirty);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => ProfileService.getUser(token, id));
  const relation = useAsyncResource(() => SocialService.relation(token, id));
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('personal');
  const [menuOpen, setMenuOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const vendor = !!data?.badges.includes('vendor');
  const rel = relation.data;
  const blocked = !!rel?.blockedByMe;

  const apply = (next: Relation) => {
    relation.setData(next);
    markFeedDirty();
  };

  const toggleFollow = async () => {
    if (!data || !rel) return;
    const on = !rel.following;
    const before = rel;
    const followers = Math.max(0, rel.counts.followers + (on ? 1 : -1));
    relation.setData({ ...rel, following: on, counts: { ...rel.counts, followers } });
    try {
      apply(await SocialService.follow(token, data.id, on));
      Feedback.select();
    } catch {
      Feedback.error();
      relation.setData(before);
    }
  };

  const setBlock = async (on: boolean) => {
    if (!data) return;
    setBusy(true);
    try {
      apply(await SocialService.block(token, data.id, on));
      Feedback.success();
      setBlocking(false);
    } catch {
      Feedback.error();
    } finally {
      setBusy(false);
    }
  };

  /**
   * Opens your chat with them at once; the chat screen finds it, or starts it, while showing who it's with. If they
   * don't follow you, your first message reaches them as a request.
   */
  const message = () => {
    if (!data) return;
    router.push({
      pathname: '/(customer)/chat/with/[userId]',
      params: { userId: data.id, title: data.name || data.username, username: data.username, avatar: data.avatarUrl ?? '' },
    });
  };

  const profile = data && rel ? { ...data, followers: rel.counts.followers, following: rel.counts.following } : data;
  // Deleted accounts and people who blocked you both answer NOT_FOUND; it isn't a connection problem.
  const unavailable = error instanceof ApiError && error.code === 'NOT_FOUND';

  return (
    <ScreenContainer title={data ? `@${data.username}` : 'Profile'}>
      {unavailable ? <EmptyState icon="person-remove-outline" title="This account isn't available" message="It may have been deleted, or it isn't available to you." /> : null}
      <AsyncBoundary loading={loading} error={unavailable ? null : error} hasData={!!data || unavailable} onRetry={reload} skeletonRows={3}>
        {data && profile ? (
          <>
            <ProfileHeader
              profile={profile}
              name={data.name}
              onOpenPeople={
                blocked ? undefined : (side) => router.push({ pathname: '/(customer)/people/[id]', params: { id: data.id, side, title: `@${data.username}` } })
              }
            />
            <View style={styles.actions}>
              {blocked ? (
                <View style={styles.grow}>
                  <PrimaryButton label="Unblock" variant="outline" onPress={() => setBlock(false)} loading={busy} />
                </View>
              ) : (
                <>
                  <View style={styles.grow}>
                    <PrimaryButton
                      label={rel?.following ? 'Following' : rel?.followsMe ? 'Follow back' : 'Follow'}
                      variant={rel?.following ? 'outline' : undefined}
                      onPress={toggleFollow}
                      disabled={!rel}
                    />
                  </View>
                  <View style={styles.grow}>
                    <PrimaryButton label="Message" variant="outline" onPress={message} />
                  </View>
                </>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="More options"
                onPress={() => {
                  Feedback.tap();
                  setMenuOpen(true);
                }}
                style={({ pressed }) => [styles.more, pressed && styles.morePressed]}
              >
                <Ionicons name="ellipsis-horizontal" size={22} color={Brand.text} />
              </Pressable>
            </View>
            {blocked ? (
              <Text style={styles.note}>You blocked @{data.username}. Neither of you can see the other&apos;s posts, comment, follow or message.</Text>
            ) : vendor ? (
              <SegmentedTabs options={TABS} value={tab} onChange={setTab} />
            ) : null}
          </>
        ) : null}
      </AsyncBoundary>
      {error || blocked ? null : (
        <View style={styles.posts}>
          {vendor && tab === 'business' ? (
            <ProfilePosts key="business" owner={id} kind="business" empty={{ icon: 'storefront-outline', title: 'No business posts yet' }} />
          ) : (
            <ProfilePosts key="personal" owner={id} kind="personal" empty={{ icon: 'images-outline', title: 'No posts yet' }} />
          )}
        </View>
      )}

      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <ListRow
          icon="ban-outline"
          title={blocked ? `Unblock @${data?.username ?? ''}` : `Block @${data?.username ?? ''}`}
          destructive={!blocked}
          onPress={() => {
            setMenuOpen(false);
            if (blocked) void setBlock(false);
            else setBlocking(true);
          }}
        />
        <ListRow
          icon="flag-outline"
          title="Report"
          onPress={() => {
            setMenuOpen(false);
            setReporting(true);
          }}
        />
      </BottomSheet>

      <ConfirmSheet
        visible={blocking}
        title={`Block ${data?.name ?? 'them'}?`}
        message="You won't see each other's posts, comments or profile, and you'll stop following each other. They won't be told."
        confirmLabel="Block"
        loading={busy}
        onConfirm={() => setBlock(true)}
        onCancel={() => setBlocking(false)}
      />

      <ReportSheet
        visible={reporting}
        onClose={() => setReporting(false)}
        title={`Report ${data?.name ?? ''}`}
        subject={data?.name ?? ''}
        reasons={USER_REPORT_REASONS}
        onReport={(reason) => (data ? SocialService.reportUser(token, data.id, reason) : Promise.resolve())}
        onBlock={blocked || !data ? undefined : async () => apply(await SocialService.block(token, data.id, true))}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  grow: { flex: 1 },
  more: { width: 56, height: 56, borderRadius: Radius.pill, borderWidth: 1, borderColor: Brand.border, alignItems: 'center', justifyContent: 'center' },
  morePressed: { backgroundColor: Brand.surfaceAlt },
  note: { ...Typography.body, color: Brand.textMuted, marginTop: Spacing.three },
  posts: { marginTop: Spacing.two },
});
