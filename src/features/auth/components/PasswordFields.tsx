import { useRef, useState, type RefObject } from 'react';
import { StyleSheet, Text, View, type TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InputField } from '@/components/ui/InputField';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { passwordRules } from '@/features/auth/lib/validators';

interface PasswordFieldsProps {
  password: string;
  confirmation: string;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  /** Server-side error for the password field (e.g. recently used). */
  error?: string;
  /** 10-digit number, so a password containing it is flagged before submit. */
  mobile?: string;
  /** Set once the form was submitted, so rules not yet met and an empty confirmation show as errors. */
  submitted?: boolean;
  /** Let the screen focus either field, for example the first problem after submit. */
  passwordRef?: RefObject<TextInput | null>;
  confirmationRef?: RefObject<TextInput | null>;
  /** Called from the keyboard's done key on the confirmation field. */
  onSubmit?: () => void;
  label?: string;
}

/**
 * New-password + confirm pair, shared by sign-up and password reset. The rules stay visible under the
 * password and tick off as it is typed; one not met turns red once the field was left or the form sent.
 */
export function PasswordFields({
  password,
  confirmation,
  onPasswordChange,
  onConfirmationChange,
  error,
  mobile,
  submitted = false,
  passwordRef: givenPasswordRef,
  confirmationRef: givenConfirmationRef,
  onSubmit,
  label = 'Password',
}: PasswordFieldsProps) {
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const ownPassword = useRef<TextInput>(null);
  const ownConfirmation = useRef<TextInput>(null);
  const passwordRef = givenPasswordRef ?? ownPassword;
  const confirmationRef = givenConfirmationRef ?? ownConfirmation;

  const mismatch = confirmation.length > 0 && password !== confirmation;
  const confirmError =
    (confirmTouched || submitted) && mismatch
      ? 'Passwords do not match.'
      : submitted && confirmation.length === 0
        ? 'Re-enter your password.'
        : undefined;

  return (
    <>
      <InputField
        ref={passwordRef}
        label={label}
        value={password}
        onChangeText={onPasswordChange}
        onBlur={() => setPasswordTouched(true)}
        secureTextEntry
        placeholder="Create a password"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => confirmationRef.current?.focus()}
        error={error}
        hint={<PasswordRules password={password} mobile={mobile} strict={passwordTouched || submitted} />}
      />
      <InputField
        ref={confirmationRef}
        label="Confirm password"
        value={confirmation}
        onChangeText={onConfirmationChange}
        onBlur={() => setConfirmTouched(true)}
        secureTextEntry
        placeholder="Re-enter your password"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType={onSubmit ? 'done' : 'default'}
        onSubmitEditing={onSubmit}
        error={confirmError}
      />
    </>
  );
}

function PasswordRules({ password, mobile, strict }: { password: string; mobile?: string; strict: boolean }) {
  return (
    <View style={styles.rules}>
      {passwordRules(password, mobile).map((rule) => {
        const failed = strict && !rule.met;
        const color = rule.met ? Brand.success : failed ? Brand.error : Brand.textFaint;
        return (
          <View
            key={rule.label}
            style={styles.rule}
            accessible
            accessibilityLabel={`${rule.label}, ${rule.met ? 'done' : 'not yet'}`}
          >
            <Ionicons name={rule.met ? 'checkmark-circle' : failed ? 'close-circle' : 'ellipse-outline'} size={14} color={color} />
            <Text style={[styles.ruleText, { color: rule.met ? Brand.text : failed ? Brand.error : Brand.textMuted }]} maxFontSizeMultiplier={1.3}>
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rules: { flex: 1, gap: Spacing.one },
  rule: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  ruleText: { ...Typography.caption },
});
