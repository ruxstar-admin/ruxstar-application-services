import { useCallback } from 'react';
import { Linking, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefundLine } from '@/components/booking';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { dayText, timeText, whenLine } from '@/features/events/lib/events';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { ListingReviews } from '@/features/reviews/components/ListingReviews';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { CoachingService } from '@/services/coaching-service';
import type { BatchView, CourseDetail } from '@/types/coaching';
import { Fact, Facts, Notice, Section } from '../components/Parts';
import { BATCH_STATUS, CATEGORY_LABEL, MODE_LABEL, classesLine, demoLine, feeText, openBatches, placeLine, seatsLine } from '../lib/coaching';

function BatchCard({ batch, onEnrol }: { batch: BatchView; onEnrol: (() => void) | null }) {
  const status = BATCH_STATUS[batch.status];
  const open = batch.status === 'open' && batch.seatsLeft > 0;
  return (
    <View style={styles.batch}>
      <View style={styles.batchHead}>
        <Text style={styles.batchName}>{batch.name}</Text>
        <Text style={styles.fee}>{feeText(batch.fee)}</Text>
      </View>
      <Text style={styles.schedule}>{batch.schedule}</Text>
      <Text style={styles.small}>{classesLine(batch)}</Text>
      {batch.coaches.length ? <Text style={styles.small}>{`Taught by ${batch.coaches.map((c) => c.name).join(', ')}`}</Text> : null}
      <View style={styles.batchFoot}>
        {open ? <Text style={[styles.seats, batch.seatsLeft <= 5 && styles.few]}>{seatsLine(batch)}</Text> : <Badge label={status.label} tone={status.tone} />}
        {batch.minStudents ? <Text style={styles.small}>{`Runs with at least ${batch.minStudents} students`}</Text> : null}
      </View>
      {open && onEnrol ? <PrimaryButton label={batch.fee ? `Enrol · ${money(batch.fee)}` : 'Enrol for free'} variant="outline" onPress={onEnrol} /> : null}
    </View>
  );
}

