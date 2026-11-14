import { useState } from 'react';
import { ActivityIndicator, FlatList, Linking, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { DeskService } from '@/services/events-service';
import type { Guest, GuestsView } from '@/types/events';
import { timeText } from '../lib/events';
import { errorText } from '../lib/messages';

const VIEWS = [
  { key: 'not_arrived', label: 'Not here yet' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'all', label: 'Everyone' },
] as const;

function GuestRow({ guest }: { guest: Guest }) {
  return (
    <View style={styles.row}>
      <View style={[styles.mark, guest.inToday ? styles.markIn : null]}>
        <Ionicons name={guest.inToday ? 'checkmark' : 'time-outline'} size={16} color={guest.inToday ? '#0D0C12' : Brand.textMuted} />
      </View>
      <View style={styles.text}>
        <Text style={styles.name}>{guest.name}</Text>
        <Text style={styles.small}>{[guest.team, guest.tier, guest.code].filter(Boolean).join(' · ')}</Text>
        {guest.inToday ? (
          <Text style={styles.small}>
            {`In at ${timeText(guest.inToday)}${guest.by ? ` by ${guest.by}` : ''}${guest.manual ? ', typed in' : ''}`}
            {guest.clash ? <Text style={styles.clash}> · also used on another phone</Text> : null}
          </Text>
        ) : null}
      </View>
      {guest.phone ? (
        <Text accessibilityRole="link" accessibilityLabel={`Call ${guest.name}`} style={styles.call} onPress={() => void Linking.openURL(`tel:${guest.phone}`)}>
          Call
        </Text>
      ) : null}
    </View>
  );
}

function List({ eventId, view }: { eventId: string; view: GuestsView }) {
  const token = useAuthToken();
  const list = usePaginated((cursor) => DeskService.guests(token, eventId, view, cursor));
  if (list.loading) {
    return (
      <View style={styles.skeletons}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={60} radius={14} />
        ))}
      </View>
    );
  }
  if (list.error && !list.items.length) return <EmptyState icon="lock-closed-outline" title="Can’t show the guest list" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  return (
    <FlatList
      data={list.items}
      keyExtractor={(g) => g.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      initialNumToRender={20}
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      ListEmptyComponent={
        <EmptyState icon="people-outline" title={view === 'not_arrived' ? 'Everyone’s here' : view === 'arrived' ? 'No one in yet today' : 'No tickets yet'} />
      }
      renderItem={({ item }) => <GuestRow guest={item} />}
    />
  );
}

/** Who has a ticket and who has come in today, for the owner and team allowed to see it. */
export function GuestListScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [view, setView] = useState<GuestsView>('not_arrived');
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Guest list" onBack={() => router.back()} />
        <SegmentedTabs options={VIEWS} value={view} onChange={setView} />
      </View>
      <List key={view} eventId={id} view={view} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, flexGrow: 1 },
  skeletons: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  footer: { paddingVertical: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Brand.border },
  mark: { width: 30, height: 30, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.surfaceAlt },
  markIn: { backgroundColor: Brand.success },
  text: { flex: 1, gap: 2 },
  name: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  clash: { color: Brand.warning },
  call: { ...Typography.bodyStrong, fontSize: 14, color: Brand.primarySoft, padding: Spacing.two },
});
