import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { EventsService } from '@/services/events-service';
import type { MyTicketsView, TicketOrder } from '@/types/events';
import { ORDER_STATUS, dayText, timeText } from '../lib/events';

const VIEWS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
] as const;

function OrderCard({ order, onPress }: { order: TicketOrder; onPress: () => void }) {
  const status = ORDER_STATUS[order.status];
  const [, day, month] = dayText(order.event.startsAt).replace(',', '').split(' ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${order.event.title}, ${dayText(order.event.startsAt)}, ${order.tickets.length} tickets, ${status.label}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.date}>
        <Text style={styles.day}>{day}</Text>
        <Text style={styles.month}>{month?.toUpperCase()}</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {order.event.title}
        </Text>
        <Text style={styles.muted} numberOfLines={1}>
          {`${timeText(order.event.startsAt)} · ${order.event.online ? 'Online' : (order.event.venueName ?? '')}`}
        </Text>
        <View style={styles.row}>
          <Ionicons name="ticket-outline" size={14} color={Brand.textMuted} />
          <Text style={styles.muted}>{order.tickets.length === 1 ? '1 ticket' : `${order.tickets.length} tickets`}</Text>
          {order.status !== 'confirmed' || order.event.cancelled ? <Badge label={order.event.cancelled ? 'Event cancelled' : status.label} tone={order.event.cancelled ? 'error' : status.tone} /> : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />
    </Pressable>
  );
}

function List({ view }: { view: MyTicketsView }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => EventsService.orders(token, view, cursor));
  useRefetchOnFocus(list.refresh);

  if (list.loading) {
    return (
      <View style={styles.skeletons}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={84} radius={18} />
        ))}
      </View>
    );
  }
  if (list.error && !list.items.length) return <EmptyState icon="cloud-offline-outline" title="Could not load your tickets" actionLabel="Try again" onAction={list.retry} />;
  return (
    <FlatList
      data={list.items}
      keyExtractor={(o) => o.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      ListEmptyComponent={
        <EmptyState
          icon="ticket-outline"
          title={view === 'upcoming' ? 'No tickets yet' : 'No past events'}
          message={view === 'upcoming' ? 'Tickets you book show up here, with a QR code for each person.' : undefined}
          actionLabel={view === 'upcoming' ? 'Find events' : undefined}
          onAction={view === 'upcoming' ? () => router.push({ pathname: '/(customer)/(tabs)/discover', params: { category: 'events' } }) : undefined}
        />
      }
      renderItem={({ item }) => <OrderCard order={item} onPress={() => router.push({ pathname: '/(customer)/events/ticket/[id]', params: { id: item.id } })} />}
    />
  );
}

/** Your event bookings: upcoming soonest first, then past ones. */
export function MyTicketsScreen() {
  const router = useRouter();
  const [view, setView] = useState<MyTicketsView>('upcoming');
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Your tickets" onBack={() => router.back()} />
        <SegmentedTabs options={VIEWS} value={view} onChange={setView} />
      </View>
      <List key={view} view={view} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three, flexGrow: 1 },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  footer: { paddingVertical: Spacing.three },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  pressed: { opacity: 0.8 },
  date: { width: 54, height: 58, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,92,242,0.14)' },
  day: { ...Typography.bodyStrong, fontSize: 20, lineHeight: 22, color: Brand.text },
  month: { ...Typography.caption, fontSize: 11, letterSpacing: 1, color: Brand.primarySoft },
  text: { flex: 1, gap: 2 },
  title: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
});
