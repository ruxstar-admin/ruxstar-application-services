import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Dropdown, DropdownRow } from '@/components/ui/Dropdown';
import { CourseResults } from '@/features/coaching/components/CourseResults';
import { EventResults } from '@/features/events/components/EventResults';
import { GigResults } from '@/features/gigs/components/GigResults';
import { useGigsRules } from '@/features/gigs/hooks/use-gigs';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { AllBusinesses } from '../components/AllBusinesses';
import { ShopCardView } from '@/features/pod/components/ShopCardView';
import { PropertyResults } from '@/features/stays/components/PropertyResults';
import { StoreResults } from '@/features/store/components/StoreResults';
import { GroundResults } from '@/features/turf/components/GroundResults';
import { useBusinessCatalog } from '@/features/vendor/hooks/use-business-catalog';
import { BUSINESS_MODULES } from '@/features/vendor/lib/business-modules';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { Feedback } from '@/lib/haptics';
import { ShopService } from '@/services/shop-service';
import type { BusinessModule, PodProduct } from '@/types/business';
import type { ShopFilters } from '@/types/shop';

/** Waits this long after the last keystroke before searching. */
const SEARCH_DELAY_MS = 350;
/** Categories customers can already browse here; the rest show "coming soon". */
const OPEN_MODULES: BusinessModule[] = ['pod', 'events', 'coaching', 'turf', 'stays', 'shop', 'gigs'];
const SEARCH_HINT: Partial<Record<Category, { placeholder: string; label: string }>> = {
  shop: { placeholder: 'Shop name', label: 'Search local shops' },
  gigs: { placeholder: 'Gig or freelancer', label: 'Search freelancers' },
  events: { placeholder: 'Event, organiser or city', label: 'Search events' },
  coaching: { placeholder: 'Course, subject or institute', label: 'Search courses' },
  turf: { placeholder: 'Ground or area', label: 'Search grounds' },
  stays: { placeholder: 'PG, hostel or owner name', label: 'Search PGs and hostels' },
};

type Filter = 'all' | PodProduct;
type Category = 'all' | BusinessModule;

function Results({ filters }: { filters: ShopFilters }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => ShopService.list(token, filters, cursor));

  if (list.loading) {
    return (
      <View style={styles.skeletons}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <Skeleton height={190} radius={18} />
            <Skeleton height={16} width="60%" />
            <Skeleton height={12} width="40%" />
          </View>
        ))}
      </View>
    );
  }
  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load shops" message="Check your connection and try again." actionLabel="Try again" onAction={list.retry} />;
  }

  const searching = Boolean(filters.q || filters.product);
  return (
    <FlatList
      data={list.items}
      keyExtractor={(s) => s.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <EmptyState
          icon="print-outline"
          title={searching ? 'No shops match' : 'No print shops yet'}
          message={searching ? 'Try another product or name.' : 'Print shops on Ruxstar show up here as soon as they open.'}
        />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      renderItem={({ item }) => <ShopCardView shop={item} onPress={() => router.push({ pathname: '/(customer)/pod/shop/[id]', params: { id: item.id } })} />}
    />
  );
}

