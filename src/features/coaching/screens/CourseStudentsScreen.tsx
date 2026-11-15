import { useState } from 'react';
import { ActivityIndicator, FlatList, Linking, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { dayText, timeText } from '@/features/events/lib/events';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { VendorCoachingService } from '@/services/coaching-service';
import type { OrderKind, StudentRow, StudentsFilter } from '@/types/coaching';
import { ORDER_STATUS } from '../lib/coaching';
import { percentOf } from '../lib/classes';

type Status = NonNullable<StudentsFilter['status']>;
const STATUSES = [
  { key: 'confirmed', label: 'Paid' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;
const ALL = 'all';

function StudentCard({ row }: { row: StudentRow }) {
  const status = ORDER_STATUS[row.status];
  const demo = row.kind === 'demo';
  const { attended, held } = row.attendance;
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {row.student.name}
          </Text>
          <Text style={styles.small}>{`#${row.orderNo} · ${row.batch.name}`}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.title}>{row.total ? money(row.share) : 'Free'}</Text>
          {row.student.child ? <Badge label="Child" tone="neutral" /> : null}
          {row.status !== 'confirmed' ? <Badge label={status.label} tone={status.tone} /> : null}
        </View>
      </View>
      <Text style={styles.small}>
        {demo
          ? row.demoAt
            ? `Demo class ${dayText(row.demoAt)}, ${timeText(row.demoAt)}`
            : 'Demo class'
          : held
            ? `Attended ${attended} of ${held} · ${percentOf(attended, held)}%`
            : `Enrolled ${dayText(row.createdAt)}`}
      </Text>
      {row.student.child || row.parent.name !== row.student.name ? <Text style={styles.small}>{`Parent: ${row.parent.name}`}</Text> : null}
      {row.refunded ? <Text style={styles.small}>{`${money(row.refunded)} refunded`}</Text> : null}
      {row.parent.phone ? <TextLink label={`Call ${row.parent.phone}`} onPress={() => void Linking.openURL(`tel:${row.parent.phone}`)} /> : null}
    </View>
  );
}

function List({ courseId, filter }: { courseId: string; filter: StudentsFilter }) {
  const token = useAuthToken();
  const list = usePaginated((cursor) => VendorCoachingService.students(token, courseId, filter, cursor));
  if (list.loading) {
    return (
      <View style={styles.skeletons}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={88} radius={18} />
        ))}
      </View>
    );
  }
  if (list.error && !list.items.length) return <EmptyState icon="cloud-offline-outline" title="Could not load students" actionLabel="Try again" onAction={list.retry} />;
  const demo = filter.kind === 'demo';
  return (
    <FlatList
      data={list.items}
      keyExtractor={(r) => r.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      ListEmptyComponent={
        <EmptyState
          icon={demo ? 'sparkles-outline' : 'people-outline'}
          title={filter.status === 'cancelled' ? 'Nothing cancelled' : demo ? 'No demo classes booked' : 'No students yet'}
          message={filter.status === 'cancelled' ? undefined : demo ? 'Demo bookings show up here.' : 'Students show up here once they’ve paid.'}
        />
      }
      renderItem={({ item }) => <StudentCard row={item} />}
    />
  );
}

/** A course's enrolments or demo bookings, newest first, by batch. */
export function CourseStudentsScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: OrderKind }>();
  const course = useAsyncResource(() => VendorCoachingService.get(token, id), id);
  const [status, setStatus] = useState<Status>('confirmed');
  const [batch, setBatch] = useState(ALL);
  const chips = [{ key: ALL, label: 'All batches' }, ...(course.data?.batches ?? []).map((b) => ({ key: b.id, label: b.name }))];
  const filter: StudentsFilter = { kind: kind === 'demo' ? 'demo' : 'batch', status, batchId: batch === ALL ? undefined : batch };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title={kind === 'demo' ? 'Demo requests' : 'Students'} onBack={() => router.back()} />
        <SegmentedTabs options={STATUSES} value={status} onChange={setStatus} />
      </View>
      {chips.length > 2 ? (
        <View style={styles.chips}>
          <ChoiceChips options={chips} value={batch} onChange={setBatch} />
        </View>
      ) : null}
      <List key={`${status}:${batch}`} courseId={id} filter={filter} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.three },
  chips: { paddingBottom: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.two, flexGrow: 1 },
  skeletons: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  footer: { paddingVertical: Spacing.three },
  card: { gap: 4, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  text: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  title: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
});
