import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Spacing } from '@/constants/theme';
import { errorText } from '@/features/events/lib/messages';
import { useAuthToken } from '@/hooks/use-auth-token';
import { keepIdempotencyKey, newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { CoachingService } from '@/services/coaching-service';
import type { Child } from '@/types/coaching';
import { childErrors } from '../lib/children';

/** Add a child, or change one: their name and, if you like, the year they were born. */
export function ChildForm({ child, onSaved, label }: { child?: Child; onSaved: (child: Child) => void; label?: string }) {
  const token = useAuthToken();
  const [name, setName] = useState(child?.name ?? '');
  const [year, setYear] = useState(child?.birthYear ? String(child.birthYear) : '');
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(newIdempotencyKey());
  const [thisYear] = useState(() => new Date().getFullYear());
  const errors = childErrors(name, year, thisYear);

  const save = async () => {
    setShown(true);
    if (Object.keys(errors).length) {
      Feedback.error();
      return;
    }
    setBusy(true);
    setFailure(null);
    const body = { name: name.trim(), birthYear: year.trim() ? Number(year) : null };
    try {
      const saved = child ? await CoachingService.updateChild(token, child.id, body) : await CoachingService.addChild(token, body, { idempotencyKey: attempt.current });
      Feedback.success();
      attempt.current = newIdempotencyKey();
      onSaved(saved);
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
      if (!keepIdempotencyKey(err)) attempt.current = newIdempotencyKey();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <InputField label="Child’s name" value={name} onChangeText={setName} maxLength={60} autoCapitalize="words" error={shown ? errors.name : undefined} placeholder="As the institute should call them" />
      <InputField
        label="Year of birth (optional)"
        value={year}
        onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
        error={shown ? errors.birthYear : undefined}
        hint="Helps the institute place them in the right batch."
      />
      {failure ? <ErrorBanner message={failure} /> : null}
      <PrimaryButton label={label ?? (child ? 'Save' : 'Add child')} loading={busy} onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
});
