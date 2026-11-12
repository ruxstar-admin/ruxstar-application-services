import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { PersonRow } from '@/features/social/components/PersonRow';
import { useFeedStore } from '@/features/social/stores/feed-store';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { Feedback } from '@/lib/haptics';
import { SocialService } from '@/services/social-service';
import type { Person } from '@/types/social';

/** People you blocked, most recent first. Unblocking doesn't bring back the follows that ended. */
export function BlockedUsersScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const markFeedDirty = useFeedStore((s) => s.markDirty);
  const list = usePaginated((cursor) => SocialService.blocked(token, cursor));
  const [busy, setBusy] = useState<string | null>(null);

  const unblock = async (person: Person) => {
    setBusy(person.id);
    try {
      await SocialService.block(token, person.id, false);
      Feedback.success();
      list.setItems((items) => items.filter((p) => p.id !== person.id));
      markFeedDirty();
    } catch {
      Feedback.error();
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Blocked accounts" onBack={() => router.back()} />
      </View>
      {list.loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={52} radius={14} />
          ))}
        </View>
      ) : list.error && list.items.length === 0 ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load blocked accounts" actionLabel="Try again" onAction={list.retry} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.6}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
          ListEmptyComponent={
            <EmptyState icon="happy-outline" title="No blocked accounts" message="People you block can't see your posts, comment, follow or message you." />
          }
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
          renderItem={({ item }) => (
            <PersonRow
              person={item}
              onPress={() => router.push({ pathname: '/(customer)/user/[id]', params: { id: item.id } })}
              right={<Chip label="Unblock" disabled={busy === item.id} onPress={() => unblock(item)} />}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  footer: { paddingVertical: Spacing.three },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
});
