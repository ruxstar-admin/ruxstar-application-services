import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { dayLabel } from '@/features/events/lib/events';
import { errorText } from '@/features/events/lib/messages';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { toUploadJpeg } from '@/features/profile/lib/profile-photo';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { VendorCoachingService } from '@/services/coaching-service';
import type { VendorBatch, VendorCourse } from '@/types/coaching';
import { Notice, Section } from '../components/Parts';
import { BATCH_STATUS, CATEGORY_LABEL, COURSE_STATUS, MODE_LABEL, feeText } from '../lib/coaching';

/** Course photos are 16:9 on the card; the API keeps them within 1440 px. */
const PHOTO_SIDE = 1440;
const PHOTO_ASPECT = 16 / 9;

type Icon = keyof typeof Ionicons.glyphMap;

function Row({ icon, title, subtitle, onPress }: { icon: Icon; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={22} color={Brand.primarySoft} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.small}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />
    </Pressable>
  );
}

function BatchCard({ batch, onEdit, onClasses }: { batch: VendorBatch; onEdit: () => void; onClasses: () => void }) {
  const status = BATCH_STATUS[batch.status];
  const done = batch.status === 'cancelled' || batch.status === 'ended';
  return (
    <View style={styles.batch}>
      <View style={styles.batchHead}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{batch.name}</Text>
          <Text style={styles.small}>{batch.schedule}</Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>
      <Text style={styles.small}>{`From ${dayLabel(batch.startDate)} · ${batch.classes} classes · ${feeText(batch.fee)}`}</Text>
      <Text style={styles.small}>
        {`${batch.enrolled} of ${batch.capacity} seats taken${batch.held ? `, ${batch.held} paying now` : ''}${batch.minStudents ? ` · runs with ${batch.minStudents} or more` : ''}`}
      </Text>
      {batch.coaches.length ? <Text style={styles.small}>{`Coach: ${batch.coaches.map((c) => c.name).join(', ')}`}</Text> : null}
      {batch.cancelReason ? <Text style={styles.small}>{`Cancelled: ${batch.cancelReason}`}</Text> : null}
      <View style={styles.batchLinks}>
        {done ? null : <TextLink label="Edit batch" onPress={onEdit} />}
        <TextLink label="Classes and materials" onPress={onClasses} />
      </View>
    </View>
  );
}

