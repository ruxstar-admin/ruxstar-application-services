import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { InputField } from '@/components/ui/InputField';

interface PhoneInputProps {
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
}

/** Backend normalizes to the last 10 digits regardless of prefix — India-only for now. */
export const PhoneInput = forwardRef<TextInput, PhoneInputProps>(({ value, onChangeText, error }, ref) => (
  <InputField
    ref={ref}
    label="Mobile number"
    value={value}
    onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, 10))}
    keyboardType="number-pad"
    maxLength={10}
    placeholder="10-digit mobile number"
    error={error}
    leftAdornment={
      <View style={styles.prefix}>
        <Text style={styles.prefixText}>+91</Text>
      </View>
    }
  />
));
PhoneInput.displayName = 'PhoneInput';

const styles = StyleSheet.create({
  prefix: {
    paddingRight: Spacing.three,
    marginRight: Spacing.three,
    borderRightWidth: 1,
    borderRightColor: Brand.border,
  },
  prefixText: {
    ...Typography.body,
    color: Brand.text,
  },
});
