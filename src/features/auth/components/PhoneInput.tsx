import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';

interface PhoneInputProps {
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
}

/** Backend normalizes to the last 10 digits regardless of prefix — India-only, so the country chip is static. */
export const PhoneInput = forwardRef<TextInput, PhoneInputProps>(({ value, onChangeText, error }, ref) => (
  <View>
    <View style={styles.row}>
      <View style={[styles.box, styles.country]}>
        <Text style={styles.flag}>🇮🇳</Text>
        <Text style={styles.code}>+91</Text>
        <Ionicons name="chevron-down" size={16} color={Brand.textMuted} />
      </View>
      <View style={[styles.box, styles.field, !!error && styles.fieldError]}>
        <TextInput
          ref={ref}
          style={styles.input}
          value={value}
          onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, 10))}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="10-digit mobile number"
          placeholderTextColor={Brand.textFaint}
          accessibilityLabel="Mobile number"
        />
      </View>
    </View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>
));
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
  country: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  flag: { fontSize: 20 },
  code: { ...Typography.bodyStrong, fontFamily: Typography.body.fontFamily, color: Brand.text },
  field: { flex: 1, paddingHorizontal: Spacing.three },
  fieldError: { borderColor: Brand.error },
  input: { ...Typography.body, color: Brand.text, height: '100%' },
  error: { ...Typography.caption, color: Brand.error, marginTop: Spacing.two },
});
