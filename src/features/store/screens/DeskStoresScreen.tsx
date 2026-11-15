import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { StoreDeskService } from '@/services/store-service';
import type { DeskStore } from '@/types/store';

function StoreRow({ store, onPress }: { store: DeskStore; onPress: () => void }) {
  const line = [store.open ? `${store.open} order${store.open === 1 ? '' : 's'} to handle` : 'No open orders', store.owner ? 'Yours' : 'Team'].join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${store.name}, ${line}${store.returns ? `, ${store.returns} returns` : ''}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name="bag-handle-outline" size={22} color={Brand.primarySoft} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {store.name}
        </Text>
        <Text style={styles.small} numberOfLines={1}>
          {line}
        </Text>
      </View>
      {store.returns ? <Badge label={`${store.returns} return${store.returns === 1 ? '' : 's'}`} tone="warning" /> : null}
      <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />
    </Pressable>
  );
}

/** The local shops you run, yours or your team's, each opening its orders queue. */
export function DeskStoresScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => StoreDeskService.stores(token), 'store-desk');
  useRefetchOnFocus(useCallback(() => reload(), [reload]));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Shop desk" onBack={() => router.back()} />
      </View>
      {loading && !data ? (
        <View style={styles.skeletons}>
          {[0, 1].map((i) => (
            <Skeleton key={i} height={72} radius={18} />
          ))}
        </View>
      ) : error && !data ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load your shops" actionLabel="Try again" onAction={reload} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={Brand.primarySoft} />}
          ListEmptyComponent={
            <EmptyState
              icon="bag-handle-outline"
              title="No shops to run"
              message="When a shop owner adds you to their team with shop permissions, their orders show up here."
            />
          }
          renderItem={({ item }) => <StoreRow store={item} onPress={() => router.push({ pathname: '/(customer)/store-desk/[id]', params: { id: item.id } })} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.two, flexGrow: 1 },
  skeletons: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  pressed: { opacity: 0.8 },
  icon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,92,242,0.14)' },
  text: { flex: 1, gap: 2 },
  title: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
});
