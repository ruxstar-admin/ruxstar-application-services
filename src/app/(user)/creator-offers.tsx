/**
 * Creator Offers List Screen
 * Route: /(user)/creator-offers
 * Dedicated browse page for all published creator shoutout / collab / appearance offers.
 * Tapping a card opens the detail + booking screen (creator-offer.tsx).
 */

import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';
import {
  listPublicCreatorOffers,
  type CreatorOffer,
} from '@/services/creator-offer-service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function kindLabel(kind: string) {
  if (kind === 'shoutout')   return 'Shoutout';
  if (kind === 'appearance') return 'Appearance';
  return 'Collab';
}

function kindEmoji(kind: string) {
  if (kind === 'shoutout')   return '📣';
  if (kind === 'appearance') return '🎤';
  return '✨';
}

function kindColor(kind: string) {
  if (kind === 'shoutout')   return '#7C3AED';
  if (kind === 'appearance') return '#D97706';
  return '#0891B2';
}

// ─── Style factory ────────────────────────────────────────────────────────────

const createStyles = (brand: BrandTokens) => StyleSheet.create({
  screen:  { flex: 1, backgroundColor: brand.bg },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1, borderBottomColor: brand.border1,
  },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: brand.cream },
  headerCount: { fontSize: 12, color: brand.creamMuted },

  // List
  listContent: { padding: Spacing.three, gap: Spacing.three, paddingBottom: 100 },

  // Card
  card: {
    backgroundColor: brand.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: brand.border1,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.88 },

  coverWrap:     { height: 160, position: 'relative' },
  cover:         { width: '100%', height: '100%' },
  coverFallback: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  coverEmoji: { fontSize: 52 },

  kindBadge: {
    position: 'absolute', top: Spacing.two, right: Spacing.two,
    borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  kindBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  spotsBadge: {
    position: 'absolute', top: Spacing.two, left: Spacing.two,
    borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(220,38,38,0.80)',
  },
  spotsBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  cardBody: { padding: Spacing.three, gap: Spacing.one + 2 },

  cardTitle:    { fontSize: 16, fontWeight: '800', color: brand.cream, letterSpacing: -0.2 },
  cardBusiness: { fontSize: 12, fontWeight: '600', color: brand.primary },

  platforms: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  platformChip: {
    borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: brand.surface2, borderWidth: 1, borderColor: brand.border2,
  },
  platformText: { fontSize: 10, fontWeight: '600', color: brand.creamSub },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  priceBlock: { gap: 1 },
  price:      { fontSize: 18, fontWeight: '800', color: brand.success },
  priceFree:  { fontSize: 18, fontWeight: '800', color: brand.success },
  priceSub:   { fontSize: 10, color: brand.creamMuted },

  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: brand.primary, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three, paddingVertical: 9,
  },
  bookBtnFull: { backgroundColor: brand.surface2 },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  bookBtnTextFull: { color: brand.creamMuted, fontSize: 13, fontWeight: '700' },

  turnaround: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2,
  },
  turnaroundText: { fontSize: 11, color: brand.creamMuted },

  // Empty
  emptyIcon:  { width: 72, height: 72, borderRadius: Radius.xl, backgroundColor: brand.surface1, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: brand.cream },
  emptySub:   { fontSize: 13, color: brand.creamSub, textAlign: 'center' },

  // Error
  errorText: { fontSize: 13, color: brand.error, textAlign: 'center' },
  retryBtn:  {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: brand.primary, borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, marginTop: Spacing.one,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

// ─── Offer Card ───────────────────────────────────────────────────────────────

function OfferCard({ offer }: { offer: CreatorOffer }) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  const [imgErr, setImgErr] = useState(false);

  const isFull  = offer.spotsLeft === 0;
  const isFree  = offer.price <= 0;
  const color   = kindColor(offer.kind);

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && s.cardPressed]}
      onPress={() => router.push({ pathname: '/(user)/creator-offer', params: { id: offer.id } } as never)}
    >
      {/* Cover */}
      <View style={s.coverWrap}>
        {offer.coverUrl && !imgErr ? (
          <Image
            source={{ uri: offer.coverUrl }}
            style={s.cover}
            resizeMode="cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <View style={[s.coverFallback, { backgroundColor: `${color}18` }]}>
            <Text style={s.coverEmoji}>{kindEmoji(offer.kind)}</Text>
          </View>
        )}

        <View style={s.kindBadge}>
          <Text style={s.kindBadgeText}>{kindLabel(offer.kind)}</Text>
        </View>

        {isFull && (
          <View style={s.spotsBadge}>
            <Text style={s.spotsBadgeText}>Full</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={2}>{offer.title}</Text>
        <Text style={s.cardBusiness} numberOfLines={1}>by {offer.businessName}</Text>

        {offer.platforms.length > 0 && (
          <View style={s.platforms}>
            {offer.platforms.slice(0, 4).map((p) => (
              <View key={p} style={s.platformChip}>
                <Text style={s.platformText}>{p}</Text>
              </View>
            ))}
          </View>
        )}

        {offer.turnaroundDays != null && (
          <View style={s.turnaround}>
            <Ionicons name="time-outline" size={12} color={brand.creamMuted} />
            <Text style={s.turnaroundText}>
              {offer.turnaroundDays} day{offer.turnaroundDays === 1 ? '' : 's'} turnaround
            </Text>
          </View>
        )}

        <View style={s.cardFooter}>
          <View style={s.priceBlock}>
            <Text style={isFree ? s.priceFree : s.price}>
              {isFree ? 'Free' : `₹${offer.price.toLocaleString('en-IN')}`}
            </Text>
            {offer.spotsLeft != null && offer.spotsLeft > 0 && (
              <Text style={s.priceSub}>{offer.spotsLeft} spot{offer.spotsLeft === 1 ? '' : 's'} left</Text>
            )}
          </View>

          <View style={[s.bookBtn, isFull && s.bookBtnFull]}>
            <Ionicons
              name={isFull ? 'close-circle-outline' : 'arrow-forward-outline'}
              size={14}
              color={isFull ? brand.creamMuted : '#fff'}
            />
            <Text style={isFull ? s.bookBtnTextFull : s.bookBtnText}>
              {isFull ? 'Full' : 'View & Book'}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreatorOffersScreen() {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const [offers,     setOffers]     = useState<CreatorOffer[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      setOffers(await listPublicCreatorOffers());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load creator offers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={brand.cream} />
        </Pressable>
        <Text style={s.headerTitle}>Creator Offers</Text>
        {!loading && offers.length > 0 && (
          <Text style={s.headerCount}>{offers.length} offers</Text>
        )}
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={({ pressed }) => [s.retryBtn, pressed && { opacity: 0.7 }]} onPress={() => load()}>
            <Ionicons name="refresh-outline" size={14} color="#fff" />
            <Text style={s.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(o) => o.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={brand.primary} />
          }
          ListEmptyComponent={
            <View style={s.centered}>
              <View style={s.emptyIcon}>
                <Ionicons name="megaphone-outline" size={32} color={brand.primary} />
              </View>
              <Text style={s.emptyTitle}>No offers yet</Text>
              <Text style={s.emptySub}>Creator shoutouts and collabs will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => <OfferCard offer={item} />}
        />
      )}
    </SafeAreaView>
  );
}
