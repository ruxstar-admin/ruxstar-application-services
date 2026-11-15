import { useCallback, useState } from 'react';
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
import { dayText, timeText } from '@/features/events/lib/events';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { TeachService } from '@/services/coaching-service';
import type { DeskBatch, TodayClass } from '@/types/coaching';
import { useNow } from '../hooks/use-now';
import { BATCH_STATUS } from '../lib/coaching';
import { markLine } from '../lib/desk';

const TABS = [
  { key: 'today', label: 'Today' },
  { key: 'batches', label: 'Batches' },
] as const;
type Tab = (typeof TABS)[number]['key'];

function TodayCard({ cls, now, onPress }: { cls: TodayClass; now: number; onPress: () => void }) {
  const cancelled = cls.status === 'cancelled';
  const live = !cancelled && Date.parse(cls.startsAt) <= now && Date.parse(cls.endsAt) > now;
  const mark = markLine(cls, now);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[timeText(cls.startsAt), cls.course.title, cls.batch.name, `${cls.students} students`, mark.text].join(', ')}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, live && styles.live, pressed && styles.pressed]}
    >
      <View style={styles.time}>
        <Text style={[styles.timeText, cancelled && styles.struck]}>{timeText(cls.startsAt)}</Text>
        <Text style={styles.small}>{`to ${timeText(cls.endsAt)}`}</Text>
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, cancelled && styles.struck]} numberOfLines={1}>
          {cls.course.title}
        </Text>
        <Text style={styles.small} numberOfLines={1}>{`${cls.batch.name} · ${cls.students} ${cls.students === 1 ? 'student' : 'students'}${cls.demos ? ` · ${cls.demos} demo` : ''}`}</Text>
        <Text style={[styles.small, { color: mark.colour }]}>{mark.text}</Text>
      </View>
      {live ? <Badge label="Now" tone="success" /> : cls.extra ? <Badge label="Extra" tone="accent" /> : null}
      <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />
    </Pressable>
  );
}

function Today() {
  const router = useRouter();
  const token = useAuthToken();
  const now = useNow();
  const { data, loading, error, reload } = useAsyncResource(() => TeachService.today(token).then((p) => p.items), 'today');
  useRefetchOnFocus(useCallback(() => reload(), [reload]));

  if (loading && !data) {
    return (
      <View style={styles.skeletons}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={84} radius={18} />
        ))}
      </View>
    );
  }
  if (error && !data) return <EmptyState icon="cloud-offline-outline" title="Could not load today’s classes" actionLabel="Try again" onAction={reload} />;
  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(c) => c.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={Brand.primarySoft} />}
      ListEmptyComponent={<EmptyState icon="sunny-outline" title="No classes today" message="Classes from your batches show up here on the day, ready for attendance." />}
      renderItem={({ item }) => <TodayCard cls={item} now={now} onPress={() => router.push({ pathname: '/(customer)/teach/class/[id]', params: { id: item.id } })} />}
    />
  );
}

function BatchCard({ batch, onPress }: { batch: DeskBatch; onPress: () => void }) {
  const status = BATCH_STATUS[batch.status];
  const next = batch.nextClass;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[batch.course.title, batch.name, batch.schedule, `${batch.students} students`, status.label].join(', ')}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {batch.course.title}
        </Text>
        <Text style={styles.small} numberOfLines={1}>{`${batch.name} · ${batch.business.name}`}</Text>
        <Text style={styles.small} numberOfLines={1}>
          {batch.schedule}
        </Text>
        <Text style={styles.small}>
          {`${batch.students} ${batch.students === 1 ? 'student' : 'students'}${next ? ` · next ${dayText(next.startsAt)}, ${timeText(next.startsAt)}` : ''}`}
        </Text>
      </View>
      <View style={styles.badges}>
        {batch.role === 'coach' ? <Badge label="Coach" tone="neutral" /> : null}
        {batch.status !== 'open' && batch.status !== 'started' ? <Badge label={status.label} tone={status.tone} /> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />
    </Pressable>
  );
}

function Batches() {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => TeachService.batches(token, cursor));
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
  if (list.error && !list.items.length) return <EmptyState icon="cloud-offline-outline" title="Could not load your batches" actionLabel="Try again" onAction={list.retry} />;
  return (
    <FlatList
      data={list.items}
      keyExtractor={(b) => b.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      ListEmptyComponent={
        <EmptyState icon="school-outline" title="No batches yet" message="Batches you run, or the owner makes you a coach on, show up here." />
      }
      renderItem={({ item }) => <BatchCard batch={item} onPress={() => router.push({ pathname: '/(customer)/teach/batch/[id]', params: { id: item.id } })} />}
    />
  );
}

/** Classes for the owner and coaches: today's, ready for attendance, and every batch they teach. */
export function TeachScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('today');
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Classes" onBack={() => router.back()} />
        <SegmentedTabs options={TABS} value={tab} onChange={setTab} />
      </View>
      {tab === 'today' ? <Today /> : <Batches />}
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
  live: { borderColor: 'rgba(52,199,89,0.6)' },
  pressed: { opacity: 0.8 },
  time: { width: 64, gap: 2 },
  timeText: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  text: { flex: 1, gap: 2 },
  title: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  struck: { textDecorationLine: 'line-through', color: Brand.textMuted },
  badges: { gap: Spacing.one, alignItems: 'flex-end' },
});
