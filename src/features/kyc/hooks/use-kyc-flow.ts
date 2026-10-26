import { useCallback, useState } from 'react';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { createLogger } from '@/lib/logger';
import { KycService } from '@/services/kyc-service';
import type { FlowDef } from '@/features/kyc/lib/flows';
import { kycErrorMessage } from '@/features/kyc/lib/kyc-errors';

const log = createLogger('kyc');

/** The key under which the Aadhaar OTP the user types is held while verifying. */
export const OTP_ANSWER = 'otp';

/**
 * Drives a verification flow one step at a time. Answers (numbers, photo URIs) live only in memory
 * and are cleared when the screen closes. `next()` runs the current step's server action, then advances.
 */
export function useKycFlow(flow: FlowDef) {
  const token = useAuthToken();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const step = flow.steps[index];

  const setAnswer = useCallback((key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  const next = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const ctx = { token, answers };
      if (step.kind === 'fields') await step.onContinue(ctx);
      else if (step.kind === 'otp') await step.onVerify(ctx, answers[OTP_ANSWER] ?? '');
      else if (step.kind === 'photo') await KycService.upload(token, step.fileKind, answers[step.id]);
      else {
        await KycService.submit(token, flow.id);
        Feedback.success();
        setSubmitted(true);
        return;
      }
      Feedback.tap();
      setIndex((i) => i + 1);
    } catch (err) {
      Feedback.error();
      log.warn('step failed', { flow: flow.id, step: step.id });
      if (step.kind === 'otp') setAnswers((prev) => ({ ...prev, [OTP_ANSWER]: '' }));
      setError(kycErrorMessage(err, step.kind, step.id));
    } finally {
      setBusy(false);
    }
  }, [answers, flow.id, step, token]);

  /** Goes back one step; returns false when already on the first step (the caller should leave). */
  const back = useCallback(() => {
    if (index === 0) return false;
    setError(null);
    setIndex((i) => i - 1);
    return true;
  }, [index]);

  return { step, index, total: flow.steps.length, answers, setAnswer, next, back, busy, error, submitted };
}
