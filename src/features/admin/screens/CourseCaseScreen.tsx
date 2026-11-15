import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { BATCH_STATUS, CATEGORY_LABEL, COURSE_STATUS, MODE_LABEL, feeText } from '@/features/coaching/lib/coaching';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { AdminService } from '@/services/admin-service';
import type { VendorCourse } from '@/types/coaching';
import { useCan } from '../access';
import { Card, Fact, Facts, Note, ReasonSheet, consoleStyles, errorText } from '../components/parts';
import { shortDate } from '../labels';

/** Drafts and live courses can be taken down; one already taken down can't. */
function TakeDown({ course, onDone }: { course: VendorCourse; onDone: (next: VendorCourse, message: string) => void }) {
  const token = useAuthToken();
  const canManage = useCan('businesses.manage');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());
  if (!canManage || course.status === 'removed') return null;

  const students = course.counts.students + course.counts.demos;
  const message = students
    ? `It leaves the listings for good and its batches are cancelled. Everyone whose first class hasn’t happened yet gets a full refund; places already paid out to the institute aren’t refunded. The institute and every student see your reason. This can’t be undone.`
    : 'It leaves the listings for good. Nobody has enrolled. The institute sees your reason. This can’t be undone.';

  const takeDown = async (reason: string) => {
    setBusy(true);
    setError(null);
    try {
      const next = await AdminService.takeDownCourse(token, course.id, reason, key.current);
      key.current = newIdempotencyKey();
      Feedback.success();
      setOpen(false);
      onDone(next, students ? 'Course taken down. Students are being refunded, and they and the institute have been told why.' : 'Course taken down. The institute has been told why.');
    } catch (err) {
      Feedback.error();
      setOpen(false);
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.actions}>
      {error ? <ErrorBanner message={error} /> : null}
      <PrimaryButton label="Take down" variant="outline" onPress={() => setOpen(true)} disabled={busy} />
      <ReasonSheet
        visible={open}
        title={`Take down ${course.title}?`}
        message={message}
        prompt="Reason"
        placeholder="For example: this course promises exam results it can’t guarantee."
        confirmLabel={students ? 'Take down and refund' : 'Take down'}
        loading={busy}
        onConfirm={takeDown}
        onCancel={() => setOpen(false)}
      />
    </View>
  );
}

/** One course for the Ruxstar team: who runs it, its batches and money, and taking it down. */
export function CourseCaseScreen({ id }: { id: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const canAudit = useCan('audit.view');
  const { data: course, loading, error, reload, setData } = useAsyncResource(() => AdminService.getCourse(token, id), id);
  const [done, setDone] = useState<string | null>(null);

  return (
    <ScreenContainer title="Course">
      <AsyncBoundary loading={loading} error={error} hasData={!!course} onRetry={reload} skeletonRows={5}>
        {course ? (
          <>
            <ShopCover photo={course.photo ? { ...course.photo, smaller: [] } : null} name={course.title} width={400} style={styles.photo} />

            <View style={styles.head}>
              <View style={styles.flex}>
                <Text style={styles.name}>{course.title}</Text>
                <Text style={consoleStyles.muted}>{`${CATEGORY_LABEL[course.category]} · ${MODE_LABEL[course.mode]}`}</Text>
              </View>
              <Badge {...COURSE_STATUS[course.status]} />
            </View>

            {done ? <Note>{done}</Note> : null}
            {course.removal ? <Note tone="danger">{`Taken down by Ruxstar ${timeAgo(course.removal.at)}: ${course.removal.reason}`}</Note> : null}

            <Card>
              <Facts>
                <Fact label="Institute" value={course.business.name} />
                <Fact label="Where" value={course.venue ? [course.venue.name, course.venue.address, course.venue.city].join(', ') : 'Online'} />
                <Fact label="Students" value={String(course.counts.students)} />
                <Fact label="Demo classes" value={course.demo ? `${course.counts.demos} booked · ${feeText(course.demo.fee)}` : 'Not offered'} />
                <Fact label="Fees taken" value={money(course.money.sales)} />
                <Fact label="Commission" value={`${course.money.commissionBps / 100}%`} />
                <Fact label="Certificate at" value={`${course.certificatePercent}% attendance`} />
                {course.status === 'draft' && course.missing.length ? <Fact label="Missing to publish" value={course.missing.join(', ')} warn /> : null}
                <Fact label="Published" value={course.publishedAt ? shortDate(course.publishedAt) : 'Not yet'} />
                <Fact label="Created" value={shortDate(course.createdAt)} />
                <Fact label="Course id" value={course.id} />
              </Facts>
            </Card>

            {course.batches.map((b) => (
              <Card key={b.id}>
                <View style={styles.head}>
                  <View style={styles.flex}>
                    <Text style={styles.batch}>{b.name}</Text>
                    <Text style={consoleStyles.muted}>{b.schedule}</Text>
                  </View>
                  <Badge {...BATCH_STATUS[b.status]} />
                </View>
                <Text style={consoleStyles.muted}>
                  {`${shortDate(b.firstAt)} to ${shortDate(b.lastEndsAt)} · ${b.classes} classes · ${feeText(b.fee)} · ${b.enrolled} of ${b.capacity} seats · ${money(b.sales)} taken`}
                </Text>
                {b.onlineLink ? (
                  <Text style={consoleStyles.muted} selectable>
                    {b.onlineLink}
                  </Text>
                ) : null}
                {b.cancelReason ? <Text style={consoleStyles.muted}>{`Cancelled: ${b.cancelReason}`}</Text> : null}
              </Card>
            ))}

            {course.description ? (
              <Card>
                <Text style={consoleStyles.muted}>About</Text>
                <Text style={consoleStyles.body} selectable>
                  {course.description}
                </Text>
              </Card>
            ) : null}

            <TakeDown
              course={course}
              onDone={(next, message) => {
                setData(next);
                setDone(message);
              }}
            />

            <View style={styles.links}>
              <TextLink label="Open the institute’s business" onPress={() => router.push({ pathname: '/(admin)/business/[id]', params: { id: course.business.id } })} />
              {canAudit ? <TextLink label="History for this course" onPress={() => router.push({ pathname: '/(admin)/audit', params: { target: course.id } })} /> : null}
            </View>
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.lg, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  name: { ...Typography.title, color: Brand.text },
  batch: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  actions: { gap: Spacing.two, marginTop: Spacing.two },
  links: { gap: Spacing.three, alignItems: 'flex-start', marginTop: Spacing.two },
});
