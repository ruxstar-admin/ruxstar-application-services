import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { errorText } from '@/features/events/lib/messages';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { keepIdempotencyKey, newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { CoachingService, VendorCoachingService } from '@/services/coaching-service';
import type { CoachingRules, CourseCategory, CourseMode, VendorCourse } from '@/types/coaching';
import { CATEGORIES, CATEGORY_LABEL, MODE_LABEL } from '../lib/coaching';
import { courseDraftOf, courseErrors, emptyCourse, toCourseInput, type CourseDraft } from '../lib/forms';

const CATEGORY_CHIPS = CATEGORIES.map((c) => ({ key: c, label: CATEGORY_LABEL[c] }));
const MODE_CHIPS: { key: CourseMode; label: string }[] = [
  { key: 'offline', label: MODE_LABEL.offline },
  { key: 'online', label: MODE_LABEL.online },
];

function Form({ rules, course, businessId }: { rules: CoachingRules; course?: VendorCourse; businessId?: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const [draft, setDraft] = useState<CourseDraft>(() => (course ? courseDraftOf(course) : emptyCourse(rules)));
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(newIdempotencyKey());
  const errors = courseErrors(draft, rules);
  const err = (field: string) => (shown ? errors[field] : undefined);
  const modeFixed = !!course?.batches.length;
  const set = <K extends keyof CourseDraft>(key: K, value: CourseDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    setShown(true);
    if (Object.keys(errors).length) {
      Feedback.error();
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const body = toCourseInput(draft);
      if (course) {
        await VendorCoachingService.update(token, course.id, modeFixed ? { ...body, mode: course.mode } : body);
        Feedback.success();
        router.back();
      } else {
        const created = await VendorCoachingService.create(token, businessId!, body, { idempotencyKey: attempt.current });
        Feedback.success();
        router.replace({ pathname: '/(vendor)/courses/[id]', params: { id: created.id, fresh: '1' } });
      }
    } catch (e) {
      Feedback.error();
      setFailure(errorText(e));
      if (!keepIdempotencyKey(e)) attempt.current = newIdempotencyKey();
    } finally {
      setBusy(false);
    }
  };

  const footer = <PrimaryButton label={course ? 'Save changes' : 'Save as draft'} loading={busy} onPress={save} />;

  return (
    <ScreenContainer title={course ? 'Edit course' : 'New course'} footer={footer}>
      <InputField label="Course name" value={draft.title} onChangeText={(v) => set('title', v)} maxLength={80} placeholder="Like “Class 10 Maths” or “Guitar for beginners”" error={err('title')} />
      <Text style={styles.label}>Subject</Text>
      <View style={styles.bleed}>
        <ChoiceChips options={CATEGORY_CHIPS} value={draft.category} onChange={(v: CourseCategory) => set('category', v)} />
      </View>
      <InputField
        label="About the course (optional)"
        value={draft.description}
        onChangeText={(v) => set('description', v)}
        multiline
        maxLength={2000}
        showCount
        placeholder="What students learn, who it’s for, what to bring"
        error={err('description')}
      />

      <Text style={styles.label}>Where classes happen</Text>
      <View style={styles.bleed}>
        <ChoiceChips options={MODE_CHIPS} value={draft.mode} onChange={(v: CourseMode) => !modeFixed && set('mode', v)} />
      </View>
      {modeFixed ? <Text style={styles.hint}>The course has batches, so it stays {MODE_LABEL[draft.mode].toLowerCase()}.</Text> : null}
      {draft.mode === 'offline' ? (
        <>
          <InputField label="Centre name" value={draft.venueName} onChangeText={(v) => set('venueName', v)} maxLength={80} placeholder="Like “Bright Minds, Madhapur”" error={err('venueName')} />
          <InputField label="Address" value={draft.address} onChangeText={(v) => set('address', v)} maxLength={200} placeholder="Building, street, area" error={err('address')} />
          <InputField label="City" value={draft.city} onChangeText={(v) => set('city', v)} maxLength={60} autoCapitalize="words" error={err('city')} />
        </>
      ) : (
        <Text style={styles.hint}>Add the meeting link to each batch. Students only see it a few minutes before each class.</Text>
      )}

      <ToggleRow
        title="Offer a demo class"
        subtitle="Parents can try one class of a batch before they enrol"
        icon="sparkles-outline"
        value={draft.demo}
        onValueChange={(v) => set('demo', v)}
      />
      {draft.demo ? (
        <View style={styles.pair}>
          <View style={styles.half}>
            <InputField label="Demo fee (₹)" value={draft.demoFee} onChangeText={(v) => set('demoFee', v)} keyboardType="decimal-pad" hint="0 for free" error={err('demoFee')} />
          </View>
          <View style={styles.half}>
            <InputField label="Seats per class" value={draft.demoSeats} onChangeText={(v) => set('demoSeats', v)} keyboardType="number-pad" maxLength={2} error={err('demoSeats')} />
          </View>
        </View>
      ) : null}

      <InputField
        label="Attendance for a certificate (%)"
        value={draft.certificatePercent}
        onChangeText={(v) => set('certificatePercent', v)}
        keyboardType="number-pad"
        maxLength={3}
        hint={`Students who attend this share of classes get a certificate after the last one. Ruxstar’s usual is ${rules.certificatePercent}%.`}
        error={err('certificatePercent')}
      />
      <Text style={styles.hint}>
        {`Ruxstar keeps ${rules.commissionBps / 100}% of each fee.${rules.platformFee ? ` Parents also pay a ${money(rules.platformFee)} platform fee.` : ''} You get your share after each batch’s first class.`}
      </Text>
      {course ? null : <Text style={styles.hint}>It’s saved as a draft. Add a photo and a batch, then publish it from the next screen.</Text>}
      {failure ? <ErrorBanner message={failure} /> : null}
    </ScreenContainer>
  );
}

/** Making a course for `businessId`, or changing `courseId`. A new course is saved as a draft. */
export function CourseFormScreen({ businessId, courseId: id }: { businessId?: string; courseId?: string }) {
  const token = useAuthToken();
  const rules = useAsyncResource(() => CoachingService.rules(token), 'rules');
  const course = useAsyncResource(() => (id ? VendorCoachingService.get(token, id) : Promise.resolve(null)), id ?? 'new');
  const ready = rules.data && (!id || course.data);
  return ready ? (
    <Form rules={rules.data!} course={course.data ?? undefined} businessId={businessId} />
  ) : (
    <ScreenContainer title={id ? 'Edit course' : 'New course'}>
      <AsyncBoundary
        loading={rules.loading || course.loading}
        error={rules.error ?? course.error}
        hasData={false}
        onRetry={() => {
          rules.reload();
          course.reload();
        }}
        skeletonRows={4}
      >
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -Spacing.three },
  label: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  hint: { ...Typography.caption, color: Brand.textMuted },
  pair: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
});
