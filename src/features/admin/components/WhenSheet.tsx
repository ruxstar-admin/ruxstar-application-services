import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { istDayKey } from '@/lib/booking/days';
import { dateKey } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { WHEN_PRESETS, dayLabel, shiftDay, whenLabel, type When } from '../lib/filters';

/** The system calendar works on the phone's own dates; a picked day is taken as that day in India. */
const toDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};

const Check = () => <Ionicons name="checkmark" size={20} color={Brand.primarySoft} />;

function DayBox({ label, value, active, onPress }: { label: string; value: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      accessibilityHint="Opens a calendar"
      onPress={onPress}
      style={({ pressed }) => [styles.box, active && styles.boxActive, pressed && styles.pressed]}
    >
      <View style={styles.flex}>
        <Text style={styles.boxLabel}>{label}</Text>
        <Text style={styles.boxValue}>{value}</Text>
      </View>
      <Ionicons name="calendar-outline" size={18} color={Brand.textMuted} />
    </Pressable>
  );
}

/** Two days from the system calendar: the Android dialog, or an inline calendar on iOS. Nothing after today. */
function RangePicker({ start, now, onApply, onBack }: { start: { from: string; to: string } | null; now: number; onApply: (from: string, to: string) => void; onBack: () => void }) {
  const today = istDayKey(now);
  const [from, setFrom] = useState(start?.from ?? shiftDay(today, -6));
  const [to, setTo] = useState(start?.to ?? today);
  const [editing, setEditing] = useState<'from' | 'to' | null>(null);

  const limits = (which: 'from' | 'to') => (which === 'from' ? { maximumDate: toDate(to) } : { minimumDate: toDate(from), maximumDate: toDate(today) });
  const set = (which: 'from' | 'to', date: Date) => (which === 'from' ? setFrom(dateKey(date)) : setTo(dateKey(date)));

  const open = (which: 'from' | 'to') => {
    Feedback.select();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: toDate(which === 'from' ? from : to), mode: 'date', ...limits(which), onValueChange: (_event, date) => set(which, date) });
    } else {
      setEditing(editing === which ? null : which);
    }
  };

  return (
    <>
      <View style={styles.boxes}>
        <DayBox label="From" value={dayLabel(from, now)} active={editing === 'from'} onPress={() => open('from')} />
        <DayBox label="To" value={dayLabel(to, now)} active={editing === 'to'} onPress={() => open('to')} />
      </View>
      {editing ? (
        <DateTimePicker
          key={editing}
          value={toDate(editing === 'from' ? from : to)}
          mode="date"
          display="inline"
          themeVariant="dark"
          accentColor={Brand.primary}
          {...limits(editing)}
          onValueChange={(_event, date) => set(editing, date)}
        />
      ) : null}
      <Text style={styles.muted}>Both days are included, in India time.</Text>
      <PrimaryButton label="Show these days" onPress={() => onApply(from, to)} />
      <PrimaryButton label="Back" variant="outline" onPress={onBack} />
    </>
  );
}

/** Picks a time filter: a preset, or "Pick dates" for a from and to day. */
export function WhenSheet({ visible, value, onPick, onClose }: { visible: boolean; value: When; onPick: (when: When) => void; onClose: () => void }) {
  const [now] = useState(Date.now);
  const [picking, setPicking] = useState(false);
  const close = () => {
    setPicking(false);
    onClose();
  };
  const pick = (when: When) => {
    onPick(when);
    close();
  };

  return (
    <BottomSheet visible={visible} onClose={close} title={picking ? 'Pick dates' : 'When'}>
      {picking ? (
        <RangePicker start={value.kind === 'range' ? value : null} now={now} onApply={(from, to) => pick({ kind: 'range', from, to })} onBack={() => setPicking(false)} />
      ) : (
        <View>
          {WHEN_PRESETS.map((p) => (
            <ListRow key={p.key} title={p.label} right={p.key === value.kind ? <Check /> : <View />} onPress={() => pick({ kind: p.key })} />
          ))}
          {Platform.OS === 'web' ? null : (
            <ListRow
              title="Pick dates"
              subtitle={value.kind === 'range' ? whenLabel(value, now) : 'A from and to day'}
              right={value.kind === 'range' ? <Check /> : undefined}
              onPress={() => setPicking(true)}
            />
          )}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  boxes: { flexDirection: 'row', gap: Spacing.two },
  box: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.bg,
  },
  boxActive: { borderColor: Brand.textMuted },
  boxLabel: { ...Typography.caption, color: Brand.textMuted },
  boxValue: { ...Typography.bodyStrong, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted },
  pressed: { opacity: 0.7 },
});
