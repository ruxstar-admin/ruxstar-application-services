import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FieldFrame } from '@/components/ui/FieldFrame';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: React.ReactNode;
  /** Sits inside the box on its right edge, for a small action or status such as "Verify". */
  accessory?: React.ReactNode;
  /** Shows "used/maxLength" at the right of the helper line. */
  showCount?: boolean;
}

/** Labelled text field. `secureTextEntry` automatically gets a show/hide toggle; `multiline` grows from 96px. */
export const InputField = forwardRef<TextInput, InputFieldProps>(
  ({ label, error, hint, accessory, showCount, style, secureTextEntry, onFocus, onBlur, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const count = showCount && rest.maxLength ? `${(rest.value ?? '').length}/${rest.maxLength}` : undefined;

    return (
      <FieldFrame label={label} error={error} hint={hint} count={count}>
        <View style={[styles.box, rest.multiline && styles.boxMultiline, focused && styles.boxFocused, !!error && styles.boxError]}>
          <TextInput
            ref={ref}
            style={[styles.input, rest.multiline && styles.inputMultiline, style]}
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
          {accessory}
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
  boxMultiline: { height: undefined, minHeight: 96, alignItems: 'flex-start', paddingVertical: Spacing.three },
  boxFocused: { borderColor: Brand.textMuted },
  boxError: { borderColor: Brand.error },
  input: { flex: 1, ...Typography.body, color: Brand.text, paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' },
  inputMultiline: { alignSelf: 'stretch', minHeight: 64, lineHeight: 22, textAlignVertical: 'top' },
});
