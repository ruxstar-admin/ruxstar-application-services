import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
import { createLogger } from '@/lib/logger';
import { REPORT_REASONS, type ReportReason } from '@/types/profile';

const log = createLogger('moderation');

interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Sheet heading, e.g. "Report Priya Nair" or "Report post". */
  title: string;
  /** Name shown in "Also block …" after reporting. */
  subject: string;
  onReport: (reason: ReportReason) => Promise<unknown>;
  /** When provided, the confirmation offers to also block the person. */
  onBlock?: () => Promise<unknown>;
}

type Step = 'reason' | 'done';

/** Two-step report flow: pick a reason (sent immediately), then a confirmation that can also block. */
function ReportFlow({ subject, onReport, onBlock, onClose }: Omit<ReportSheetProps, 'visible' | 'title'>) {
  const [step, setStep] = useState<Step>('reason');
  const [busy, setBusy] = useState(false);

  const send = async (reason: ReportReason) => {
    setBusy(true);
    try {
      await onReport(reason);
      Feedback.success();
      setStep('done');
    } catch (err) {
      Feedback.error();
      log.warn('report failed', { status: (err as { status?: number }).status });
    } finally {
      setBusy(false);
    }
  };

  const blockToo = async () => {
    if (!onBlock) return;
    setBusy(true);
    try {
      await onBlock();
      Feedback.success();
      onClose();
    } catch {
      Feedback.error();
    } finally {
      setBusy(false);
    }
  };

  if (step === 'done') {
    return (
      <>
        <View style={styles.doneIcon}>
          <Ionicons name="checkmark" size={24} color={Brand.text} />
        </View>
        <Text style={styles.doneTitle}>Thanks for telling us</Text>
        <Text style={styles.note}>We are reviewing this. You will hear back in Notifications within 24 hours.</Text>
        {onBlock ? <PrimaryButton label={`Also block ${subject}`} variant="outline" onPress={blockToo} loading={busy} /> : null}
        <PrimaryButton label="Done" onPress={onClose} disabled={busy} />
      </>
    );
  }

  return (
    <>
      <Text style={styles.note}>Reports are private. They never see who reported them.</Text>
      {REPORT_REASONS.map((reason) => (
        <ListRow key={reason.key} title={reason.label} onPress={busy ? undefined : () => send(reason.key)} />
      ))}
      <PrimaryButton label="Cancel" variant="outline" onPress={onClose} disabled={busy} />
    </>
  );
}

/** Bottom sheet for reporting a person or a post. Its flow state resets each time the sheet is reopened. */
export function ReportSheet({ visible, onClose, title, subject, onReport, onBlock }: ReportSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <ReportFlow subject={subject} onReport={onReport} onBlock={onBlock} onClose={onClose} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  note: { ...Typography.body, color: Brand.textMuted },
  doneIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: Brand.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: { ...Typography.heading, color: Brand.text, marginBottom: Spacing.one },
});
