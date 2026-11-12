import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { PersonRow } from '@/features/social/components/PersonRow';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { Feedback } from '@/lib/haptics';
import { SocialService } from '@/services/social-service';

type Side = 'followers' | 'following';

const TABS = [
  { key: 'followers', label: 'Followers' },
  { key: 'following', label: 'Following' },
] as const satisfies readonly { key: Side; label: string }[];

function People({ owner, side }: { owner: string; side: Side }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => SocialService[side](token, owner, cursor));
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (id: string, on: boolean) => {
    setBusy(id);
    list.setItems((items) => items.map((p) => (p.id === id ? { ...p, followedByMe: on } : p)));
    try {
      await SocialService.follow(token, id, on);
      Feedback.select();
    } catch {
      Feedback.error();
      list.setItems((items) => items.map((p) => (p.id === id ? { ...p, followedByMe: !on } : p)));
    } finally {
      setBusy(null);
    }
  };

  if (list.loading) {
    return (
      <View style={styles.skeletons}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={52} radius={14} />
        ))}
      </View>
    );
  }
  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load this list" actionLabel="Try again" onAction={list.retry} />;
  }
  return (
    <FlatList
      data={list.items}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.list}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.6}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      ListEmptyComponent={
        <EmptyState icon="people-outline" title={side === 'followers' ? 'No followers yet' : 'Not following anyone yet'} />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      renderItem={({ item }) => (
        <PersonRow
          person={item}
          onPress={item.me ? undefined : () => router.push({ pathname: '/(customer)/user/[id]', params: { id: item.id } })}
          right={
            item.me ? null : (
              <Chip label={item.followedByMe ? 'Following' : 'Follow'} disabled={busy === item.id} onPress={() => toggle(item.id, !item.followedByMe)} />
            )
          }
        />
      )}
    />
  );
}

/** Who someone follows and who follows them, with Follow on each person. `id` is a user id or username. */
export function FollowListScreen() {
  const router = useRouter();
  const { id, side: initial, title } = useLocalSearchParams<{ id: string; side?: Side; title?: string }>();
  const [side, setSide] = useState<Side>(initial === 'following' ? 'following' : 'followers');
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title={title || 'People'} onBack={() => router.back()} />
        <SegmentedTabs options={TABS} value={side} onChange={setSide} />
      </View>
      <People key={side} owner={id} side={side} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.two },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  footer: { paddingVertical: Spacing.three },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
});
