/**
 * User Home — Ecommerce discovery screen
 * Header · Search · Hero carousel · Category grid · Popular · Events · All venues
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing } from '@/constants/theme';
import { resolveCategoryDef } from '@/constants/categories';
import {
  listPublicBusinesses,
  listPublicEvents,
  priceTag,
  businessEmoji,
  type PublicBusiness,
  type PublicEvent,
} from '@/services/booking-service';
import ThemeToggle from '@/components/atoms/ThemeToggle';
import SectionHeader from '@/components/atoms/SectionHeader';
import CategoryTile from '@/components/molecules/CategoryTile';
import VenueCard from '@/components/molecules/VenueCard';
import HeroBanner from '@/components/organisms/HeroBanner';


// ─── Event card (horizontal strip) ───────────────────────────────────────────

function EventCard({ event }: { event: PublicEvent }) {
  const { brand } = useTheme();
  const [imgErr, setImgErr] = useState(false);
  const isFree  = event.entryFee === 0;
  const isFull  = event.spotsLeft === 0;

  return (
    <Pressable
      style={({ pressed }) => [
        evStyles.card,
        { backgroundColor: brand.surface1, borderColor: brand.border1, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={() => router.push({ pathname: '/(user)/event-detail', params: { id: event.id } } as never)}
    >
      <View style={evStyles.coverWrap}>
        {event.coverUrl && !imgErr ? (
          <Image source={{ uri: event.coverUrl }} style={evStyles.cover} resizeMode="cover" onError={() => setImgErr(true)} />
        ) : (
          <View style={[evStyles.fallback, { backgroundColor: brand.primaryGlow }]}>
            <Text style={{ fontSize: 36 }}>🎫</Text>
          </View>
        )}
        <View style={evStyles.feeBadge}>
          <Text style={evStyles.feeBadgeText}>{isFree ? 'Free' : `₹${event.entryFee.toLocaleString('en-IN')}`}</Text>
        </View>
        {isFull && (
          <View style={[evStyles.statusBadge, { backgroundColor: 'rgba(220,38,38,0.85)' }]}>
            <Text style={evStyles.statusText}>Full</Text>
          </View>
        )}
      </View>
      <View style={evStyles.body}>
        <Text style={[evStyles.title, { color: brand.cream }]} numberOfLines={2}>{event.title}</Text>
        <Text style={[evStyles.biz, { color: brand.primary }]} numberOfLines={1}>{event.businessName}</Text>
        {event.startAt ? (
          <View style={evStyles.row}>
            <Ionicons name="calendar-outline" size={11} color={brand.creamMuted} />
            <Text style={[evStyles.rowText, { color: brand.creamSub }]} numberOfLines={1}>
              {new Date(event.startAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const evStyles = StyleSheet.create({
  card:       { width: 190, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1 },
  coverWrap:  { height: 110, position: 'relative' },
  cover:      { width: '100%', height: '100%' },
  fallback:   { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  feeBadge:   { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.pill, paddingHorizontal: 7, paddingVertical: 3 },
  feeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  statusBadge:  { position: 'absolute', top: 6, left: 6, borderRadius: Radius.pill, paddingHorizontal: 7, paddingVertical: 3 },
  statusText:   { color: '#fff', fontSize: 10, fontWeight: '700' },
  body:       { padding: Spacing.two + 4, gap: 3 },
  title:      { fontSize: 13, fontWeight: '700', lineHeight: 17 },
  biz:        { fontSize: 11, fontWeight: '600' },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowText:    { fontSize: 11, flex: 1 },
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  const { brand } = useTheme();
  return (
    <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.four }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[skStyles.card, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
          <View style={[skStyles.cover, { backgroundColor: brand.surface2 }]} />
          <View style={[skStyles.body, { gap: Spacing.two }]}>
            <View style={[skStyles.line, { backgroundColor: brand.surface2, width: '60%', height: 14 }]} />
            <View style={[skStyles.line, { backgroundColor: brand.surface2, width: '40%', height: 11 }]} />
            <View style={[skStyles.line, { backgroundColor: brand.surface2, width: '30%', height: 11 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const skStyles = StyleSheet.create({
  card:  { borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1 },
  cover: { height: 155 },
  body:  { padding: Spacing.three },
  line:  { borderRadius: 6 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────


export default function UserHomeScreen() {
  const { brand } = useTheme();

  const [businesses, setBusinesses] = useState<PublicBusiness[]>([]);
  const [events,     setEvents]     = useState<PublicEvent[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [search,     setSearch]     = useState('');

  const load = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const [bizList, eventList] = await Promise.all([
        listPublicBusinesses(),
        listPublicEvents(),
      ]);
      setBusinesses(bizList);
      setEvents(eventList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Banner venues — top 6 by resourceCount, shown as interactive slides
  const bannerVenues = useMemo(
    () =>
      [...businesses]
        .sort((a, b) => b.resourceCount - a.resourceCount)
        .slice(0, 6)
        .map((b) => ({
          id:        b.id,
          name:      b.name,
          typeLabel: b.typeLabel,
          address:   b.address,
          price:     priceTag(b),
          coverUrl:  b.coverUrl,
          emoji:     businessEmoji(b),
        })),
    [businesses],
  );

  // Unique categories — resolve from combined typeLabel+categoryLabel so service businesses
  // with the same generic categoryLabel (e.g. "Appointments") get distinct tiles
  const categories = useMemo(() => {
    const seenShort = new Set<string>();
    const cats: { short: string; icon: keyof typeof Ionicons.glyphMap }[] = [];
    for (const b of businesses) {
      const combined = `${b.typeLabel} ${b.categoryLabel}`.trim();
      if (!combined) continue;
      const def = resolveCategoryDef(combined);
      if (!seenShort.has(def.short)) {
        seenShort.add(def.short);
        cats.push({ short: def.short, icon: def.icon });
      }
    }
    return cats.slice(0, 8);
  }, [businesses]);

  // Filtered results — search only (category filtering happens on listing screen)
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return businesses;
    return businesses.filter((b) =>
      [b.name, b.vendorName, b.address, b.typeLabel, b.categoryLabel, b.description]
        .some((v) => v?.toLowerCase().includes(q)),
    );
  }, [businesses, search]);

  const filteredEvents = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return events;
    return events.filter((e) => [e.title, e.businessName, e.venue].some((v) => v?.toLowerCase().includes(q)));
  }, [events, search]);

  function goToVenue(biz: PublicBusiness) {
    router.push({ pathname: '/(user)/venue-detail', params: { businessId: biz.id } } as never);
  }

  function goToBook(biz: PublicBusiness) {
    router.push({ pathname: '/(user)/book', params: { businessId: biz.id } } as never);
  }

  function goToListing(category?: string) {
    router.push({
      pathname: '/(user)/listing',
      params: category ? { category } : {},
    } as never);
  }

  // ── Render ──

  const s = useMemo(() => makeStyles(brand), [brand]);

  const ListHeader = useMemo(() => (
    <>
      {/* Hero Banner — popular venues as interactive slides */}
      <HeroBanner
        venues={bannerVenues}
        onPress={(v) => router.push({ pathname: '/(user)/venue-detail', params: { businessId: v.id } } as never)}
      />

      {/* Categories — each tile navigates to listing with filter */}
      <View style={s.catSection}>
        <View style={{ paddingHorizontal: Spacing.four }}>
          <SectionHeader title="Browse Categories" onViewAll={() => goToListing()} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catScroll}
        >
          {categories.map((cat) => (
            <CategoryTile
              key={cat.short}
              label={cat.short}
              icon={cat.icon}
              active={false}
              onPress={() => goToListing(cat.short)}
              size="sm"
            />
          ))}
          {/* Shop tile — opens commerce screen */}
          <CategoryTile
            label="Shop"
            icon="bag-outline"
            active={false}
            onPress={() => router.push('/(user)/commerce' as never)}
            size="sm"
          />
          {/* Print tile — opens print screen */}
          <CategoryTile
            label="Print"
            icon="print-outline"
            active={false}
            onPress={() => router.push('/(user)/print' as never)}
            size="sm"
          />
          {/* More tile — listing with filter panel */}
          <CategoryTile
            label="More"
            icon="grid-outline"
            active={false}
            onPress={() => goToListing()}
            size="sm"
          />
        </ScrollView>
      </View>

      {/* Events strip */}
      {!search && filteredEvents.length > 0 && (
        <View style={s.section}>
          <SectionHeader title="Upcoming Events" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.hScroll}
          >
            {filteredEvents.map((ev) => <EventCard key={ev.id} event={ev} />)}
          </ScrollView>
        </View>
      )}

      {/* All venues header */}
      <View style={s.section}>
        <SectionHeader
          title={search ? 'Search Results' : 'All Venues'}
          onViewAll={!search ? () => goToListing() : undefined}
        />
      </View>
    </>
  ), [bannerVenues, categories, filteredEvents, search, s]);

  return (
    <SafeAreaView style={[s.screen]} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Pressable hitSlop={10} style={s.iconBtn} onPress={() => router.push('/(user)/profile' as never)}>
            <Ionicons name="person-circle" size={34} color={brand.primary} />
          </Pressable>
        </View>

        <Text style={[s.logo, { color: brand.cream }]}>RUXSTAR</Text>

        <View style={s.headerRight}>
          <ThemeToggle size={20} />
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={[s.searchBar, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
        <Ionicons name="search-outline" size={18} color={brand.creamMuted} />
        <TextInput
          style={[s.searchInput, { color: brand.cream }]}
          placeholder="Search venues, events…"
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

      {/* ── Content ── */}
      {loading ? (
        <ScrollView contentContainerStyle={{ paddingTop: Spacing.four }}>
          {/* Hero skeleton */}
          <View style={[s.heroSkeleton, { backgroundColor: brand.surface1 }]} />
          <SkeletonRow />
        </ScrollView>
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={brand.primary} />
          }
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => (
            <View style={s.cardWrap}>
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
                onPress={() => goToVenue(item)}
                onBook={() => goToBook(item)}
              />
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="search-outline" size={40} color={brand.creamMuted} />
              <Text style={[s.emptyTitle, { color: brand.cream }]}>No venues found</Text>
              <Text style={[s.emptySub, { color: brand.creamSub }]}>Try a different search</Text>
              {search ? (
                <Pressable onPress={() => setSearch('')} style={s.clearBtn}>
                  <Text style={[s.clearBtnText, { color: brand.primary }]}>Clear search</Text>
                </Pressable>
              ) : null}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(brand: ReturnType<typeof useTheme>['brand']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: brand.bg },

    // Header
    header: {
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.four,
      paddingVertical:   Spacing.two + 4,
    },
    headerLeft:  { flex: 1 },
    headerRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.two },
    iconBtn:     { padding: 4 },
    logo: {
      fontSize:      20,
      fontWeight:    '900',
      letterSpacing: 2,
      textAlign:     'center',
    },

    // Search
    searchBar: {
      flexDirection:     'row',
      alignItems:        'center',
      marginHorizontal:  Spacing.four,
      marginBottom:      Spacing.three,
      borderRadius:      Radius.pill,
      paddingHorizontal: Spacing.three,
      paddingVertical:   13,
      gap:               Spacing.two,
      borderWidth:       1,
      shadowColor:       '#000',
      shadowOffset:      { width: 0, height: 2 },
      shadowOpacity:     0.06,
      shadowRadius:      8,
      elevation:         3,
    },
    searchInput: { flex: 1, fontSize: 15, padding: 0 },

    // Hero skeleton
    heroSkeleton: { height: 260, marginBottom: Spacing.three },

    // Sections
    section:    { paddingHorizontal: Spacing.four, marginBottom: Spacing.four },
    catSection: { marginBottom: Spacing.four },

    // Category horizontal scroll
    catScroll: { paddingHorizontal: Spacing.four, gap: Spacing.two, paddingBottom: 4 },

    // Horizontal scroll
    hScroll: { paddingLeft: Spacing.four, paddingRight: Spacing.four, gap: Spacing.two + 4 },

    // List — no horizontal padding here; banner must be full width
    listContent: { paddingBottom: 80 },
    cardWrap:    { paddingHorizontal: Spacing.four },

    // Centered
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
    errorText: { fontSize: 14, textAlign: 'center' },
    retryBtn:  { borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
    retryBtnText: { color: '#fff', fontWeight: '600' },

    emptyBox:  { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.six, paddingHorizontal: Spacing.four },
    emptyTitle: { fontSize: 17, fontWeight: '600' },
    emptySub:  { fontSize: 13 },
    clearBtn:  { marginTop: Spacing.one },
    clearBtnText: { fontSize: 13, fontWeight: '600' },
  });
}
