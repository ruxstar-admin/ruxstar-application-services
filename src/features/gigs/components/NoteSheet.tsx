import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Spacing, Typography } from '@/constants/theme';

/** A sheet asking for a note of `min` to `max` characters (`min` 0 makes it optional) before an order step. */
export function NoteSheet({
  visible,
  title,
  message,
  prompt,
  placeholder,
  min,
  max,
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
  min: number;
  max: number;
  confirmLabel: string;
  loading: boolean;
  failure?: string | null;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState('');
  const [shown, setShown] = useState(visible);
  if (visible !== shown) {
    setShown(visible);
    if (visible) setNote('');
  }
  const short = note.trim().length < min;

  return (
    <BottomSheet visible={visible} onClose={onCancel} title={title}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <InputField label={prompt} value={note} onChangeText={setNote} placeholder={placeholder} multiline maxLength={max} showCount />
        {min > 1 && short && note.trim() ? <Text style={styles.hint}>{`A little more, please: at least ${min} characters.`}</Text> : null}
        {failure ? <ErrorBanner message={failure} /> : null}
      </ScrollView>
      <PrimaryButton label={confirmLabel} onPress={() => onConfirm(note.trim())} loading={loading} disabled={short} />
      <PrimaryButton label="Cancel" variant="outline" onPress={onCancel} disabled={loading} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 360 },
  content: { gap: Spacing.two },
  message: { ...Typography.body, color: Brand.textMuted },
  hint: { ...Typography.caption, color: Brand.textMuted },
});
