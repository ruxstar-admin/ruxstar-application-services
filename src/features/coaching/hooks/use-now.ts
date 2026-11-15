import { useEffect, useState } from 'react';

/** The time now, moving on every `everyMs`, so join buttons and "starts soon" lines change without a refresh. */
export function useNow(everyMs = 30_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}
