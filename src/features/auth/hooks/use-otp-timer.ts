import { useCallback, useEffect, useRef, useState } from 'react';

const RESEND_COOLDOWN_SECONDS = 30;

export function useOtpTimer() {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
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

  const restart = useCallback(() => {
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    runCountdown();
  }, [runCountdown]);

  useEffect(() => {
    runCountdown();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [runCountdown]);

  return { secondsLeft, canResend: secondsLeft === 0, restart };
}
