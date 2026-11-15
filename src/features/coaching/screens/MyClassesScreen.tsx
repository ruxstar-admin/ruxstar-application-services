import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { dayLabel, dayText, timeText } from '@/features/events/lib/events';
import { errorText } from '@/features/events/lib/messages';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { istDayKey } from '@/lib/booking/days';
import { Feedback } from '@/lib/haptics';
import { CoachingService } from '@/services/coaching-service';
import type { Certificate, CoachingOrder, MyOrdersView, TimetableEntry } from '@/types/coaching';
import { JoinButton } from '../components/JoinButton';
import { useNow } from '../hooks/use-now';
import { byDay, changeText, nextClass } from '../lib/classes';
import { ORDER_STATUS } from '../lib/coaching';
import { addDay } from '../lib/schedule';

const TABS = [
  { key: 'week', label: 'This week' },
  { key: 'enrolled', label: 'Enrolled' },
  { key: 'certificates', label: 'Certificates' },
] as const;
type Tab = (typeof TABS)[number]['key'];
const VIEWS: { key: MyOrdersView; label: string }[] = [
  { key: 'current', label: 'Current' },
  { key: 'past', label: 'Past' },
];
const DAYS = 7;

function Press({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

function EntryCard({ entry, now, onPress }: { entry: TimetableEntry; now: number; onPress: () => void }) {
  const cls = entry.class;
  const cancelled = cls.status === 'cancelled';
  const change = changeText(cls);
  return (
    <View style={styles.entry}>
      <Press label={[timeText(cls.startsAt), entry.course.title, entry.student.name, change].filter(Boolean).join(', ')} onPress={onPress}>
        <View style={styles.time}>
          <Text style={[styles.timeText, cancelled && styles.struck]}>{timeText(cls.startsAt)}</Text>
          <Text style={styles.small}>{`to ${timeText(cls.endsAt)}`}</Text>
        </View>
        <View style={styles.text}>
          <Text style={[styles.title, cancelled && styles.struck]} numberOfLines={1}>
            {entry.course.title}
          </Text>
          <Text style={styles.small} numberOfLines={1}>{`${entry.student.name} · ${entry.batchName}${entry.kind === 'demo' ? ' · demo' : ''}`}</Text>
          {change ? <Text style={[styles.change, cancelled && styles.cancelled]}>{change}</Text> : null}
        </View>
        {cls.extra ? <Badge label="Extra" tone="accent" /> : null}
      </Press>
      <JoinButton orderId={entry.orderId} cls={cls} mode={entry.course.mode} now={now} />
    </View>
  );
}

function Week() {
  const router = useRouter();
  const token = useAuthToken();
  const now = useNow();
  const today = istDayKey(now);
  const { data, loading, error, reload } = useAsyncResource(() => CoachingService.timetable(token, today, DAYS).then((p) => p.items), today);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));

  if (loading && !data) {
    return (
      <View style={styles.skeletons}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={76} radius={18} />
        ))}
      </View>
    );
  }
  if (error && !data) return <EmptyState icon="cloud-offline-outline" title="Could not load your classes" actionLabel="Try again" onAction={reload} />;
  const days = byDay(data ?? []);
  if (!days.length) {
    return (
      <EmptyState
        icon="calendar-outline"
        title="No classes this week"
        message="Classes for you and your children show up here, with a join button for online ones."
        actionLabel="Find a course"
        onAction={() => router.push({ pathname: '/(customer)/(tabs)/discover', params: { category: 'coaching' } })}
      />
    );
  }
  const tomorrow = addDay(today, 1);
  return (
    <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={Brand.primarySoft} />}>
      {days.map((d) => (
        <View key={d.day} style={styles.day}>
          <Text style={styles.dayLabel} accessibilityRole="header">
            {d.day === today ? 'Today' : d.day === tomorrow ? 'Tomorrow' : dayLabel(d.day)}
          </Text>
          {d.entries.map((e) => (
            <EntryCard key={`${e.orderId}-${e.class.id}`} entry={e} now={now} onPress={() => router.push({ pathname: '/(customer)/coaching/enrolment/[id]', params: { id: e.orderId } })} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function OrderCard({ order, now, onPress }: { order: CoachingOrder; now: number; onPress: () => void }) {
  const status = ORDER_STATUS[order.status];
  const next = order.status === 'confirmed' ? nextClass(order.classes, now) : null;
  const line = next ? `Next: ${dayText(next.startsAt)}, ${timeText(next.startsAt)}` : order.batch.schedule;
  return (
    <Press label={[order.course.title, order.student.name, line, status.label].join(', ')} onPress={onPress}>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {order.course.title}
        </Text>
        <Text style={styles.small} numberOfLines={1}>{`${order.student.name} · ${order.kind === 'demo' ? 'Demo class' : order.batch.name}`}</Text>
        <Text style={styles.small} numberOfLines={1}>
          {line}
        </Text>
        {order.kind === 'batch' && order.status === 'confirmed' && order.attendance.held ? (
          <Text style={styles.small}>{`Attendance ${order.attendance.percent}%`}</Text>
        ) : null}
      </View>
      {order.status !== 'confirmed' || order.batch.cancelled ? (
        <Badge label={order.batch.cancelled ? 'Batch cancelled' : status.label} tone={order.batch.cancelled ? 'error' : status.tone} />
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />
    </Press>
  );
}

function Enrolled() {
  const [view, setView] = useState<MyOrdersView>('current');
  return (
    <>
      <ChoiceChips options={VIEWS} value={view} onChange={setView} secondary />
      <Orders key={view} view={view} />
    </>
  );
}

function Orders({ view }: { view: MyOrdersView }) {
  const router = useRouter();
  const token = useAuthToken();
  const now = useNow(60_000);
  const list = usePaginated((cursor) => CoachingService.orders(token, view, cursor));
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
  if (list.error && !list.items.length) return <EmptyState icon="cloud-offline-outline" title="Could not load your enrolments" actionLabel="Try again" onAction={list.retry} />;
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
          icon="school-outline"
          title={view === 'current' ? 'Not enrolled in anything yet' : 'Nothing finished yet'}
          message={view === 'current' ? 'Enrol yourself or your child in a course, or book a demo class first.' : undefined}
          actionLabel={view === 'current' ? 'Find a course' : undefined}
          onAction={view === 'current' ? () => router.push({ pathname: '/(customer)/(tabs)/discover', params: { category: 'coaching' } }) : undefined}
        />
      }
      renderItem={({ item }) => <OrderCard order={item} now={now} onPress={() => router.push({ pathname: '/(customer)/coaching/enrolment/[id]', params: { id: item.id } })} />}
    />
  );
}

function Certificates() {
  const token = useAuthToken();
  const list = usePaginated((cursor) => CoachingService.certificates(token, cursor));
  const [opening, setOpening] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const open = async (c: Certificate) => {
    setOpening(c.id);
    setFailure(null);
    try {
      const order = await CoachingService.order(token, c.orderId);
      await WebBrowser.openBrowserAsync(order.certificate?.pdfUrl ?? c.pdfUrl);
    } catch (err) {
      setFailure(errorText(err));
    } finally {
      setOpening(null);
    }
  };

  if (list.loading) {
    return (
      <View style={styles.skeletons}>
        {[0, 1].map((i) => (
          <Skeleton key={i} height={84} radius={18} />
        ))}
      </View>
    );
  }
  if (list.error && !list.items.length) return <EmptyState icon="cloud-offline-outline" title="Could not load certificates" actionLabel="Try again" onAction={list.retry} />;
  return (
    <FlatList
      data={list.items}
      keyExtractor={(c) => c.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={failure ? <ErrorBanner message={failure} /> : null}
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      ListEmptyComponent={<EmptyState icon="ribbon-outline" title="No certificates yet" message="When a batch ends, students who attended enough classes get a certificate here." />}
      renderItem={({ item }) => (
        <Press label={`Certificate, ${item.courseTitle}, ${item.studentName}. Opens the PDF.`} onPress={() => open(item)}>
          <Ionicons name="ribbon-outline" size={26} color={Brand.primarySoft} />
          <View style={styles.text}>
            <Text style={styles.title} numberOfLines={1}>
              {item.courseTitle}
            </Text>
            <Text style={styles.small} numberOfLines={1}>{`${item.studentName} · ${item.batchName} · ${item.businessName}`}</Text>
            <Text style={styles.small}>{`Attended ${item.attended} of ${item.classes} · issued ${dayText(item.issuedAt)}`}</Text>
          </View>
          {opening === item.id ? <ActivityIndicator color={Brand.primarySoft} /> : <Ionicons name="open-outline" size={18} color={Brand.textFaint} />}
        </Press>
      )}
    />
  );
}

/** Your and your children's classes: this week's timetable with join buttons, enrolments, and certificates. */
export function MyClassesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('week');
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Your classes" onBack={() => router.back()} />
        <View style={styles.childrenLink}>
          <TextLink label="My children" onPress={() => router.push('/(customer)/coaching/children')} />
        </View>
        <SegmentedTabs options={TABS} value={tab} onChange={setTab} />
      </View>
      {tab === 'week' ? <Week /> : tab === 'enrolled' ? <Enrolled /> : <Certificates />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.three },
  childrenLink: { alignItems: 'flex-end' },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three, flexGrow: 1 },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  footer: { paddingVertical: Spacing.three },
  day: { gap: Spacing.two },
  dayLabel: { ...Typography.overline, fontSize: 12, color: Brand.textMuted },
  entry: { gap: Spacing.two },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  pressed: { opacity: 0.8 },
  time: { width: 64, gap: 2 },
  timeText: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  text: { flex: 1, gap: 2 },
  title: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  struck: { textDecorationLine: 'line-through', color: Brand.textMuted },
  change: { ...Typography.caption, color: Brand.warning },
  cancelled: { color: Brand.error },
});
