import { forwardRef } from 'react';
import { StyleSheet, Text, View, type TextInput } from 'react-native';
import { InputField } from '@/components/ui/InputField';
import { Brand, Spacing, Typography } from '@/constants/theme';
import type { UsernameStatus } from '@/features/auth/hooks/use-username-check';
import { Feedback } from '@/lib/haptics';
import { normalizeUsername, usernameError } from '@/features/auth/lib/validators';
import { Chip } from '@/components/ui/Chip';

interface UsernameFieldProps {
  value: string;
  onChange: (value: string) => void;
  check: { status: UsernameStatus; suggestions: string[] };
  /** Server-side error, for example taken between the check and signup. */
  error?: string;
  /** The keyboard's next key; the field stays focused until the handler moves on. */
  onSubmitEditing?: () => void;
  /** Tells the screen when the box is entered and left, so ideas are fetched only once it is. */
  onFocusChange?: (focused: boolean) => void;
}

const HINTS: Partial<Record<UsernameStatus, { text: string; color: string }>> = {
  checking: { text: 'Checking availability…', color: Brand.textMuted },
  available: { text: 'Available', color: Brand.success },
  error: { text: 'Could not check right now. Edit the name to try again.', color: Brand.error },
};

/** Username input with live availability, and one-tap ideas while empty or when the name is taken. */
export const UsernameField = forwardRef<TextInput, UsernameFieldProps>(({ value, onChange, check, error, onSubmitEditing, onFocusChange }, ref) => {
  const format = usernameError(value);
  const taken = check.status === 'taken';
  const hint = error ? undefined : HINTS[check.status];
  const showIdeas = check.suggestions.length > 0 && (taken || value.length === 0);

  return (
    <View style={styles.wrap}>
      <InputField
        ref={ref}
        label="Username"
        value={value}
        onChangeText={(text) => onChange(normalizeUsername(text))}
        placeholder="e.g. priya.nair"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        returnKeyType={onSubmitEditing ? 'next' : 'default'}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
        error={format ?? error ?? (taken ? 'That username is taken.' : undefined)}
      />
      {hint && !format ? <Text style={[styles.hint, { color: hint.color }]}>{hint.text}</Text> : null}
      {showIdeas ? (
        <View style={styles.suggestions}>
          {check.suggestions.map((suggestion) => (
            <Chip
              key={suggestion}
              label={suggestion}
              onPress={() => {
                Feedback.select();
                onChange(suggestion);
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
});
UsernameField.displayName = 'UsernameField';

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  hint: { ...Typography.caption },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
