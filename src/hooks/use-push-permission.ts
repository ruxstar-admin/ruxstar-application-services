import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { changePushPermission, pushAllowed } from '@/lib/push-notifications';

/**
 * Whether phone notifications are allowed (null where push isn't available, so callers can hide the row), and the
 * action behind the switch. It re-reads when the app returns from the phone's settings.
 */
export function usePushPermission() {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    pushAllowed().then(setAllowed, () => setAllowed(null));
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const change = useCallback(async () => {
    await changePushPermission();
    refresh();
  }, [refresh]);

  return { allowed, change };
}
