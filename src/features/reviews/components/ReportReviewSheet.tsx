import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Typography } from '@/constants/theme';
import { REPORT_REASONS } from '@/features/reviews/lib/review';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { reviewsOf, type ReviewRoutes } from '@/services/review-service';
import type { ReviewReportReason } from '@/types/review';

/** Report a review to Ruxstar: why, and a note if you like. The writer isn't told. `module` is the kind of business it's about. */
export function ReportReviewSheet({
  reviewId,
  module = 'pod',
  onClose,
}: {
  reviewId: string | null;
  module?: ReviewRoutes;
  onClose: (reported: boolean) => void;
}) {
  const token = useAuthToken();
  const [reason, setReason] = useState<ReviewReportReason>('spam');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!reviewId) return;
    setSending(true);
    setError(null);
    try {
      await reviewsOf(module).report(token, reviewId, { reason, ...(note.trim() ? { note: note.trim() } : {}) });
      Feedback.success();
      setNote('');
      onClose(true);
    } catch (err) {
      Feedback.error();
      setError(err instanceof Error ? err.message : 'Could not send. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <BottomSheet visible={reviewId !== null} onClose={() => onClose(false)} title="Report this review">
      <Text style={styles.muted}>{"Ruxstar looks at it and removes it if it breaks the rules. The writer isn't told who reported it."}</Text>
      <ChoiceChips options={REPORT_REASONS} value={reason} onChange={setReason} />
      <InputField label="Anything to add (optional)" value={note} onChangeText={setNote} multiline maxLength={300} showCount />
      {error ? <ErrorBanner message={error} /> : null}
      <PrimaryButton label="Send to Ruxstar" onPress={send} loading={sending} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  muted: { ...Typography.caption, color: Brand.textMuted },
});
