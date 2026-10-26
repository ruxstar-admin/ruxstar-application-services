import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { DayPicker, TimePicker } from '@/components/ui/DayTimePicker';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { COACHING_REFUND_POLICY } from '@/features/coaching/lib/policy';
import { digitsOnly } from '@/features/kyc/lib/validators';
import { useAuthToken } from '@/hooks/use-auth-token';
import { combineDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { CoachingService } from '@/services/coaching-service';

/** Create a course with its first batch. Students pay the full fee up front, under the refund policy shown below. */
export function CreateCourseScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [fee, setFee] = useState('');
  const [sessions, setSessions] = useState('');
  const [seats, setSeats] = useState('');
  const [schedule, setSchedule] = useState('');
  const [day, setDay] = useState<string>();
  const [time, setTime] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const valid = title.trim() && Number(fee) > 0 && Number(sessions) > 0 && Number(seats) > 0 && schedule.trim() && day && time;

  const save = async () => {
    if (!day || !time) return;
    setSaving(true);
    setFailed(false);
    try {
      await CoachingService.create(token, {
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        fee: Number(fee),
        sessions: Number(sessions),
        capacity: Number(seats),
        schedule: schedule.trim(),
        startsAt: combineDateTime(day, time),
      });
      Feedback.success();
      router.back();
    } catch {
      Feedback.error();
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer title="Create course" footer={<PrimaryButton label="Publish course" onPress={save} disabled={!valid} loading={saving} />}>
      <InputField label="Course title" value={title} onChangeText={setTitle} maxLength={80} />
      <InputField label="Category" value={category} onChangeText={setCategory} placeholder="e.g. Arts & crafts" />
      <InputField label="About" value={description} onChangeText={setDescription} multiline maxLength={400} style={styles.about} />
      <InputField label="Batch fee (₹)" value={fee} onChangeText={(v) => setFee(digitsOnly(v, 7))} keyboardType="number-pad" hint="Students pay the whole fee up front." />
      <InputField label="Number of sessions" value={sessions} onChangeText={(v) => setSessions(digitsOnly(v, 3))} keyboardType="number-pad" />
      <InputField label="Seats" value={seats} onChangeText={(v) => setSeats(digitsOnly(v, 4))} keyboardType="number-pad" />
      <InputField label="Schedule" value={schedule} onChangeText={setSchedule} placeholder="e.g. Sat & Sun · 10 am" />

      <Text style={styles.label}>First session</Text>
      <DayPicker value={day} onChange={setDay} days={45} />
      <TimePicker value={time} onChange={setTime} />

      <Text style={styles.policy}>{`Refund policy shown to students: ${COACHING_REFUND_POLICY}`}</Text>
      {failed ? <ErrorBanner message="Could not publish the course. Check the start date is in the future and try again." onRetry={save} /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  about: { height: 96, paddingTop: Spacing.three, textAlignVertical: 'top' },
  label: { ...Typography.caption, color: Brand.textMuted, marginTop: Spacing.three },
  policy: { ...Typography.caption, color: Brand.textFaint, marginTop: Spacing.three },
});
