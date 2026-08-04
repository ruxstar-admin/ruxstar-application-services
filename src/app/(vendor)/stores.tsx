/**
 * Stores — Store Availability Screen
 * Mirrors: ruxstar-frontend-services/app/business/stores/page.tsx
 *
 * Shows only print/commerce businesses. Each card has an Open/Closed toggle
 * that calls setPrintAcceptingOrders. Closed shops stay visible to customers
 * but can't take new orders.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useKycStore } from '@/stores/kyc-store';
import { useBusinessStore } from '@/stores/business-store';
import { getPrintVendorProfile, setPrintAcceptingOrders } from '@/services/print-service';
import VendorHeader from '@/components/vendor/VendorHeader';
import type { Business } from '@/services/vendor-business-service';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';

// ─── Style factories ──────────────────────────────────────────────────────────

const createScreenStyles = (brand: BrandTokens) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: brand.bg },

  compactHeader: {
    paddingBottom: Spacing.two,
    marginBottom:  Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: brand.border1,
  },
  compactTitle: {
    fontSize:      16,
    fontWeight:    '700',
    color:         brand.cream,
    letterSpacing: -0.2,
  },
  compactSub: {
    fontSize:   12,
    color:      brand.creamSub,
    marginTop:  2,
  },

  list: { padding: Spacing.four, paddingBottom: 100 },
});

const createCardStyles = (brand: BrandTokens) => StyleSheet.create({
  card: {
    backgroundColor: brand.surface1,
    borderRadius:    Radius.xl,
    borderWidth:     1,
    borderColor:     brand.border1,
    padding:         Spacing.three,
    gap:             Spacing.two + 2,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           Spacing.two,
  },
  shopIcon: {
    width:           44,
    height:          44,
    borderRadius:    Radius.lg,
    backgroundColor: brand.surface2,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  shopEmoji: { fontSize: 20 },
  shopInfo:  { flex: 1 },
  shopName:  { fontSize: 14, fontWeight: '700', color: brand.cream },
  shopAddr:  { fontSize: 11, color: brand.creamMuted, marginTop: 3, lineHeight: 15 },

  badge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      Radius.pill,
    borderWidth:       1,
    flexShrink:        0,
  },
  badgeOpen:       { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.35)' },
  badgeClosed:     { backgroundColor: brand.surface2,         borderColor: brand.border1          },
  badgeDot:        { width: 7, height: 7, borderRadius: 4 },
  badgeDotOpen:    { backgroundColor: brand.success },
  badgeDotClosed:  { backgroundColor: brand.creamMuted },
  badgeText:       { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeTextOpen:   { color: brand.success },
  badgeTextClosed: { color: brand.creamMuted },

  cardBottom: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: brand.border1,
    paddingTop:     Spacing.two,
  },
  statusText:   { fontSize: 12, color: brand.creamSub },
  statusOpen:   { color: brand.success },
  statusClosed: { color: brand.creamMuted },
});

const createSkeletonStyles = (brand: BrandTokens) => StyleSheet.create({
  card:   { opacity: 0.5 },
  icon:   { width: 44, height: 44, borderRadius: Radius.lg, backgroundColor: brand.surface2 },
  badge:  { width: 58, height: 24, borderRadius: Radius.pill, backgroundColor: brand.surface2 },
  toggle: { width: 48, height: 26, borderRadius: 13, backgroundColor: brand.surface2 },
  line:   { height: 12, borderRadius: 6, backgroundColor: brand.surface2 },
});

const createEmptyStyles = (brand: BrandTokens) => StyleSheet.create({
  wrap:    { alignItems: 'center', paddingTop: Spacing.six, gap: Spacing.two },
  emoji:   { fontSize: 40 },
  title:   { fontSize: 18, fontWeight: '800', color: brand.cream, textAlign: 'center', marginTop: Spacing.two },
  sub:     { fontSize: 13, color: brand.creamSub, textAlign: 'center', lineHeight: 19, paddingHorizontal: Spacing.four },
  btn:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: 12, borderRadius: Radius.pill, backgroundColor: brand.primary },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

const createKycStyles = (brand: BrandTokens) => StyleSheet.create({
  banner:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: 'rgba(217,119,6,0.06)', borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(217,119,6,0.20)', padding: Spacing.three, margin: Spacing.four, marginBottom: 0 },
  iconWrap:{ width: 38, height: 38, borderRadius: Radius.md, backgroundColor: 'rgba(217,119,6,0.10)', alignItems: 'center', justifyContent: 'center' },
  title:   { fontSize: 13, fontWeight: '700', color: brand.cream },
  sub:     { fontSize: 11, color: brand.creamSub, marginTop: 2 },
});

// ─── Store card ───────────────────────────────────────────────────────────────

function StoreCard({
  shop,
  accepting,
  loading,
  onToggle,
}: {
  shop:      Business;
  accepting: boolean;
  loading:   boolean;
  onToggle:  () => void;
}) {
  const { brand } = useTheme();
  const s = useMemo(() => createCardStyles(brand), [brand]);

  return (
    <View style={s.card}>
      {/* Top row: icon + name/address + Open/Closed badge */}
      <View style={s.cardTop}>
        <View style={s.shopIcon}>
          <Text style={s.shopEmoji}>🖨️</Text>
        </View>

        <View style={s.shopInfo}>
          <Text style={s.shopName} numberOfLines={1}>{shop.name}</Text>
          {!!shop.address && (
            <Text style={s.shopAddr} numberOfLines={2}>{shop.address}</Text>
          )}
        </View>

        <View style={[s.badge, accepting ? s.badgeOpen : s.badgeClosed]}>
          <View style={[s.badgeDot, accepting ? s.badgeDotOpen : s.badgeDotClosed]} />
          <Text style={[s.badgeText, accepting ? s.badgeTextOpen : s.badgeTextClosed]}>
            {accepting ? 'Open' : 'Closed'}
          </Text>
        </View>
      </View>

      {/* Bottom row: status text + toggle */}
      <View style={s.cardBottom}>
        <Text style={[s.statusText, accepting ? s.statusOpen : s.statusClosed]}>
          {accepting ? 'Accepting new orders' : 'Not accepting orders'}
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color={brand.primary} />
        ) : (
          <Switch
            value={accepting}
            onValueChange={onToggle}
            trackColor={{ false: 'rgba(255,255,255,0.10)', true: `${brand.success}80` }}
            thumbColor="#fff"
            ios_backgroundColor="rgba(255,255,255,0.10)"
          />
        )}
      </View>
    </View>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  const { brand } = useTheme();
  const s = useMemo(() => createCardStyles(brand), [brand]);
  const sk = useMemo(() => createSkeletonStyles(brand), [brand]);

  return (
    <View style={[s.card, sk.card]}>
      <View style={s.cardTop}>
        <View style={[sk.icon]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[sk.line, { width: '60%' }]} />
          <View style={[sk.line, { width: '80%', height: 10 }]} />
        </View>
        <View style={[sk.badge]} />
      </View>
      <View style={s.cardBottom}>
        <View style={[sk.line, { width: '50%' }]} />
        <View style={[sk.toggle]} />
      </View>
    </View>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  const { brand } = useTheme();
  const e = useMemo(() => createEmptyStyles(brand), [brand]);
  return (
    <View style={e.wrap}>
      <Text style={e.emoji}>🏬</Text>
      <Text style={e.title}>No shops yet</Text>
      <Text style={e.sub}>
        Set up a live print/commerce business to manage its availability here.
      </Text>
      <Pressable style={e.btn} onPress={() => router.push('/(vendor)/businesses' as never)}>
        <Ionicons name="briefcase-outline" size={15} color="#fff" />
        <Text style={e.btnText}>Manage businesses</Text>
      </Pressable>
    </View>
  );
}

