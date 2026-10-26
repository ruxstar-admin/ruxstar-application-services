import { useCallback, useState } from 'react';

/**
 * Shared "pay, then create the thing" flow for every module. Once the payment is confirmed the
 * reference is kept, so if creating the order/booking/ticket fails the user can retry WITHOUT paying
 * again. `create` receives the payment reference (or `undefined` for free purchases).
 */
export function usePaidAction<T>(create: (paymentRef: string | undefined) => Promise<T>) {
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  const [paidRef, setPaidRef] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (ref: string | undefined) => {
      setBusy(true);
      setFailed(false);
      try {
        setResult(await create(ref));
        setPaidRef(null);
      } catch {
        // Money (if any) is already taken; remember the reference so a retry cannot double charge.
        setPaidRef(ref ?? null);
        setFailed(true);
      } finally {
        setBusy(false);
      }
    },
    [create],
  );

  /** Free items skip the payment sheet. */
  const startFree = useCallback(() => run(undefined), [run]);
  const onPaid = useCallback((reference: string) => run(reference), [run]);
  const retry = useCallback(() => run(paidRef ?? undefined), [run, paidRef]);

  const closeSheet = () => !result && setPaying(false);

  return { paying, openSheet: () => setPaying(true), closeSheet, result, failed, busy, startFree, onPaid, retry, paid: paidRef !== null || result !== null };
}
