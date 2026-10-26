import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { MoneyService } from '@/services/money-service';
import type { CancelQuote } from '@/types/money';

interface CancelOrderProps {
  /** The id the module's detail screen uses (order, ticket, enrolment or booking id). */
  refId: string;
  /** Button text, e.g. "Cancel order" or "Drop out of this course". */
  label: string;
  /** Called after a successful cancel so the screen can reload. */
  onCancelled: () => void;
}

type Phase = 'quoting' | 'confirm' | 'cancelling' | 'done' | 'error';

/** Asks the server what cancelling would do, shows it plainly, then cancels. Content resets each time the sheet opens. */
function CancelFlow({ refId, label, onCancelled, onClose }: CancelOrderProps & { onClose: () => void }) {
  const token = useAuthToken();
  const [phase, setPhase] = useState<Phase>('quoting');
  const [quote, setQuote] = useState<CancelQuote | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    MoneyService.cancelQuote(token, refId)
      .then((q) => {
        if (cancelled) return;
        setQuote(q);
        setPhase('confirm');
      })
      .catch((err) => {
        if (cancelled) return;
        setMessage(err instanceof ApiError && err.kind === 'conflict' ? 'This has already been cancelled.' : 'Could not check this right now. Please try again.');
        setPhase('error');
      });
    return () => {
      cancelled = true;
    };
  }, [token, refId]);

  const confirm = async () => {
    setPhase('cancelling');
    try {
      const result = await MoneyService.cancel(token, refId);
      Feedback.success();
      setMessage(result.message);
      setPhase('done');
      onCancelled();
    } catch (err) {
      Feedback.error();
      setMessage(err instanceof ApiError && err.kind === 'conflict' ? err.message : 'Could not cancel. Please try again.');
      setPhase('error');
    }
  };

  if (phase === 'quoting') return <ActivityIndicator color={Brand.primarySoft} style={styles.loader} />;

  if (phase === 'done' || phase === 'error') {
    return (
      <>
        <Text style={styles.message}>{message}</Text>
        <PrimaryButton label="Close" onPress={onClose} />
      </>
    );
  }

  return (
    <>
      <Text style={styles.message}>{quote?.summary}</Text>
      {quote?.allowed ? (
        <>
          <PrimaryButton label={label} onPress={confirm} loading={phase === 'cancelling'} />
          <PrimaryButton label="Keep it" variant="outline" onPress={onClose} disabled={phase === 'cancelling'} />
        </>
      ) : (
        <PrimaryButton label="Close" onPress={onClose} />
      )}
    </>
  );
}

/** "Cancel" action for any paid order, ticket, enrolment or stay. Full refund inside the 7-day window, no approval. */
export function CancelOrder(props: CancelOrderProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PrimaryButton label={props.label} variant="outline" onPress={() => setOpen(true)} />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={props.label}>
        <CancelFlow {...props} onClose={() => setOpen(false)} />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  loader: { paddingVertical: 24 },
  message: { ...Typography.body, color: Brand.textMuted },
});
