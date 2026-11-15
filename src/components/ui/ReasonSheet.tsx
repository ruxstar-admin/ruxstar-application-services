import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Typography } from '@/constants/theme';

/** Asks for a 5 to 300 character reason before a decision the people affected will read. `message` says what happens. */
export function ReasonSheet({
  visible,
  title,
  message,
  prompt,
  placeholder,
  confirmLabel,
  loading,
  failure,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  prompt: string;
  placeholder: string;
  confirmLabel: string;
  loading: boolean;
  failure?: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [shown, setShown] = useState(visible);
  if (visible !== shown) {
    setShown(visible);
    if (visible) setReason('');
  }

  return (
    <BottomSheet visible={visible} onClose={onCancel} title={title}>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <InputField label={prompt} value={reason} onChangeText={setReason} placeholder={placeholder} multiline maxLength={300} showCount autoFocus />
      {failure ? <ErrorBanner message={failure} /> : null}
      <PrimaryButton label={confirmLabel} onPress={() => onConfirm(reason.trim())} loading={loading} disabled={reason.trim().length < 5} />
      <PrimaryButton label="Cancel" variant="outline" onPress={onCancel} disabled={loading} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  message: { ...Typography.body, color: Brand.textMuted },
});
