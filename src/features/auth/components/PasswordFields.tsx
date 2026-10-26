import { useState } from 'react';
import { InputField } from '@/components/ui/InputField';
import { MIN_PASSWORD_LENGTH, passwordError } from '@/features/auth/lib/validators';

interface PasswordFieldsProps {
  password: string;
  confirmation: string;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  /** Server-side error for the password field (e.g. recently used). */
  error?: string;
}

/** New-password + confirm pair with blur-time validation, shared by sign-up and password reset. */
export function PasswordFields({ password, confirmation, onPasswordChange, onConfirmationChange, error }: PasswordFieldsProps) {
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  return (
    <>
      <InputField
        label="Password"
        value={password}
        onChangeText={onPasswordChange}
        onBlur={() => setPasswordTouched(true)}
        secureTextEntry
        placeholder={`Minimum ${MIN_PASSWORD_LENGTH} characters`}
        autoComplete="new-password"
        textContentType="newPassword"
        error={error ?? (passwordTouched ? (passwordError(password) ?? undefined) : undefined)}
      />
      <InputField
        label="Confirm password"
        value={confirmation}
        onChangeText={onConfirmationChange}
        onBlur={() => setConfirmTouched(true)}
        secureTextEntry
        placeholder="Re-enter your password"
        autoComplete="new-password"
        textContentType="newPassword"
        error={confirmTouched && confirmation.length > 0 && password !== confirmation ? 'Passwords do not match.' : undefined}
      />
    </>
  );
}
