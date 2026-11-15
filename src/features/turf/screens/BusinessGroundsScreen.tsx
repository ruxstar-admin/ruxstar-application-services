import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { VendorTurfService } from '@/services/turf-service';
import type { VendorGround } from '@/types/turf';
import { GROUND_STATUS, sportsText } from '../lib/turf';

function groundLine(ground: VendorGround): string {
  if (ground.status === 'draft') return ground.missing.length ? `To do: ${ground.missing[0]}` : 'Ready to publish';
  if (ground.status === 'removed') return 'Taken down by Ruxstar';
  const courts = `${ground.courtList.length} ${ground.courtList.length === 1 ? 'court' : 'courts'}`;
  return `${courts} · ${ground.upcoming} ${ground.upcoming === 1 ? 'booking' : 'bookings'} to come`;
}

function GroundRow({ ground, onPress }: { ground: VendorGround; onPress: () => void }) {
  const status = GROUND_STATUS[ground.status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ground.name}, ${status.label}, ${groundLine(ground)}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {ground.name}
        </Text>
        <Text style={styles.small} numberOfLines={1}>
          {[ground.sports.length ? sportsText(ground.sports) : null, ground.city].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.small}>{groundLine(ground)}</Text>
      </View>
      <Badge label={status.label} tone={status.tone} />
      <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />
    </Pressable>
  );
}

/** A business's grounds and the way to add one. */
export function BusinessGroundsScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = usePaginated(() => VendorTurfService.list(token, id));
  useRefetchOnFocus(list.refresh);
  const create = () => router.push({ pathname: '/(vendor)/businesses/[id]/grounds/new', params: { id } });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Grounds & courts" onBack={() => router.back()} />
      </View>
      {list.loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={84} radius={18} />
          ))}
        </View>
      ) : list.error && !list.items.length ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load your grounds" actionLabel="Try again" onAction={list.retry} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
          ListEmptyComponent={
            <EmptyState
              icon="football-outline"
              title="No grounds yet"
              message="Add your ground, then its courts with their hours and prices. It’s a draft until you publish it."
              actionLabel="Add a ground"
              onAction={create}
            />
          }
          renderItem={({ item }) => <GroundRow ground={item} onPress={() => router.push({ pathname: '/(vendor)/grounds/[id]', params: { id: item.id } })} />}
        />
      )}
      {list.items.length ? (
        <View style={styles.footer}>
          <PrimaryButton label="Add a ground" onPress={create} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.two, flexGrow: 1 },
  skeletons: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  footer: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  pressed: { opacity: 0.8 },
  text: { flex: 1, gap: 2 },
  title: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
});