function CourseView({ course }: { course: CourseDetail }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const open = openBatches(course);
  const shown = course.batches.filter((b) => b.status !== 'cancelled' && b.status !== 'ended');
  const demo = demoLine(course.demo);
  const enrol = (batchId?: string) => router.push({ pathname: '/(customer)/coaching/book/[id]', params: { id: course.id, kind: 'batch', ...(batchId ? { batchId } : {}) } });
  const bookDemo = () => router.push({ pathname: '/(customer)/coaching/book/[id]', params: { id: course.id, kind: 'demo' } });
  const demoOpen = course.canEnrol && course.demoClasses.some((d) => d.seatsLeft > 0);

  const footer = !course.canEnrol ? (
    <PrimaryButton label={course.whyNot ?? 'Not taking students'} disabled onPress={() => undefined} />
  ) : open.length ? (
    <PrimaryButton label={open.length === 1 ? `Enrol · ${feeText(open[0]!.fee)}` : 'Choose a batch and enrol'} onPress={() => enrol(open.length === 1 ? open[0]!.id : undefined)} />
  ) : (
    <PrimaryButton label="No batches open right now" disabled onPress={() => undefined} />
  );

  return (
    <ScreenContainer title="Course" footer={footer}>
      <ShopCover photo={course.photo ? { ...course.photo, smaller: [] } : null} name={course.title} width={width} style={styles.cover} dimmed={!course.canEnrol} />
      <View style={styles.head}>
        <View style={styles.badges}>
          <Badge label={CATEGORY_LABEL[course.category]} tone="accent" />
          <Badge label={MODE_LABEL[course.mode]} tone="neutral" />
        </View>
        <Text style={styles.title}>{course.title}</Text>
        <Text style={styles.by}>{`By ${course.business.name}`}</Text>
      </View>

      {course.status === 'removed' ? <Notice tone="error" text="Ruxstar took this course down. It isn’t taking enrolments." /> : null}

      {course.myOrders.length ? (
        <View style={styles.mine}>
          {course.myOrders.map((o) => (
            <ListRow
              key={o.id}
              icon={o.kind === 'demo' ? 'sparkles-outline' : 'school-outline'}
              title={
                o.status === 'awaiting_payment'
                  ? `Finish paying for ${o.student.name}`
                  : `${o.kind === 'demo' ? 'Demo class' : 'Enrolment'} for ${o.student.name}${o.status === 'cancelled' ? ' · cancelled' : ''}`
              }
              subtitle={`#${o.orderNo}`}
              onPress={() => router.push({ pathname: '/(customer)/coaching/enrolment/[id]', params: { id: o.id } })}
            />
          ))}
        </View>
      ) : null}

      <Facts>
        {course.mode === 'online' ? (
          <Fact icon="videocam-outline" title="Online, live classes" detail="The join button shows in your classes a few minutes before each class." />
        ) : (
          <Fact icon="location-outline" title={course.venue?.name ?? placeLine(course)} detail={course.venue ? `${course.venue.address}, ${course.venue.city}` : null} />
        )}
        <Fact icon="ribbon-outline" title="Certificate" detail={`Attend ${course.certificatePercent}% of the classes to get one after the last class.`} />
        {demo ? <Fact icon="sparkles-outline" title={demo} detail="Try one class before you enrol. One demo per student." /> : null}
      </Facts>
      {course.venue && course.mode === 'offline' ? (
        <TextLink
          label="Open in maps"
          onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${course.venue!.name}, ${course.venue!.address}, ${course.venue!.city}`)}`)}
        />
      ) : null}

      <Section title="Batches" />
      {shown.length ? (
        shown.map((b) => <BatchCard key={b.id} batch={b} onEnrol={course.canEnrol ? () => enrol(b.id) : null} />)
      ) : (
        <Text style={styles.small}>No batches coming up yet. Check back soon.</Text>
      )}
      {course.platformFee && open.some((b) => b.fee > 0) ? <Text style={styles.small}>{`Plus a ${money(course.platformFee)} platform fee when you enrol.`}</Text> : null}

      {course.demo ? (
        <>
          <Section title="Demo class" />
          {course.demoClasses.length ? (
            <View style={styles.demos}>
              {course.demoClasses.slice(0, 3).map((d) => (
                <Text key={d.sessionId} style={styles.small}>{`• ${whenLine(d.startsAt, d.endsAt)} · ${d.batchName}${d.seatsLeft <= 0 ? ' · full' : ''}`}</Text>
              ))}
              {course.demoClasses.length > 3 ? <Text style={styles.small}>{`and ${course.demoClasses.length - 3} more`}</Text> : null}
            </View>
          ) : (
            <Text style={styles.small}>No demo classes coming up right now.</Text>
          )}
          {demoOpen ? <PrimaryButton label={course.demo.free ? 'Book a free demo class' : `Book a demo class · ${money(course.demo.fee)}`} variant="outline" onPress={bookDemo} /> : null}
        </>
      ) : null}

      <RefundLine text={course.refundRule} refundable />

      <ListingReviews module="coaching" listing={{ type: 'course', id: course.id }} business={course.business.name} rating={course.rating} />

      {course.description ? (
        <>
          <Section title="About" />
          <Text style={styles.description}>{course.description}</Text>
        </>
      ) : null}
      {course.nextStart ? <Text style={styles.small}>{`Next batch starts ${dayText(course.nextStart)}, ${timeText(course.nextStart)}.`}</Text> : null}
    </ScreenContainer>
  );
}

/** One course: what it is, who teaches, each batch with its timetable and seats, the demo, and the refund rule. */
export function CourseDetailScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => CoachingService.get(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));

  return data ? (
    <CourseView course={data} />
  ) : (
    <ScreenContainer title="Course">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={4}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.lg },
  head: { gap: Spacing.one, marginTop: Spacing.two, alignItems: 'flex-start' },
  badges: { flexDirection: 'row', gap: Spacing.two },
  title: { ...Typography.title, color: Brand.text },
  by: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  mine: { paddingHorizontal: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: 'rgba(52,199,89,0.45)', overflow: 'hidden' },
  batch: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  batchHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  batchName: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text, flex: 1 },
  fee: { ...Typography.bodyStrong, fontSize: 16, color: Brand.primarySoft },
  schedule: { ...Typography.body, fontSize: 15, color: Brand.text },
  batchFoot: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two, marginVertical: Spacing.one },
  seats: { ...Typography.caption, color: Brand.success },
  few: { color: Brand.warning },
  small: { ...Typography.caption, color: Brand.textMuted },
  demos: { gap: 2 },
  description: { ...Typography.body, lineHeight: 24, color: Brand.textMuted },
});
