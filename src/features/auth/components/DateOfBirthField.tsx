import { forwardRef, useImperativeHandle, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { FieldFrame } from '@/components/ui/FieldFrame';
import { InputField } from '@/components/ui/InputField';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
import { dateFromIso, dobError, dobToIso, formatDob, formatDobInput, isoFromDate, latestDob } from '@/features/auth/lib/validators';

export interface DateOfBirthFieldHandle {
  /** Opens the calendar, for example from the previous field's next key. */
  open: () => void;
}

interface DateOfBirthFieldProps {
  /** `YYYY-MM-DD`, or null while none is chosen. */
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  hint?: string;
}

const EARLIEST = new Date(1900, 0, 1);
/** Where the calendar opens before anything is chosen. */
const OPENING_AGE = 18;

/**
 * Date of birth picked from the system calendar: the Android dialog opens on its year list, iOS shows a
 * wheel under the field. The latest selectable day is the 13th birthday. Web has no calendar here, so
 * it falls back to typing DD/MM/YYYY.
 */
export const DateOfBirthField = forwardRef<DateOfBirthFieldHandle, DateOfBirthFieldProps>((props, ref) => {
  const { value, onChange, error, hint } = props;
  const [iosOpen, setIosOpen] = useState(false);
  const latest = latestDob();
  const shown = value ? dateFromIso(value) : opening(latest);

  const open = () => {
    Feedback.select();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: shown,
        mode: 'date',
        minimumDate: EARLIEST,
        maximumDate: latest,
        startOnYearSelection: !value,
        onValueChange: (_event, date) => onChange(isoFromDate(date)),
      });
    } else {
      setIosOpen(true);
    }
  };

  useImperativeHandle(ref, () => ({ open }));

  if (Platform.OS === 'web') return <TypedDob {...props} />;

  return (
    <FieldFrame label="Date of birth" error={error} hint={hint}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Date of birth, ${value ? formatDob(value) : 'not chosen'}`}
        accessibilityHint="Opens a calendar"
        onPress={open}
        style={({ pressed }) => [styles.box, (pressed || iosOpen) && styles.boxFocused, !!error && styles.boxError]}
      >
        <Text style={[styles.value, !value && styles.placeholder]} maxFontSizeMultiplier={1.2}>
          {value ? formatDob(value) : 'Choose your date of birth'}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={Brand.textMuted} />
      </Pressable>
      {iosOpen ? (
        <View style={styles.wheel}>
          <DateTimePicker
            value={shown}
            mode="date"
            display="spinner"
            themeVariant="dark"
            textColor={Brand.text}
            minimumDate={EARLIEST}
            maximumDate={latest}
            onValueChange={(_event, date) => onChange(isoFromDate(date))}
          />
          <View style={styles.done}>
            <TextLink
              label="Done"
              onPress={() => {
                if (!value) onChange(isoFromDate(shown));
                setIosOpen(false);
              }}
            />
          </View>
        </View>
      ) : null}
    </FieldFrame>
  );
});
DateOfBirthField.displayName = 'DateOfBirthField';

function opening(latest: Date) {
  const guess = new Date(new Date().getFullYear() - OPENING_AGE, 0, 1);
  return guess < latest ? guess : latest;
}

function TypedDob({ value, onChange, error, hint }: DateOfBirthFieldProps) {
  const [text, setText] = useState(value ? value.split('-').reverse().join('/') : '');
  return (
    <InputField
      label="Date of birth"
      value={text}
      onChangeText={(input) => {
        const next = formatDobInput(input);
        setText(next);
        onChange(dobToIso(next));
      }}
      placeholder="DD/MM/YYYY"
      keyboardType="number-pad"
      maxLength={10}
      hint={hint}
      error={error ?? dobError(text) ?? undefined}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.bg,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  boxFocused: { borderColor: Brand.textMuted },
  boxError: { borderColor: Brand.error },
  value: { ...Typography.body, color: Brand.text, flex: 1 },
  placeholder: { color: Brand.textFaint },
  wheel: { marginTop: Spacing.two },
  done: { alignItems: 'flex-end' },
});
