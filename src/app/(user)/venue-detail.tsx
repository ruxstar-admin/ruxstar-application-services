/**
 * Venue Detail Screen
 * Route: /(user)/venue-detail?businessId=<id>
 *
 * Full-page venue preview — photo gallery, amenities, pricing, Book Now CTA.
 * Navigates to /(user)/book for actual slot selection and payment.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing } from '@/constants/theme';
import {
  getPublicBusiness,
  businessEmoji,
  priceTag,
  type PublicBusiness,
} from '@/services/booking-service';
import StarRating from '@/components/atoms/StarRating';
import StatusBadge from '@/components/atoms/StatusBadge';

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');
const GALLERY_H           = 280;
const GOLD                = '#F5A623';

// ─── Amenity helpers ──────────────────────────────────────────────────────────

interface AmenityDef {
  icon:  keyof typeof Ionicons.glyphMap;
  label: string;
  match: RegExp;
}

const AMENITY_DEFS: AmenityDef[] = [
  { icon: 'car-outline',        label: 'Parking',       match: /parking/i },
  { icon: 'snow-outline',       label: 'AC',            match: /\bac\b|air[\s-]?condit/i },
  { icon: 'restaurant-outline', label: 'Catering',      match: /cater|food|kitchen/i },
  { icon: 'wifi-outline',       label: 'WiFi',          match: /wifi|wi[\s-]fi|internet/i },
  { icon: 'musical-notes',      label: 'DJ / Music',    match: /dj|music|sound/i },
  { icon: 'camera-outline',     label: 'Photography',   match: /photo|camera/i },
  { icon: 'flower-outline',     label: 'Decoration',    match: /decor|flower/i },
  { icon: 'person-outline',     label: 'Staff',         match: /staff|manag|supervis/i },
  { icon: 'videocam-outline',   label: 'Projector',     match: /projector|screen|display/i },
  { icon: 'cafe-outline',       label: 'Bar / Drinks',  match: /bar|drink|beverage/i },
];

function extractAmenities(biz: PublicBusiness): AmenityDef[] {
  const text = [biz.description, biz.venueRules].join(' ');
  return AMENITY_DEFS.filter((a) => a.match.test(text));
}

// ─── Photo gallery ────────────────────────────────────────────────────────────

function PhotoGallery({ urls, fallbackEmoji }: { urls: string[]; fallbackEmoji: string }) {
  const { brand } = useTheme();
  const [active, setActive] = useState(0);
  const listRef = useRef<FlatList>(null);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setActive(idx);
  }

  if (urls.length === 0) {
    return (
      <LinearGradient
        colors={['#1a0a3d', '#3b1a7a', '#7C3AED']}
        style={[galStyles.gallery, { height: GALLERY_H, alignItems: 'center', justifyContent: 'center' }]}
      >
        <Text style={{ fontSize: 72 }}>{fallbackEmoji}</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={{ height: GALLERY_H }}>
      <FlatList
        ref={listRef}
        data={urls}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={galStyles.photo} resizeMode="cover" />
        )}
      />
      {/* Gradient at bottom */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        style={galStyles.gradient}
        pointerEvents="none"
      />
      {/* Dot indicators */}
      {urls.length > 1 && (
        <View style={galStyles.dots}>
          {urls.map((_, i) => (
            <View
              key={i}
              style={[
                galStyles.dot,
                i === active ? galStyles.dotActive : { backgroundColor: 'rgba(255,255,255,0.45)', width: 6 },
              ]}
            />
          ))}
        </View>
      )}
      {/* Count overlay */}
      <View style={galStyles.countPill}>
        <Ionicons name="images-outline" size={12} color="#fff" />
        <Text style={galStyles.countText}>{active + 1}/{urls.length}</Text>
      </View>
    </View>
  );
}

