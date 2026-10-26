import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { timeAgo } from '@/lib/time';
import { VendorService } from '@/services/vendor-service';

/** Read-only history of every action on the business, by the owner and by staff. */
export function AuditLogScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => VendorService.audit(token, cursor));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Audit log" onBack={() => router.back()} />
      </View>

      {list.loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={48} radius={12} />
          ))}
        </View>
      ) : list.error && list.items.length === 0 ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load the log" actionLabel="Try again" onAction={list.retry} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={styles.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.text}>
                <Text style={styles.actor}>{item.actor}</Text>
                {` ${item.action}`}
              </Text>
              <Text style={styles.time}>{timeAgo(item.at)}</Text>
            </View>
          )}
          ListEmptyComponent={<EmptyState icon="reader-outline" title="Nothing logged yet" />}
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
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three, paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Brand.border },
  text: { ...Typography.body, color: Brand.textMuted, flex: 1 },
  actor: { color: Brand.text, fontFamily: Typography.bodyStrong.fontFamily },
  time: { ...Typography.caption, color: Brand.textFaint },
  footer: { paddingVertical: Spacing.three },
});
