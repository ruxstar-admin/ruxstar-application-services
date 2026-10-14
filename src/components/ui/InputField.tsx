import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  leftAdornment?: React.ReactNode;
}

export const InputField = forwardRef<TextInput, InputFieldProps>(
  ({ label, error, leftAdornment, style, ...rest }, ref) => (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.container, error && styles.containerError]}>
        {leftAdornment}
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={Brand.textFaint}
          {...rest}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  ),
);
InputField.displayName = 'InputField';

const styles = StyleSheet.create({
  label: {
    ...Typography.caption,
    color: Brand.textMuted,
    marginBottom: Spacing.two,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.bg,
    paddingHorizontal: Spacing.three,
  },
  containerError: {
    borderColor: Brand.error,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Brand.text,
    height: '100%',
  },
  error: {
    ...Typography.caption,
    color: Brand.error,
    marginTop: Spacing.one,
  },
});
