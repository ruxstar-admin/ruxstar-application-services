import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { listingRoute, MODULE_ICON } from '@/features/discover/lib/module-routes';
import { MODULES } from '@/features/vendor/lib/capabilities';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { CommerceService } from '@/services/commerce-service';
import type { Listing } from '@/types/commerce';
import type { ModuleKey } from '@/types/vendor';

type Filter = 'all' | ModuleKey;

const FILTERS: readonly { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pod', label: 'Print' },
  { key: 'events', label: 'Events' },
  { key: 'coaching', label: 'Courses' },
  { key: 'pg', label: 'Stays' },
];

function ListingCard({ listing, onPress }: { listing: Listing; onPress: (listing: Listing) => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Feedback.tap();
        onPress(listing);
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name={MODULE_ICON[listing.module]} size={24} color={Brand.primarySoft} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {listing.subtitle}
        </Text>
        <Text style={styles.price}>{listing.price}</Text>
      </View>
      <View style={styles.side}>
        {listing.badge ? <Badge label={listing.badge} tone="neutral" /> : null}
        <Text style={styles.module}>{MODULES[listing.module].label}</Text>
      </View>
    </Pressable>
  );
}

/** Browse everything bookable on Ruxstar, filtered by module. */
export function DiscoverScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const [filter, setFilter] = useState<Filter>('all');
  const { data, loading, error, reload } = useAsyncResource(() => CommerceService.discover(token));

  const visible = (data ?? []).filter((l) => filter === 'all' || l.module === filter);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.heading}>Discover</Text>
      <ChoiceChips options={FILTERS} value={filter} onChange={setFilter} />

      {filter === 'pg' ? (
        <View style={styles.stayCta}>
          <ListRow icon="search-outline" title="Search stays by dates" subtitle="Location, facilities and free beds" onPress={() => router.push('/(customer)/stays')} />
        </View>
      ) : null}

      {loading && !data ? (
        <View style={styles.skeletons}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={84} radius={16} />
          ))}
        </View>
      ) : error && !data ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load listings" actionLabel="Try again" onAction={reload} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(l) => `${l.module}-${l.id}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <ListingCard listing={item} onPress={(l) => router.push(listingRoute(l) as never)} />}
          ListEmptyComponent={<EmptyState icon="compass-outline" title="Nothing here yet" message="New listings from businesses near you will show up here." />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg, gap: Spacing.three },
  heading: { ...Typography.title, color: Brand.text, paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.two },
  stayCta: { paddingHorizontal: Spacing.three },
  skeletons: { paddingHorizontal: Spacing.three, gap: Spacing.three },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface },
  pressed: { opacity: 0.7 },
  icon: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: 'rgba(180,92,242,0.14)', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  title: { ...Typography.bodyStrong, color: Brand.text },
  subtitle: { ...Typography.caption, color: Brand.textMuted },
  price: { ...Typography.caption, color: Brand.primarySoft },
  side: { alignItems: 'flex-end', gap: Spacing.one },
  module: { ...Typography.caption, fontSize: 11, color: Brand.textFaint },
});
