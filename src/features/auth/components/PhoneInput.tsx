import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FieldFrame } from '@/components/ui/FieldFrame';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { mobileError } from '@/features/auth/lib/validators';

interface PhoneInputProps {
  value: string;
  onChangeText: (value: string) => void;
  /** Server/submit error; takes priority over inline format validation. */
  error?: string;
  label?: string;
}

/**
 * Backend normalizes to the last 10 digits regardless of prefix — India-only, so the country chip is static.
 * Format problems show only after the field has been left (blur) so typing never flashes errors.
 */
export const PhoneInput = forwardRef<TextInput, PhoneInputProps>(({ value, onChangeText, error, label }, ref) => {
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const shownError = error ?? (touched ? (mobileError(value) ?? undefined) : undefined);

  return (
    <FieldFrame label={label} error={shownError}>
      <View style={styles.row}>
        <View style={[styles.box, styles.country]}>
          <Text style={styles.flag}>{'\u{1F1EE}\u{1F1F3}'}</Text>
          <Text style={styles.code} maxFontSizeMultiplier={1.2}>
            +91
          </Text>
          <Ionicons name="chevron-down" size={16} color={Brand.textMuted} />
        </View>
        <View style={[styles.box, styles.field, focused && styles.boxFocused, !!shownError && styles.boxError]}>
          <TextInput
            ref={ref}
            style={styles.input}
            value={value}
            onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, 10))}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              setTouched(true);
            }}
            keyboardType="number-pad"
            maxLength={10}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            placeholder="Mobile number"
            placeholderTextColor={Brand.textFaint}
            textContentType="telephoneNumber"
            autoComplete="tel"
            accessibilityLabel="Mobile number"
          />
        </View>
      </View>
    </FieldFrame>
  );
});
PhoneInput.displayName = 'PhoneInput';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.three },
  box: {
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.bg,
    justifyContent: 'center',
  },
  boxFocused: { borderColor: Brand.textMuted },
  boxError: { borderColor: Brand.error },
  country: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  flag: { fontSize: 20 },
  code: { ...Typography.body, color: Brand.text },
  field: { flex: 1, paddingHorizontal: Spacing.three },
  input: { ...Typography.body, color: Brand.text, flex: 1, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' },
});
