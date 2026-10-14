import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FieldFrame } from '@/components/ui/FieldFrame';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

/** Labelled text field. `secureTextEntry` automatically gets a show/hide toggle. */
export const InputField = forwardRef<TextInput, InputFieldProps>(
  ({ label, error, hint, style, secureTextEntry, onFocus, onBlur, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);
    const [revealed, setRevealed] = useState(false);

    return (
      <FieldFrame label={label} error={error} hint={hint}>
        <View style={[styles.box, focused && styles.boxFocused, !!error && styles.boxError]}>
          <TextInput
            ref={ref}
            style={[styles.input, style]}
            placeholderTextColor={Brand.textFaint}
            accessibilityLabel={label}
            secureTextEntry={secureTextEntry && !revealed}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...rest}
          />
          {secureTextEntry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
              hitSlop={12}
              onPress={() => {
                Feedback.select();
                setRevealed((v) => !v);
              }}
            >
              <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={22} color={Brand.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </FieldFrame>
    );
  },
);
InputField.displayName = 'InputField';

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
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
  input: { flex: 1, ...Typography.body, color: Brand.text, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' },
});
