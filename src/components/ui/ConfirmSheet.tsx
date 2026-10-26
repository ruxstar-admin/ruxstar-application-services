import { StyleSheet, Text } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Typography } from '@/constants/theme';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** "Are you sure?" bottom sheet: a message, one confirming action and Cancel. */
export function ConfirmSheet({ visible, title, message, confirmLabel, loading, onConfirm, onCancel }: ConfirmSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onCancel} title={title}>
      <Text style={styles.message}>{message}</Text>
      <PrimaryButton label={confirmLabel} onPress={onConfirm} loading={loading} />
      <PrimaryButton label="Cancel" variant="outline" onPress={onCancel} disabled={loading} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  message: { ...Typography.body, color: Brand.textMuted },
});
