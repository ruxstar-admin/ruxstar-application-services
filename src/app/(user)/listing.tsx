/**
 * Listing Screen
 * Route: /(user)/listing?category=<label>&query=<string>
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing } from '@/constants/theme';
import { resolveCategoryDef } from '@/constants/categories';
import {
  listPublicBusinesses,
  businessEmoji,
  priceTag,
  type PublicBusiness,
} from '@/services/booking-service';
import VenueCard from '@/components/molecules/VenueCard';
import DropdownPicker, { type DropdownOption } from '@/components/ui/DropdownPicker';

// ─── Sort ─────────────────────────────────────────────────────────────────────

type SortKey = 'default' | 'price_asc' | 'price_desc' | 'name';

const SORT_OPTS: DropdownOption[] = [
  { value: 'default',    label: 'Relevance',  icon: 'star-outline' },
  { value: 'price_asc',  label: 'Price ↑',    icon: 'arrow-up-outline' },
  { value: 'price_desc', label: 'Price ↓',    icon: 'arrow-down-outline' },
  { value: 'name',       label: 'A → Z',      icon: 'text-outline' },
];

function sortBusinesses(list: PublicBusiness[], sort: SortKey): PublicBusiness[] {
  switch (sort) {
    case 'price_asc':  return [...list].sort((a, b) => (a.priceFrom || 0) - (b.priceFrom || 0));
    case 'price_desc': return [...list].sort((a, b) => (b.priceFrom || 0) - (a.priceFrom || 0));
    case 'name':       return [...list].sort((a, b) => a.name.localeCompare(b.name));
    default:           return list;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// True if a business belongs to a given short category name.
// Tries regex resolution first, then falls back to substring matching so
// edge-case API labels (e.g. "Clinic Services") still match "Clinic".
function bizMatchesCat(b: { typeLabel: string; categoryLabel: string }, cat: string): boolean {
  const combined = `${b.typeLabel} ${b.categoryLabel}`;
  if (resolveCategoryDef(combined).short === cat) return true;
  const catLower = cat.toLowerCase();
  const cLower   = combined.toLowerCase();
  return cLower.split(/\W+/).includes(catLower) ||
    b.typeLabel.toLowerCase().includes(catLower) ||
    b.categoryLabel.toLowerCase().includes(catLower);
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ListingScreen() {
  const { brand } = useTheme();
  const params = useLocalSearchParams<{ category?: string; query?: string }>();

  const [businesses, setBusinesses] = useState<PublicBusiness[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [search,     setSearch]     = useState(params.query ?? '');
  const [activeCat,  setActiveCat]  = useState<string>(params.category ?? 'all');
  const [sort,       setSort]       = useState<SortKey>('default');

  // Sync state when params change — happens when navigating back and pushing
  // to the same route again with different params (Expo Router reuses the component)
  useEffect(() => { setActiveCat(params.category ?? 'all'); }, [params.category]);
  useEffect(() => { setSearch(params.query ?? ''); },         [params.query]);

  const load = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      setBusinesses(await listPublicBusinesses());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Category dropdown options — "All" + one per unique resolved short name
  const categoryOpts: DropdownOption[] = useMemo(() => {
    const seenShort = new Set<string>();
    const opts: DropdownOption[] = [{ value: 'all', label: 'All Categories', icon: 'grid-outline' }];
    for (const b of businesses) {
      const combined = `${b.typeLabel} ${b.categoryLabel}`.trim();
      if (!combined) continue;
      const def = resolveCategoryDef(combined);
      if (!seenShort.has(def.short)) {
        seenShort.add(def.short);
        opts.push({ value: def.short, label: def.short, icon: def.icon });
      }
    }
    // If navigated with a category that isn't yet in options, add it so the picker shows correctly
    if (activeCat !== 'all' && !seenShort.has(activeCat)) {
      const def = resolveCategoryDef(activeCat);
      opts.push({ value: activeCat, label: activeCat, icon: def.icon });
    }
    return opts;
  }, [businesses, activeCat]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = businesses.filter((b) => {
      const matchSearch = !q || [b.name, b.vendorName, b.address, b.typeLabel, b.categoryLabel, b.description]
        .some((v) => v?.toLowerCase().includes(q));
      const matchCat = activeCat === 'all' || bizMatchesCat(b, activeCat);
      return matchSearch && matchCat;
    });
    return sortBusinesses(list, sort);
  }, [businesses, search, activeCat, sort]);

  const headerTitle = activeCat !== 'all' ? `${activeCat} Venues` : 'All Venues';

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: brand.bg }]} edges={['top']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={brand.cream} />
        </Pressable>
        <Text style={[s.title, { color: brand.cream }]} numberOfLines={1}>{headerTitle}</Text>
      </View>

      {/* ── Search bar ── */}
      <View style={[s.searchBar, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
        <Ionicons name="search-outline" size={17} color={brand.creamMuted} />
        <TextInput
          style={[s.searchInput, { color: brand.cream }]}
          placeholder="Search venues…"
          placeholderTextColor={brand.creamMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={brand.creamMuted} />
          </Pressable>
        )}
      </View>

      {/* ── Filter row: Category + Sort dropdowns ── */}
      {!loading && (
        <View style={s.filterRow}>
          <DropdownPicker
            options={categoryOpts}
            value={activeCat}
            onChange={setActiveCat}
            placeholder="Category"
            label="Filter by category"
            flex={1}
          />
          <DropdownPicker
            options={SORT_OPTS}
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            placeholder="Sort"
            label="Sort by"
            flex={1}
          />
        </View>
      )}

      {/* ── Count ── */}
      {!loading && (
        <View style={s.countRow}>
          <Text style={[s.countText, { color: brand.creamSub }]}>
            {filtered.length} venue{filtered.length !== 1 ? 's' : ''} found
          </Text>
          {(activeCat !== 'all' || sort !== 'default') && (
            <Pressable
              onPress={() => { setActiveCat('all'); setSort('default'); }}
              hitSlop={8}
            >
              <Text style={[s.clearText, { color: brand.primary }]}>Clear filters</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── List ── */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={brand.primary} size="large" />
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Ionicons name="cloud-offline-outline" size={40} color={brand.creamMuted} />
          <Text style={[s.errorText, { color: brand.error }]}>{error}</Text>
          <Pressable style={[s.retryBtn, { backgroundColor: brand.primary }]} onPress={() => load()}>
            <Text style={s.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={brand.primary} />
          }
          renderItem={({ item }) => (
            <VenueCard
              id={item.id}
              name={item.name}
              typeLabel={item.typeLabel}
              address={item.address}
              price={priceTag(item)}
              coverUrl={item.coverUrl}
              rating={4.2}
              emoji={businessEmoji(item)}
              variant="vertical"
              onPress={() => router.push({ pathname: '/(user)/venue-detail', params: { businessId: item.id } } as never)}
              onBook={() => router.push({ pathname: '/(user)/book', params: { businessId: item.id } } as never)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="search-outline" size={44} color={brand.creamMuted} />
              <Text style={[s.emptyTitle, { color: brand.cream }]}>No venues found</Text>
              <Text style={[s.emptySub, { color: brand.creamSub }]}>Try a different search or category</Text>
              {(search || activeCat !== 'all') && (
                <Pressable
                  onPress={() => { setSearch(''); setActiveCat('all'); }}
                  style={s.clearBtn}
                >
                  <Text style={[s.clearBtnText, { color: brand.primary }]}>Clear all</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Spacing.four,
    paddingVertical:   Spacing.two + 4,
    gap:               Spacing.two,
  },
  backBtn: { padding: 4 },
  title:   { flex: 1, fontSize: 18, fontWeight: '700' },

  searchBar: {
    flexDirection:     'row',
    alignItems:        'center',
    marginHorizontal:  Spacing.four,
    marginBottom:      Spacing.two,
    borderRadius:      Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical:   11,
    gap:               Spacing.two,
    borderWidth:       1,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  filterRow: {
    flexDirection:    'row',
    paddingHorizontal: Spacing.four,
    gap:              Spacing.two,
    marginBottom:     Spacing.two,
  },

  countRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Spacing.four,
    marginBottom:      Spacing.two,
    gap:               Spacing.two,
  },
  countText:  { fontSize: 13, flex: 1 },
  clearText:  { fontSize: 12, fontWeight: '600' },

  listContent: { paddingHorizontal: Spacing.four, paddingBottom: 80 },

  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  errorText:    { fontSize: 14, textAlign: 'center' },
  retryBtn:     { borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  retryBtnText: { color: '#fff', fontWeight: '600' },

  emptyBox:     { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.six },
  emptyTitle:   { fontSize: 17, fontWeight: '600' },
  emptySub:     { fontSize: 13 },
  clearBtn:     { marginTop: Spacing.one },
  clearBtnText: { fontSize: 13, fontWeight: '600' },
});
