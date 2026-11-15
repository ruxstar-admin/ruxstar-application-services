import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { KeyedSelectField } from '@/components/ui/KeyedSelectField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { dayLabel, istDays } from '@/features/events/lib/events';
import { fromIst, istParts } from '@/lib/dates';
import { LENGTHS, QUARTER_HOURS, lengthLabel } from '../lib/schedule';

/** Days offered for a moved or extra class. */
const DAYS_AHEAD = 120;
const LENGTH_CHIPS = LENGTHS.map((m) => ({ key: String(m), label: lengthLabel(m) }));

export interface ClassTime {
  startsAt: string;
  minutes: number;
  reason: string;
}

/** Picks a day, a start time and a length for a class: moving one, or adding an extra one. */
export function ClassTimeSheet({
  visible,
  title,
  start,
  minutes,
  withReason,
  busy,
  failure,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  /** Where it starts out: the class's current time, or a suggestion. */
  start: string;
  minutes: number;
  withReason?: boolean;
  busy: boolean;
  failure: string | null;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (time: ClassTime) => void;
}) {
  const [openedAt] = useState(Date.now);
  const days = useMemo(() => istDays(DAYS_AHEAD, openedAt), [openedAt]);
  const first = istParts(start);
  const [day, setDay] = useState(first.day);
  const [time, setTime] = useState(first.time);
  const [length, setLength] = useState(String(LENGTHS.includes(minutes as (typeof LENGTHS)[number]) ? minutes : 60));
  const [reason, setReason] = useState('');
  const [shown, setShown] = useState(false);
  const startsAt = fromIst(day, time);
  const problem = Date.parse(startsAt) <= openedAt ? 'Pick a time that hasn’t passed' : null;
  const reasonProblem = withReason && reason.trim() && reason.trim().length < 3 ? 'At least 3 letters, or leave it empty' : null;

  const confirm = () => {
    setShown(true);
    if (problem || reasonProblem) return;
    onConfirm({ startsAt, minutes: Number(length), reason: reason.trim() });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.sheet}>
        <KeyedSelectField label="Day" value={day} options={days} onChange={setDay} fallback={dayLabel} error={shown && problem ? problem : undefined} />
        <KeyedSelectField label="Starts at" value={time} options={QUARTER_HOURS} onChange={setTime} />
        <Text style={styles.label}>How long</Text>
        <View style={styles.bleed}>
          <ChoiceChips options={LENGTH_CHIPS} value={length} onChange={setLength} />
        </View>
        {withReason ? (
          <InputField
            label="Why (optional)"
            value={reason}
            onChangeText={setReason}
            maxLength={300}
            placeholder="Like “Hall booked for exams”"
            error={shown && reasonProblem ? reasonProblem : undefined}
          />
        ) : null}
        <Text style={styles.small}>Every student and parent in the batch is told the new time.</Text>
        {failure ? <ErrorBanner message={failure} /> : null}
        <PrimaryButton label={confirmLabel} loading={busy} onPress={confirm} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: Spacing.three },
  bleed: { marginHorizontal: -Spacing.three },
  label: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
});
