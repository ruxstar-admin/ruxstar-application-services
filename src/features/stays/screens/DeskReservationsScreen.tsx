import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { BookingRow } from '@/features/turf/components/BookingRow';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { StaysDeskService } from '@/services/stays-service';
import type { DeskReservation, DeskReservationsView } from '@/types/stays';
import { STAY_STATUS, bedsText, dayShort, stayText } from '../lib/stays';

const VIEWS = [
  { key: 'upcoming', label: 'To move in' },
  { key: 'staying', label: 'Staying' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
] as const;

const EMPTY: Record<DeskReservationsView | 'tenants', { title: string; message?: string }> = {
  upcoming: { title: 'Nobody to move in', message: 'Paid reservations waiting for move-in show up here.' },
  staying: { title: 'Nobody staying', message: 'Tenants show up here once you mark them moved in.' },
  past: { title: 'No past reservations' },
  all: { title: 'No reservations yet', message: 'Reservations tenants make in the app show up here.' },
  tenants: { title: 'Nobody staying right now', message: 'Tenants show up here once you mark them moved in.' },
};

function tenantLines(r: DeskReservation): string[] {
  return [
    [r.tenant.name, r.tenant.verified ? 'Verified' : null].filter(Boolean).join(' · '),
    `${bedsText(r)} · ${stayText(r)}`,
    r.objection?.status === 'open' ? 'Tenant says something’s wrong' : r.moveOut ? `Moving out ${dayShort(r.moveOut.on)}` : null,
  ].filter((l): l is string => !!l);
}

function List({ propertyId, view }: { propertyId: string; view: DeskReservationsView | 'tenants' }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => (view === 'tenants' ? StaysDeskService.tenants(token, propertyId, cursor) : StaysDeskService.reservations(token, propertyId, view, cursor)));
  useRefetchOnFocus(list.refresh);

  if (list.loading) {
    return (
      <View style={styles.skeletons}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={96} radius={18} />
        ))}
      </View>
    );
  }
  if (list.error && !list.items.length) return <EmptyState icon="cloud-offline-outline" title="Could not load reservations" actionLabel="Try again" onAction={list.retry} />;
  return (
    <FlatList
      data={list.items}
      keyExtractor={(r) => r.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      ListEmptyComponent={<EmptyState icon="bed-outline" title={EMPTY[view].title} message={EMPTY[view].message} />}
      renderItem={({ item }) => (
        <BookingRow
          at={item.from}
          title={`#${item.orderNo} · ${item.room.name}`}
          lines={tenantLines(item)}
          badge={item.objection?.status === 'open' ? { label: 'Objection', tone: 'error' } : STAY_STATUS[item.status]}
          onPress={() => router.push({ pathname: '/(customer)/stays-desk/order/[id]', params: { id: item.id } })}
        />
      )}
    />
  );
}

/** A property's reservations, by whether they're still to move in, staying now, or past. */
export function DeskReservationsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [view, setView] = useState<DeskReservationsView>('upcoming');
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Reservations" onBack={() => router.back()} />
        <SegmentedTabs options={VIEWS} value={view} onChange={setView} />
      </View>
      <List key={view} propertyId={id} view={view} />
    </SafeAreaView>
  );
}

/** Who's staying at a property now, with their phone and any notice. */
export function DeskTenantsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Tenants" onBack={() => router.back()} />
      </View>
      <List propertyId={id} view="tenants" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three, flexGrow: 1 },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  footer: { paddingVertical: Spacing.three },
});
