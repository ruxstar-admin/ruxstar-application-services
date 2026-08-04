/**
 * My Businesses Screen
 * Status dropdown filter · skeleton · per-item delete · pull-to-refresh
 * Action buttons now live in BusinessCard (Finish Setup / View Calendar)
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
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
import { useAuthStore } from '@/stores/auth-store';
import { useKycStore } from '@/stores/kyc-store';
import { useBusinessStore } from '@/stores/business-store';
import { supportsSetup, type Business, type BusinessModule } from '@/services/vendor-business-service';
import { listVendorEvents } from '@/services/vendor-event-service';
import BusinessCard from '@/components/vendor/BusinessCard';
import VendorHeader from '@/components/vendor/VendorHeader';
import DropdownPicker, { type DropdownOption } from '@/components/ui/DropdownPicker';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';

// ─── Types & constants ─────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'live' | 'setup' | 'soon';
type ModuleFilter = BusinessModule | 'all';

function getStatusKey(biz: Business): Exclude<StatusFilter, 'all'> {
  // Events businesses have no slot wizard — always treat as live
  if (biz.module === 'events') return 'live';
  if (biz.setupComplete || biz.status === 'live') return 'live';
  if (supportsSetup(biz)) return 'setup';
  return 'soon';
}

const STATUS_OPTIONS: DropdownOption[] = [
  { value: 'all',   label: 'All businesses' },
  { value: 'live',  label: 'Live'           },
  { value: 'setup', label: 'Needs setup'    },
  { value: 'soon',  label: 'Coming soon'    },
];

const MODULE_LABELS: Record<string, string> = {
  events:       'Events & tournaments',
  appointments: 'Appointments',
  services:     'Services & professionals',
  commerce:     'Shopping & commerce',
  creator:      'Creator economy',
  print:        'Print on demand',
};

// ─── Style factories ──────────────────────────────────────────────────────────

const createSkStyles = (brand: BrandTokens) => StyleSheet.create({
  card:   { backgroundColor: brand.surface1, borderRadius: Radius.xl, borderWidth: 1, borderColor: brand.border1, overflow: 'hidden', marginBottom: Spacing.two + 2 },
  cover:  { height: 110, backgroundColor: brand.surface2 },
  body:   { padding: Spacing.three, gap: 6 },
  footer: { borderTopWidth: 1, borderTopColor: brand.border1, padding: Spacing.three },
  line:   { height: 14, backgroundColor: brand.surface2, borderRadius: 6 },
});

const createBannerStyles = (brand: BrandTokens) => StyleSheet.create({
  banner:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: 'rgba(217,119,6,0.06)', borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(217,119,6,0.20)', padding: Spacing.three, marginBottom: Spacing.three },
  iconWrap:{ width: 38, height: 38, borderRadius: Radius.md, backgroundColor: 'rgba(217,119,6,0.10)', alignItems: 'center', justifyContent: 'center' },
  text:    { flex: 1 },
  title:   { fontSize: 13, fontWeight: '700', color: brand.cream },
  sub:     { fontSize: 11, color: brand.creamSub, marginTop: 2 },
});

const createEmptyStyles = (brand: BrandTokens) => StyleSheet.create({
  wrap:    { alignItems: 'center', paddingTop: Spacing.six, gap: Spacing.two },
  iconWrap:{ width: 72, height: 72, borderRadius: Radius.xl, backgroundColor: brand.surface2, borderWidth: 1, borderColor: brand.border1, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  title:   { fontSize: 18, fontWeight: '800', color: brand.cream, textAlign: 'center' },
  sub:     { fontSize: 13, color: brand.creamSub, textAlign: 'center', lineHeight: 19, paddingHorizontal: Spacing.four },
  btn:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: 14, borderRadius: Radius.pill, backgroundColor: brand.primary },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

const createErrorStyles = (brand: BrandTokens) => StyleSheet.create({
  wrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  iconWrap:{ width: 68, height: 68, borderRadius: Radius.xl, backgroundColor: brand.surface1, borderWidth: 1, borderColor: brand.border1, alignItems: 'center', justifyContent: 'center' },
  title:   { fontSize: 16, fontWeight: '700', color: brand.cream },
  sub:     { fontSize: 13, color: brand.creamSub, textAlign: 'center' },
  btn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: brand.primary, borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: 12, marginTop: Spacing.one },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

const createScreenStyles = (brand: BrandTokens) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: brand.bg },

  skeletonList: { padding: Spacing.four, gap: 0 },
  listContent:  { padding: Spacing.four, paddingBottom: 100 },

  // Dropdown filter
  dropdownRow: { flexDirection: 'row', paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.two, gap: Spacing.two },

  // FAB
  fab: {
    position: 'absolute', right: Spacing.four, bottom: 28,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: brand.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: brand.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 7,
  },
});

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  const { brand } = useTheme();
  const sk = useMemo(() => createSkStyles(brand), [brand]);
  return (
    <View style={sk.card}>
      <View style={sk.cover} />
      <View style={sk.body}>
        <View style={[sk.line, { width: '60%' }]} />
        <View style={[sk.line, { width: '40%', height: 10, marginTop: 4 }]} />
      </View>
      <View style={sk.footer}>
        <View style={[sk.line, { width: '45%', height: 28, borderRadius: Radius.pill }]} />
      </View>
    </View>
  );
}

// ─── KYC Banner ──────────────────────────────────────────────────────────────

function KycBanner() {
  const { brand } = useTheme();
  const b = useMemo(() => createBannerStyles(brand), [brand]);
  return (
    <Pressable style={b.banner} onPress={() => router.push('/(vendor)/kyc' as never)}>
      <View style={b.iconWrap}>
        <Ionicons name="shield-checkmark-outline" size={20} color={brand.warning} />
      </View>
      <View style={b.text}>
        <Text style={b.title}>KYC required</Text>
        <Text style={b.sub}>Complete identity verification to add businesses</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={brand.warning} />
    </Pressable>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ onAdd, filtered }: { onAdd: () => void; filtered: boolean }) {
  const { brand } = useTheme();
  const e = useMemo(() => createEmptyStyles(brand), [brand]);
  if (filtered) {
    return (
      <View style={e.wrap}>
        <View style={e.iconWrap}>
          <Ionicons name="filter-outline" size={28} color={brand.creamMuted} />
        </View>
        <Text style={e.title}>No matches</Text>
        <Text style={e.sub}>Try a different filter</Text>
      </View>
    );
  }
  return (
    <View style={e.wrap}>
      <View style={e.iconWrap}>
        <Ionicons name="storefront-outline" size={32} color={brand.creamMuted} />
      </View>
      <Text style={e.title}>No businesses yet</Text>
      <Text style={e.sub}>Add your first listing to start accepting bookings</Text>
      <Pressable style={e.btn} onPress={onAdd}>
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={e.btnText}>Add first business</Text>
      </Pressable>
    </View>
  );
}

// ─── Error state ─────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { brand } = useTheme();
  const er = useMemo(() => createErrorStyles(brand), [brand]);
  return (
    <View style={er.wrap}>
      <View style={er.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={32} color={brand.creamMuted} />
      </View>
      <Text style={er.title}>Something went wrong</Text>
      <Text style={er.sub}>{message}</Text>
      <Pressable style={er.btn} onPress={onRetry}>
        <Ionicons name="refresh-outline" size={14} color="#fff" />
        <Text style={er.btnText}>Retry</Text>
      </Pressable>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function BusinessesScreen() {
  const token     = useAuthStore((s) => s.token);
  const kycStatus = useKycStore((s) => s.status);
  const { businesses, loading, removingId, error, loadBusinesses, removeBusiness } = useBusinessStore();

  const { brand } = useTheme();
  const s = useMemo(() => createScreenStyles(brand), [brand]);

  const [refreshing,    setRefreshing]    = useState(false);
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>('all');
  const [moduleFilter,  setModuleFilter]  = useState<ModuleFilter>('all');
  const [eventCounts,    setEventCounts]    = useState<Record<string, number>>({});
  const [firstEventIds,  setFirstEventIds]  = useState<Record<string, string>>({});
  // Track whether we've loaded events at least once to avoid redundant calls
  const eventsFetched = useRef(false);

  const kycVerified = kycStatus?.status === 'verified';

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    await loadBusinesses(token);
    // Load event counts + first event ID per business (once or on refresh)
    if (!eventsFetched.current || isRefresh) {
      try {
        const allEvents = await listVendorEvents(token);
        const counts: Record<string, number> = {};
        const firsts: Record<string, string> = {};
        for (const ev of allEvents) {
          if (ev.businessId) {
            counts[ev.businessId] = (counts[ev.businessId] ?? 0) + 1;
            // Keep the most recently created event as "first" (list is sorted desc by backend)
            if (!firsts[ev.businessId]) firsts[ev.businessId] = ev.id;
          }
        }
        setEventCounts(counts);
        setFirstEventIds(firsts);
        eventsFetched.current = true;
      } catch {
        // Non-fatal — event data is optional UI enhancement
      }
    }
    setRefreshing(false);
  }, [token, loadBusinesses]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Build module options dynamically — only show if vendor has >1 module type
  const moduleOptions = useMemo<DropdownOption[]>(() => {
    const seen = new Set<string>();
    for (const b of businesses) if (b.module) seen.add(b.module);
    if (seen.size <= 1) return [];
    return [
      { value: 'all', label: 'All types' },
      ...Array.from(seen).map((m) => ({ value: m, label: MODULE_LABELS[m] ?? m })),
    ];
  }, [businesses]);

  const filtered = useMemo(() => {
    let list = businesses;
    if (statusFilter !== 'all') list = list.filter((b) => getStatusKey(b) === statusFilter);
    if (moduleFilter !== 'all') list = list.filter((b) => b.module === moduleFilter);
    return list;
  }, [businesses, statusFilter, moduleFilter]);

  const handleRemove = useCallback(async (id: string) => {
    if (!token) return;
    await removeBusiness(token, id);
  }, [token, removeBusiness]);

  const goAdd = () => router.push('/(vendor)/add-business' as never);
  const filtersActive = statusFilter !== 'all' || moduleFilter !== 'all';

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <VendorHeader />

      {/* Loading skeletons */}
      {loading && !refreshing ? (
        <View style={s.skeletonList}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <>
          {/* Dropdown filter row — shown when businesses exist */}
          {businesses.length > 0 && (
            <View style={s.dropdownRow}>
              <DropdownPicker
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as StatusFilter)}
              />
              {moduleOptions.length > 1 && (
                <DropdownPicker
                  options={moduleOptions}
                  value={moduleFilter}
                  onChange={(v) => setModuleFilter(v as ModuleFilter)}
                />
              )}
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(b) => b.id}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => load(true)}
                tintColor={brand.primary}
              />
            }
            ListHeaderComponent={
              !kycVerified ? <KycBanner /> : null
            }
            ListEmptyComponent={
              kycVerified
                ? <EmptyState onAdd={goAdd} filtered={filtersActive} />
                : null
            }
            renderItem={({ item }) => (
              <BusinessCard
                business={item}
                onRemove={handleRemove}
                removing={removingId === item.id}
                eventCount={eventCounts[item.id] ?? 0}
                firstEventId={firstEventIds[item.id]}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.two + 2 }} />}
          />
        </>
      )}

      {/* FAB */}
      {!loading && kycVerified && businesses.length > 0 && (
        <Pressable style={s.fab} onPress={goAdd}>
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      )}
    </SafeAreaView>
  );
}