const galStyles = StyleSheet.create({
  gallery:  { width: SCREEN_W },
  photo:    { width: SCREEN_W, height: GALLERY_H },
  gradient: { ...StyleSheet.absoluteFillObject, top: GALLERY_H * 0.45 },
  dots: {
    position:        'absolute',
    bottom:          Spacing.two + 4,
    alignSelf:       'center',
    flexDirection:   'row',
    gap:             5,
    alignItems:      'center',
  },
  dot:       { height: 6, borderRadius: Radius.pill },
  dotActive: { width: 18, height: 6, backgroundColor: GOLD },
  countPill: {
    position:          'absolute',
    bottom:            Spacing.two + 4,
    right:             Spacing.three,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    backgroundColor:   'rgba(0,0,0,0.55)',
    borderRadius:      Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical:   3,
  },
  countText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function VenueDetailScreen() {
  const { brand } = useTheme();
  const insets    = useSafeAreaInsets();
  const { businessId } = useLocalSearchParams<{ businessId: string }>();

  const [biz,     setBiz]     = useState<PublicBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getPublicBusiness(businessId);
      setBiz(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load venue');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const amenities = useMemo(() => biz ? extractAmenities(biz) : [], [biz]);
  const photos    = useMemo(() => biz?.photos ?? (biz?.coverUrl ? [biz.coverUrl] : []), [biz]);
  const emoji     = biz ? businessEmoji(biz) : '🏛️';
  const price     = biz ? priceTag(biz) : '';

  const s = useMemo(() => makeStyles(brand), [brand]);

  // ── Loading ──
  if (loading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={brand.cream} />
          </Pressable>
        </View>
        <View style={s.centered}>
          <ActivityIndicator color={brand.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──
  if (error || !biz) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={brand.cream} />
          </Pressable>
        </View>
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={44} color={brand.creamMuted} />
          <Text style={[s.errorText, { color: brand.error }]}>{error ?? 'Venue not found'}</Text>
          <Pressable style={[s.retryBtn, { backgroundColor: brand.primary }]} onPress={load}>
            <Text style={s.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Content ──
  return (
    <View style={[s.screen, { backgroundColor: brand.bg }]}>
      {/* Floating back button over gallery */}
      <View style={[s.floatingBar, { top: insets.top + Spacing.two }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[s.floatingBtn, { backgroundColor: 'rgba(0,0,0,0.50)' }]}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Gallery */}
        <PhotoGallery urls={photos} fallbackEmoji={emoji} />

        {/* Info card */}
        <View style={s.infoCard}>
          {/* Type + status row */}
          <View style={s.typeRow}>
            {biz.typeLabel ? (
              <View style={[s.typePill, { backgroundColor: brand.primaryGlow }]}>
                <Text style={[s.typePillText, { color: brand.primary }]}>{biz.typeLabel}</Text>
              </View>
            ) : null}
            <StatusBadge status="confirmed" label="Available" size="sm" />
          </View>

          {/* Name */}
          <Text style={[s.name, { color: brand.cream }]}>{biz.name}</Text>

          {/* Rating row */}
          <View style={s.ratingRow}>
            <StarRating rating={4.2} count={128} size="md" />
            <Text style={[s.ratingNote, { color: brand.creamSub }]}>· Premium Venue</Text>
          </View>

          {/* Address */}
          {biz.address ? (
            <View style={s.row}>
              <Ionicons name="location-outline" size={15} color={brand.primary} />
              <Text style={[s.addressText, { color: brand.creamSub }]}>{biz.address}</Text>
            </View>
          ) : null}

          {/* Divider */}
          <View style={[s.divider, { backgroundColor: brand.border1 }]} />

          {/* Key stats row */}
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Ionicons name="people-outline" size={18} color={brand.primary} />
              <Text style={[s.statValue, { color: brand.cream }]}>
                {biz.maxGuests ? `${biz.maxGuests}` : '—'}
              </Text>
              <Text style={[s.statLabel, { color: brand.creamSub }]}>Guests</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: brand.border1 }]} />
            <View style={s.stat}>
              <Ionicons name="business-outline" size={18} color={brand.primary} />
              <Text style={[s.statValue, { color: brand.cream }]}>
                {biz.resourceCount > 0 ? biz.resourceCount : 1}
              </Text>
              <Text style={[s.statLabel, { color: brand.creamSub }]}>Hall{biz.resourceCount > 1 ? 's' : ''}</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: brand.border1 }]} />
            <View style={s.stat}>
              <Ionicons name="cash-outline" size={18} color={brand.primary} />
              <Text style={[s.statValue, { color: brand.primary }]} numberOfLines={1}>{price}</Text>
              <Text style={[s.statLabel, { color: brand.creamSub }]}>Starting</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[s.divider, { backgroundColor: brand.border1 }]} />

          {/* Description */}
          {biz.description ? (
            <View style={s.descSection}>
              <Text style={[s.sectionTitle, { color: brand.cream }]}>About</Text>
              <Text style={[s.descText, { color: brand.creamSub }]}>{biz.description}</Text>
            </View>
          ) : null}

          {/* Amenities */}
          {amenities.length > 0 && (
            <View style={s.amenitiesSection}>
              <Text style={[s.sectionTitle, { color: brand.cream }]}>Amenities</Text>
              <View style={s.amenitiesGrid}>
                {amenities.map((a) => (
                  <View key={a.label} style={[s.amenityChip, { backgroundColor: brand.surface2, borderColor: brand.border1 }]}>
                    <Ionicons name={a.icon} size={14} color={brand.primary} />
                    <Text style={[s.amenityLabel, { color: brand.creamSub }]}>{a.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Venue rules */}
          {biz.venueRules ? (
            <View style={s.rulesSection}>
              <Text style={[s.sectionTitle, { color: brand.cream }]}>Venue Rules</Text>
              <Text style={[s.rulesText, { color: brand.creamSub }]}>{biz.venueRules}</Text>
            </View>
          ) : null}

          {/* Vendor */}
          <View style={[s.vendorRow, { backgroundColor: brand.surface2, borderColor: brand.border1 }]}>
            <View style={[s.vendorAvatar, { backgroundColor: brand.primaryGlow }]}>
              <Text style={s.vendorAvatarText}>{biz.vendorName?.[0]?.toUpperCase() ?? 'V'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.vendorName, { color: brand.cream }]}>{biz.vendorName}</Text>
              <Text style={[s.vendorRole, { color: brand.creamSub }]}>Venue Manager</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color={brand.success} />
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky footer CTA ── */}
      <View style={[s.footer, { backgroundColor: brand.bg, borderTopColor: brand.border1, paddingBottom: insets.bottom + Spacing.two }]}>
        <View style={s.footerLeft}>
          <Text style={[s.footerPrice, { color: brand.primary }]}>{price}</Text>
          <Text style={[s.footerPriceNote, { color: brand.creamSub }]}>per slot / day</Text>
        </View>
        <Pressable
          style={({ pressed }) => [s.bookBtn, { backgroundColor: brand.primary, opacity: pressed ? 0.85 : 1 }]}
          onPress={() => router.push({ pathname: '/(user)/book', params: { businessId: biz.id } } as never)}
        >
          <Text style={s.bookBtnText}>Book Now</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(brand: ReturnType<typeof useTheme>['brand']) {
  return StyleSheet.create({
    screen:  { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
    topBar:  { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
    backBtn: { padding: 6 },
    errorText: { fontSize: 14, textAlign: 'center' },
    retryBtn:  { borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
    retryBtnText: { color: '#fff', fontWeight: '600' },

    // Floating bar
    floatingBar: { position: 'absolute', left: Spacing.three, zIndex: 20, flexDirection: 'row', gap: Spacing.two },
    floatingBtn: { width: 38, height: 38, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },

    // Info card
    infoCard: { padding: Spacing.four, gap: Spacing.three },

    typeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
    typePill: { borderRadius: Radius.pill, paddingHorizontal: Spacing.two + 4, paddingVertical: 3 },
    typePillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

    name: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3, lineHeight: 30 },

    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
    ratingNote: { fontSize: 13 },

    row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one + 2 },
    addressText: { fontSize: 14, flex: 1, lineHeight: 20 },

    divider: { height: 1, marginVertical: Spacing.one },

    // Stats
    statsRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.two },
    stat:        { flex: 1, alignItems: 'center', gap: 3 },
    statValue:   { fontSize: 16, fontWeight: '700' },
    statLabel:   { fontSize: 11 },
    statDivider: { width: 1, height: 40 },

    // Sections
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.two },
    descSection:  { gap: 2 },
    descText:     { fontSize: 14, lineHeight: 22 },

    amenitiesSection: { gap: 2 },
    amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
    amenityChip: {
      flexDirection:     'row',
      alignItems:        'center',
      gap:               5,
      borderRadius:      Radius.pill,
      borderWidth:       1,
      paddingHorizontal: Spacing.two + 2,
      paddingVertical:   Spacing.one + 2,
    },
    amenityLabel: { fontSize: 12, fontWeight: '500' },

    rulesSection: { gap: 2 },
    rulesText:    { fontSize: 13, lineHeight: 20 },

    // Vendor row
    vendorRow: {
      flexDirection:     'row',
      alignItems:        'center',
      gap:               Spacing.three,
      borderRadius:      Radius.lg,
      borderWidth:       1,
      padding:           Spacing.three,
    },
    vendorAvatar: { width: 44, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
    vendorAvatarText: { fontSize: 18, fontWeight: '700', color: '#7C3AED' },
    vendorName: { fontSize: 14, fontWeight: '700' },
    vendorRole: { fontSize: 12 },

    // Footer
    footer: {
      position:      'absolute',
      bottom:        0,
      left:          0,
      right:         0,
      flexDirection: 'row',
      alignItems:    'center',
      paddingHorizontal: Spacing.four,
      paddingTop:    Spacing.three,
      borderTopWidth: 1,
    },
    footerLeft:      { flex: 1 },
    footerPrice:     { fontSize: 20, fontWeight: '800' },
    footerPriceNote: { fontSize: 12 },
    bookBtn: {
      flexDirection:     'row',
      alignItems:        'center',
      gap:               Spacing.one + 2,
      borderRadius:      Radius.pill,
      paddingHorizontal: Spacing.four + 4,
      paddingVertical:   Spacing.two + 4,
    },
    bookBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}
