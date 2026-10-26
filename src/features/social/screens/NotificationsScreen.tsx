import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { NotificationRow } from '@/features/social/components/NotificationRow';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { Feedback } from '@/lib/haptics';
import { SocialService } from '@/services/social-service';

export function NotificationsScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => SocialService.notifications(token, cursor));
  const [busyId, setBusyId] = useState<string | null>(null);
  const { loading, error, setItems } = list;

  // Opening the centre marks everything read on the server; the dots stay for this visit so new items are easy to spot.
  useEffect(() => {
    if (!loading && !error) SocialService.markRead(token).catch(() => undefined);
  }, [loading, error, token]);

  const respond = async (id: string, accept: boolean) => {
    setBusyId(id);
    try {
      await SocialService.respond(token, id, accept);
      Feedback.success();
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, actionable: false, read: true } : n)));
    } catch {
      Feedback.error();
    } finally {
      setBusyId(null);
    }
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
          renderItem={({ item }) => <NotificationRow notification={item} busy={busyId === item.id} onRespond={(n, accept) => respond(n.id, accept)} />}
          contentContainerStyle={styles.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<EmptyState icon="notifications-off-outline" title="You are all caught up" message="Offers, orders and reminders show up here." />}
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