// ─── KYC Banner ──────────────────────────────────────────────────────────────

function KycBanner() {
  const { brand } = useTheme();
  const kyc = useMemo(() => createKycStyles(brand), [brand]);
  return (
    <Pressable style={kyc.banner} onPress={() => router.push('/(vendor)/kyc' as never)}>
      <View style={kyc.iconWrap}>
        <Ionicons name="shield-checkmark-outline" size={20} color={brand.warning} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={kyc.title}>KYC required</Text>
        <Text style={kyc.sub}>Complete identity verification to manage stores</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={brand.warning} />
    </Pressable>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function StoresScreen() {
  const token     = useAuthStore((s) => s.token);
  const kycStatus = useKycStore((s) => s.status);
  const { businesses, loading: bizLoading, loadBusinesses } = useBusinessStore();

  const { brand } = useTheme();
  const r = useMemo(() => createScreenStyles(brand), [brand]);

  const kycVerified = kycStatus?.status === 'verified';

  // print-on-demand shops only (module === 'print')
  const shops = businesses.filter((b) => b.module === 'print');

  // accepting state: null = loading, boolean = loaded
  const [accepting,  setAccepting]  = useState<Record<string, boolean>>({});
  const [overrides,  setOverrides]  = useState<Record<string, boolean>>({});
  const [busyId,     setBusyId]     = useState<string | null>(null);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Resolve current state for a shop — same pattern as website
  const isAccepting = (shop: Business) =>
    overrides[shop.id] ?? accepting[shop.id] ?? true;

  async function loadProfiles(shopList: Business[], tok: string) {
    const results = await Promise.allSettled(
      shopList.map((b) => getPrintVendorProfile(tok, b.id)),
    );
    const map: Record<string, boolean> = {};
    results.forEach((res, i) => {
      const id = shopList[i].id;
      map[id] = res.status === 'fulfilled' ? (res.value?.acceptingOrders ?? true) : true;
    });
    setAccepting(map);
    setProfilesLoaded(true);
  }

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    await loadBusinesses(token);
    setRefreshing(false);
  }, [token, loadBusinesses]);

  // Load businesses on focus
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Load profiles once businesses are available
  useEffect(() => {
    if (!token || shops.length === 0) return;
    setProfilesLoaded(false);
    void loadProfiles(shops, token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, businesses]);

  async function handleToggle(shop: Business) {
    if (!token) return;
    const next = !isAccepting(shop);
    // Optimistic update (website pattern: override first)
    setOverrides((o) => ({ ...o, [shop.id]: next }));
    setBusyId(shop.id);
    try {
      await setPrintAcceptingOrders(token, shop.id, next);
      // Commit to base state, clear override
      setAccepting((a) => ({ ...a, [shop.id]: next }));
      setOverrides((o) => { const copy = { ...o }; delete copy[shop.id]; return copy; });
    } catch {
      // Roll back override
      setOverrides((o) => { const copy = { ...o }; delete copy[shop.id]; return copy; });
      Alert.alert('Error', 'Could not update shop status. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  const isLoading = bizLoading && !refreshing;

  return (
    <SafeAreaView style={r.screen} edges={['top']}>
      <VendorHeader />

      {isLoading ? (
        <View style={r.list}>
          <View style={r.compactHeader}>
            <Text style={r.compactTitle}>Store Availability</Text>
            <Text style={r.compactSub}>Open or close each shop for new orders</Text>
          </View>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={kycVerified ? shops : []}
          keyExtractor={(b) => b.id}
          contentContainerStyle={r.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={brand.primary}
            />
          }
          ListHeaderComponent={
            <>
              <View style={r.compactHeader}>
                <Text style={r.compactTitle}>Store Availability</Text>
                <Text style={r.compactSub}>Open or close each shop for new orders</Text>
              </View>
              {!kycVerified && <KycBanner />}
            </>
          }
          ListEmptyComponent={kycVerified ? <EmptyState /> : null}
          renderItem={({ item }) => (
            <StoreCard
              shop={item}
              accepting={isAccepting(item)}
              loading={busyId === item.id || (!profilesLoaded && !(item.id in accepting))}
              onToggle={() => handleToggle(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two + 2 }} />}
        />
      )}
    </SafeAreaView>
  );
}
