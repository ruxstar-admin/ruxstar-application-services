import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { DayPicker, TimePicker } from '@/components/ui/DayTimePicker';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { digitsOnly } from '@/features/kyc/lib/validators';
import { useAuthToken } from '@/hooks/use-auth-token';
import { combineDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { EventsService } from '@/services/events-service';

const MAX_CAPACITY = 5000;

export function CreateEventScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [area, setArea] = useState('');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [day, setDay] = useState<string>();
  const [time, setTime] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const seats = Number(capacity);
  const valid = title.trim() && venue.trim() && area.trim() && day && time && seats >= 1;

  const save = async () => {
    if (!day || !time) return;
    setSaving(true);
    setFailed(false);
    try {
      await EventsService.create(token, {
        title: title.trim(),
        description: description.trim(),
        venue: venue.trim(),
        area: area.trim(),
        price: Number(price) || 0,
        capacity: seats,
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
    <ScreenContainer title="Create event" footer={<PrimaryButton label="Publish event" onPress={save} disabled={!valid} loading={saving} />}>
      <InputField label="Title" value={title} onChangeText={setTitle} maxLength={80} placeholder="e.g. Open mic night" />
      <InputField label="About" value={description} onChangeText={setDescription} multiline maxLength={400} style={styles.about} />
      <InputField label="Venue" value={venue} onChangeText={setVenue} placeholder="Where is it?" />
      <InputField label="Area" value={area} onChangeText={setArea} placeholder="e.g. Banjara Hills" />
      <InputField label="Ticket price (₹)" value={price} onChangeText={(v) => setPrice(digitsOnly(v, 6))} keyboardType="number-pad" placeholder="0 for a free event" />
      <InputField label="Seats" value={capacity} onChangeText={(v) => {
          const seatsTyped = Math.min(MAX_CAPACITY, Number(digitsOnly(v, 4)));
          setCapacity(seatsTyped > 0 ? String(seatsTyped) : '');
        }} keyboardType="number-pad" placeholder="How many can attend" />

      <Text style={styles.label}>Date</Text>
      <DayPicker value={day} onChange={setDay} />
      <Text style={styles.label}>Starts at</Text>
      <TimePicker value={time} onChange={setTime} />

      {failed ? <ErrorBanner message="Could not publish the event. Check the date is in the future and try again." onRetry={save} /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  about: { height: 96, paddingTop: Spacing.three, textAlignVertical: 'top' },
  label: { ...Typography.caption, color: Brand.textMuted, marginTop: Spacing.three },
});
