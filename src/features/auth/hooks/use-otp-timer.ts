import { useCallback, useEffect, useRef, useState } from 'react';

/** Used only when the API did not say (`resendInSeconds` on the send-code response). */
const FALLBACK_SECONDS = 30;

const cooldownOf = (seconds?: number) => (seconds && seconds > 0 ? Math.ceil(seconds) : FALLBACK_SECONDS);

export function useOtpTimer(initialSeconds?: number) {
  const [secondsLeft, setSecondsLeft] = useState(() => cooldownOf(initialSeconds));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runCountdown = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1 && intervalRef.current) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const restart = useCallback(
    (seconds?: number) => {
      setSecondsLeft(cooldownOf(seconds));
      runCountdown();
    },
    [runCountdown],
  );

  useEffect(() => {
    runCountdown();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [runCountdown]);

  return { secondsLeft, canResend: secondsLeft === 0, restart };
}