function HeaderButton({ icon, label, spoken, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; spoken: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.headerItem, pressed && styles.pressed]}
    >
      <View style={styles.headerButton}>
        <Ionicons name={icon} size={20} color={Brand.text} />
      </View>
      <Text style={styles.headerLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Businesses customers can order from: every kind at once, until they pick a type and then what it offers. */
export function DiscoverScreen() {
  const router = useRouter();
  const catalog = useBusinessCatalog();
  const gigs = useGigsRules();
  const params = useLocalSearchParams<{ category?: string }>();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [product, setProduct] = useState<Filter>('all');

  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);

  const [linked, setLinked] = useState<string | undefined>(undefined);
  if (params.category !== linked) {
    setLinked(params.category);
    if (params.category && params.category in BUSINESS_MODULES) setCategory(params.category as BusinessModule);
  }

  const categories = catalog.data?.categories ?? [];
  const categoryOptions: { key: Category; label: string }[] = [
    { key: 'all', label: 'All businesses' },
    ...categories.map((c) => ({ key: c.module, label: BUSINESS_MODULES[c.module].label })),
  ];
  const browsable = categories.filter((c) => c.live && OPEN_MODULES.includes(c.module)).map((c) => c.module);
  const picked = categories.find((c) => c.module === category);
  const comingSoon = picked ? !picked.live || !OPEN_MODULES.includes(picked.module) : false;
  const printOpen = categories.some((c) => c.module === 'pod' && c.live) && category !== 'pod';
  const eventsOpen = categories.some((c) => c.module === 'events' && c.live);
  const coachingOpen = categories.some((c) => c.module === 'coaching' && c.live);
  const turfOpen = categories.some((c) => c.module === 'turf' && c.live);
  const staysOpen = categories.some((c) => c.module === 'stays' && c.live);
  const hint = SEARCH_HINT[category] ?? { placeholder: 'Search all businesses', label: 'Search businesses' };
  const productOptions: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All print' },
    ...(catalog.data?.podProducts ?? []).map((p) => ({ key: p.id, label: p.label })),
  ];
  const filters: ShopFilters = { ...(q ? { q } : {}), ...(category === 'pod' && product !== 'all' ? { product } : {}) };

  const pickCategory = (next: Category) => {
    setCategory(next);
    setProduct('all');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header} accessibilityRole="toolbar">
        {eventsOpen ? <HeaderButton icon="ticket-outline" label="Tickets" spoken="Your tickets" onPress={() => router.push('/(customer)/events/tickets')} /> : null}
        {coachingOpen ? <HeaderButton icon="school-outline" label="Classes" spoken="Your classes" onPress={() => router.push('/(customer)/coaching/classes')} /> : null}
        {turfOpen ? <HeaderButton icon="football-outline" label="Grounds" spoken="Your ground bookings" onPress={() => router.push('/(customer)/turf/bookings')} /> : null}
        {staysOpen ? <HeaderButton icon="bed-outline" label="Stays" spoken="Your stays" onPress={() => router.push('/(customer)/stays/mine')} /> : null}
        <HeaderButton icon="receipt-outline" label="Orders" spoken="Your orders" onPress={() => router.push('/(customer)/orders')} />
        <HeaderButton icon="wallet-outline" label="Payments" spoken="Your payments" onPress={() => router.push('/(customer)/payments')} />
      </View>
      <View style={styles.search}>
        <InputField
          value={text}
          onChangeText={setText}
          placeholder={hint.placeholder}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={hint.label}
        />
      </View>
      <View style={styles.filters}>
        <DropdownRow>
          <Dropdown title="Type of business" icon="options-outline" options={categoryOptions} value={category} onChange={pickCategory} />
          {category === 'pod' && !comingSoon ? <Dropdown title="What they print" options={productOptions} value={product} onChange={setProduct} /> : null}
          {category !== 'all' ? (
            <View style={styles.clear}>
              <TextLink muted label="Clear" onPress={() => pickCategory('all')} />
            </View>
          ) : null}
        </DropdownRow>
      </View>
      {comingSoon && picked ? (
        <EmptyState
          icon={BUSINESS_MODULES[picked.module].icon}
          title={`${BUSINESS_MODULES[picked.module].label} coming soon`}
          message={`${picked.label} open on Ruxstar soon.${printOpen ? ' Print shops are open now.' : ''}`}
          actionLabel={printOpen ? 'See print shops' : undefined}
          onAction={printOpen ? () => pickCategory('pod') : undefined}
        />
      ) : category === 'events' ? (
        <EventResults q={q} />
      ) : category === 'coaching' ? (
        <CourseResults q={q} />
      ) : category === 'turf' ? (
        <GroundResults q={q} />
      ) : category === 'stays' ? (
        <PropertyResults q={q} />
      ) : category === 'shop' ? (
        <StoreResults q={q} />
      ) : category === 'gigs' ? (
        gigs.data ? (
          <GigResults q={q} categories={gigs.data.categories} />
        ) : gigs.error ? (
          <EmptyState icon="cloud-offline-outline" title="Could not load freelancers" message="Check your connection and try again." actionLabel="Try again" onAction={gigs.reload} />
        ) : (
          <View style={styles.skeletons}>
            <Skeleton height={190} radius={18} />
          </View>
        )
      ) : category === 'pod' ? (
        <Results key={`${q}|${product}`} filters={filters} />
      ) : catalog.data ? (
        <AllBusinesses modules={browsable} q={q} onPick={pickCategory} />
      ) : catalog.error ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load businesses" message="Check your connection and try again." actionLabel="Try again" onAction={catalog.reload} />
      ) : (
        <View style={styles.skeletons}>
          <Skeleton height={190} radius={18} />
          <Skeleton height={16} width="60%" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg, gap: Spacing.three },
  header: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: Spacing.two, paddingTop: Spacing.three },
  headerItem: { flex: 1, alignItems: 'center', gap: Spacing.one, maxWidth: 88 },
  headerLabel: { ...Typography.caption, fontSize: 11, color: Brand.textMuted },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  pressed: { opacity: 0.7 },
  search: { paddingHorizontal: Spacing.three },
  filters: { gap: Spacing.two },
  clear: { marginLeft: 'auto' },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three, flexGrow: 1 },
  skeletons: { paddingHorizontal: Spacing.three, gap: Spacing.four },
  skeletonCard: { gap: Spacing.two },
  footer: { paddingVertical: Spacing.three },
});
