import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { createLogger } from '@/lib/logger';
import { AuthService } from '@/services/auth-service';
import { ProfileService } from '@/services/profile-service';
import { useAuthStore } from '@/stores/auth-store';

const log = createLogger('settings');

export function SettingsScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // Null until loaded, and on an API too old to have the setting, so the row stays hidden.
  const [showActivity, setShowActivity] = useState<boolean | null>(null);

  useEffect(() => {
    ProfileService.account(token)
      .then((user) => setShowActivity(user.showActivity ?? null))
      .catch(() => log.debug('account load failed'));
  }, [token]);

  const changeActivity = async (show: boolean) => {
    setShowActivity(show);
    try {
      setShowActivity(await ProfileService.setActivityStatus(token, show));
    } catch {
      Feedback.error();
      setShowActivity(!show);
    }
  };

  const logOut = async () => {
    setLoggingOut(true);
    // The server session is ended best-effort; the local session always ends.
    await AuthService.logout(token, refreshToken).catch(() => log.warn('server logout failed'));
    clearAuth();
  };

  return (
    <ScreenContainer title="Settings">
      <ListRow icon="receipt-outline" title="Orders & bookings" subtitle="Prints, tickets, classes and stays" onPress={() => router.push('/(customer)/orders')} />
      <ListRow icon="shield-outline" title="Verification" subtitle="Ruxstar Card, Verified tick and vendor" onPress={() => router.push('/(customer)/settings/verification')} />
      <ListRow icon="key-outline" title="Change password" subtitle="Signs out your other devices" onPress={() => router.push('/(customer)/settings/password')} />
      <ListRow icon="phone-portrait-outline" title="Sessions & devices" subtitle="Where you are logged in" onPress={() => router.push('/(customer)/settings/sessions')} />
      <ListRow icon="notifications-outline" title="Notification preferences" subtitle="Choose what reaches your phone" soon />
      {showActivity !== null ? (
        <ToggleRow
          icon="radio-button-on-outline"
          title="Show activity status"
          subtitle={
            showActivity
              ? 'People you chat with can see when you were last active'
              : "No one sees when you're active, and you won't see when others are"
          }
          value={showActivity}
          onValueChange={changeActivity}
        />
      ) : null}
      <ListRow icon="ban-outline" title="Blocked accounts" subtitle="People you blocked" onPress={() => router.push('/(customer)/settings/blocked')} />
      <ListRow icon="shield-checkmark-outline" title="Account & data" subtitle="Delete your account" onPress={() => router.push('/(customer)/settings/account')} />
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
