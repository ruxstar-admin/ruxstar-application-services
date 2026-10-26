import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuthToken } from '@/hooks/use-auth-token';
import { createLogger } from '@/lib/logger';
import { AuthService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';

const log = createLogger('settings');

export function SettingsScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const logOut = async () => {
    setLoggingOut(true);
    // The server session is ended best-effort; the local session always ends.
    await AuthService.logout(token).catch(() => log.warn('server logout failed'));
    clearAuth();
  };

  return (
    <ScreenContainer title="Settings">
      <ListRow icon="receipt-outline" title="Orders & bookings" subtitle="Prints, tickets, classes and stays" onPress={() => router.push('/(customer)/orders')} />
      <ListRow icon="shield-outline" title="Verification" subtitle="Identity, vendor and delivery" onPress={() => router.push('/(customer)/settings/verification')} />
      <ListRow icon="phone-portrait-outline" title="Sessions & devices" subtitle="Where you are logged in" onPress={() => router.push('/(customer)/settings/sessions')} />
      <ListRow icon="notifications-outline" title="Notification preferences" subtitle="Choose what reaches your phone" onPress={() => router.push('/(customer)/settings/notifications')} />
      <ListRow icon="ban-outline" title="Blocked users" onPress={() => router.push('/(customer)/settings/blocked')} />
      <ListRow icon="shield-checkmark-outline" title="Account & data" subtitle="Export, pause or delete" onPress={() => router.push('/(customer)/settings/account')} />
      <ListRow icon="log-out-outline" title="Log out" destructive onPress={() => setConfirming(true)} />

      <ConfirmSheet
        visible={confirming}
        title="Log out?"
        message="You will need your password or a one-time code to log back in."
        confirmLabel="Log out"
        loading={loggingOut}
        onConfirm={logOut}
        onCancel={() => setConfirming(false)}
      />
    </ScreenContainer>
  );
}
