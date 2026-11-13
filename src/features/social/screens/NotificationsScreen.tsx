import { useEffect } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { NotificationRow } from '@/features/social/components/NotificationRow';
import { notificationHref } from '@/features/social/lib/notification-target';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { SocialService } from '@/services/social-service';
import type { AppNotification } from '@/types/social';

export function NotificationsScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => SocialService.notifications(token, cursor));
  const { loading, error } = list;

  // Opening the centre marks everything read on the server; the dots stay for this visit so new items are easy to spot.
  useEffect(() => {
    if (!loading && !error) SocialService.markRead(token).catch(() => undefined);
  }, [loading, error, token]);

  const openerFor = (n: AppNotification): (() => void) | undefined => {
    const href = notificationHref(n);
    return href ? () => router.push(href) : undefined;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Notifications" onBack={() => router.back()} />
      </View>

      {loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={64} radius={14} />
          ))}
        </View>
      ) : error && list.items.length === 0 ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load notifications" actionLabel="Try again" onAction={list.retry} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <NotificationRow notification={item} onOpen={openerFor(item)} />
          )}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
          contentContainerStyle={styles.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<EmptyState icon="notifications-off-outline" title="You are all caught up" message="Likes and comments on your posts show up here." />}
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
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