function Dashboard({ course, setCourse, reload, fresh }: { course: VendorCourse; setCourse: (c: VendorCourse) => void; reload: () => void; fresh: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const status = COURSE_STATUS[course.status];
  const draft = course.status === 'draft';
  const open = course.status === 'draft' || course.status === 'live';
  const editBatch = (batchId?: string) => router.push({ pathname: '/(vendor)/courses/[id]/batch', params: batchId ? { id: course.id, batchId } : { id: course.id } });

  const run = async (name: string, action: () => Promise<VendorCourse>) => {
    setBusy(name);
    setFailure(null);
    try {
      setCourse(await action());
      Feedback.success();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
      reload();
    } finally {
      setBusy(null);
    }
  };

  const photo = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 1 });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return;
    void run('photo', async () => VendorCoachingService.setPhoto(token, course.id, await toUploadJpeg(asset, PHOTO_SIDE, PHOTO_ASPECT)));
  };

  const remove = async () => {
    setBusy('delete');
    try {
      await VendorCoachingService.remove(token, course.id);
      Feedback.success();
      setDeleting(false);
      router.back();
    } catch (err) {
      Feedback.error();
      setDeleting(false);
      setFailure(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const footer = draft ? (
    <PrimaryButton
      label="Publish course"
      loading={busy === 'publish'}
      disabled={course.missing.length > 0}
      onPress={() => run('publish', () => VendorCoachingService.publish(token, course.id, { idempotencyKey: newIdempotencyKey() }))}
    />
  ) : open ? (
    <PrimaryButton label="Add a batch" variant="outline" onPress={() => editBatch()} />
  ) : null;

  return (
    <ScreenContainer title="Course" footer={footer}>
      {fresh && draft ? <Notice tone="success" text="Saved as a draft. Add a photo and a batch with its timetable, then publish." /> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={course.photo ? 'Change the photo' : 'Add a photo'}
        disabled={!open || busy === 'photo'}
        onPress={photo}
        style={({ pressed }) => [styles.photo, pressed && styles.pressed]}
      >
        <ShopCover photo={course.photo ? { ...course.photo, smaller: [] } : null} name={course.title} width={400} style={styles.photoImage}>
          {open ? (
            <View style={styles.photoButton}>
              {busy === 'photo' ? <ActivityIndicator color={Brand.text} size="small" /> : <Ionicons name="image-outline" size={16} color={Brand.text} />}
              <Text style={styles.photoText}>{course.photo ? 'Change photo' : 'Add a photo'}</Text>
            </View>
          ) : null}
        </ShopCover>
      </Pressable>

      <View style={styles.head}>
        <View style={styles.rowText}>
          <Text style={styles.title}>{course.title}</Text>
          <Text style={styles.small}>{`${CATEGORY_LABEL[course.category]} · ${MODE_LABEL[course.mode]}`}</Text>
          {course.venue ? <Text style={styles.small}>{[course.venue.name, course.venue.city].join(', ')}</Text> : null}
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>

      {course.removal ? <Notice tone="error" text={`Ruxstar took this course down: ${course.removal.reason} Its batches were cancelled and students whose first class hadn’t happened were refunded.`} /> : null}

      {draft && course.missing.length ? (
        <View style={styles.note}>
          <Ionicons name="list-outline" size={20} color={Brand.warning} />
          <View style={styles.missing}>
            <Text style={styles.noteStrong}>Before you can publish</Text>
            {course.missing.map((m) => (
              <Text key={m} style={styles.noteText}>{`• ${m}`}</Text>
            ))}
          </View>
        </View>
      ) : null}

      {draft ? null : (
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{course.counts.students}</Text>
            <Text style={styles.small}>Students</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{course.counts.demos}</Text>
            <Text style={styles.small}>Demo classes</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{money(course.money.share)}</Text>
            <Text style={styles.small}>Your share</Text>
          </View>
        </View>
      )}

      <Section title="Batches" />
      {course.batches.length ? (
        course.batches.map((b) => (
          <BatchCard key={b.id} batch={b} onEdit={() => editBatch(b.id)} onClasses={() => router.push({ pathname: '/(customer)/teach/batch/[id]', params: { id: b.id } })} />
        ))
      ) : (
        <Text style={styles.small}>A batch is a group with its own fee, seats and weekly timetable. Add at least one.</Text>
      )}
      {draft ? <TextLink label="Add a batch" onPress={() => editBatch()} /> : null}

      <View style={styles.rows}>
        {draft ? null : (
          <Row
            icon="people-outline"
            title="Students"
            subtitle="Who enrolled, for whom, and their attendance"
            onPress={() => router.push({ pathname: '/(vendor)/courses/[id]/students', params: { id: course.id } })}
          />
        )}
        {draft || !course.demo ? null : (
          <Row
            icon="sparkles-outline"
            title="Demo requests"
            subtitle="Who booked a demo class and when"
            onPress={() => router.push({ pathname: '/(vendor)/courses/[id]/students', params: { id: course.id, kind: 'demo' } })}
          />
        )}
        {draft ? null : <Row icon="today-outline" title="Today’s classes" subtitle="Take attendance, move or cancel a class" onPress={() => router.push('/(customer)/teach')} />}
        {open ? (
          <Row
            icon="create-outline"
            title="Edit details"
            subtitle="Name, subject, place, demo class and certificate"
            onPress={() => router.push({ pathname: '/(vendor)/courses/[id]/edit', params: { id: course.id } })}
          />
        ) : null}
        <Row
          icon="person-add-outline"
          title="Coaches"
          subtitle="Invite coaches to your team and choose what they can do"
          onPress={() => router.push({ pathname: '/(vendor)/businesses/[id]/team', params: { id: course.business.id } })}
        />
      </View>

      {failure ? <ErrorBanner message={failure} /> : null}

      {draft ? <TextLink muted label="Delete this draft" onPress={() => setDeleting(true)} /> : null}

      <ConfirmSheet
        visible={deleting}
        title="Delete this draft?"
        message={`${course.title} and its batches will be deleted. This can’t be undone.`}
        confirmLabel="Delete"
        loading={busy === 'delete'}
        onConfirm={remove}
        onCancel={() => setDeleting(false)}
      />
    </ScreenContainer>
  );
}

/** An institute's course: photo, publishing, batches, students, demo requests and its coaches. */
export function ManageCourseScreen() {
  const token = useAuthToken();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { data, loading, error, reload, setData } = useAsyncResource(() => VendorCoachingService.get(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));
  return data ? (
    <Dashboard course={data} setCourse={setData} reload={reload} fresh={fresh === '1'} />
  ) : (
    <ScreenContainer title="Course">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={5}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  photo: { borderRadius: Radius.lg, overflow: 'hidden' },
  photoImage: { width: '100%', aspectRatio: 16 / 9 },
  photoButton: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(13,12,18,0.78)',
  },
  photoText: { ...Typography.caption, fontSize: 13, color: Brand.text },
  head: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  title: { ...Typography.title, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  note: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  noteText: { ...Typography.caption, fontSize: 14, color: Brand.text, flex: 1 },
  noteStrong: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  missing: { flex: 1, gap: 2 },
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, gap: 2, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  statValue: { ...Typography.bodyStrong, fontSize: 18, color: Brand.text },
  batch: { gap: 4, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  batchHead: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  batchLinks: { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.one },
  rows: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  rowIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,92,242,0.14)' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
});
