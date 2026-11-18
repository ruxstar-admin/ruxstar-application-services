import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { useGigsRules, useMyFreelancer } from '@/features/gigs/hooks/use-gigs';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePushPermission } from '@/hooks/use-push-permission';
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
  const { allowed: pushAllowed, change: changePush } = usePushPermission();
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const showActivity = useAuthStore((s) => s.showActivity);
  const setShowActivity = useAuthStore((s) => s.setShowActivity);
  const gigs = useGigsRules();
  const freelancer = useMyFreelancer();

  // Shows the remembered value at once; this only corrects it if it changed elsewhere, like on the website.
  useEffect(() => {
    ProfileService.account(token)
      .then((user) => {
        if (user.showActivity !== undefined) setShowActivity(user.showActivity);
      })
      .catch(() => log.debug('account load failed'));
  }, [token, setShowActivity]);

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
      <ListRow icon="wallet-outline" title="Payments" subtitle="What you paid and any refunds" onPress={() => router.push('/(customer)/payments')} />
      <ListRow icon="document-text-outline" title="Invoices" subtitle="GST invoices and credit notes, as PDFs" onPress={() => router.push('/(customer)/invoices')} />
      <ListRow icon="briefcase-outline" title="Work" subtitle="Team invites and businesses you help run" onPress={() => router.push('/(customer)/work')} />
      {freelancer.data || gigs.data?.live ? (
        <ListRow
          icon="color-palette-outline"
          title="Freelancing"
          subtitle={freelancer.data ? 'Your gigs, offers and freelance orders' : 'Sell your skills as gigs'}
          onPress={() => router.push('/(customer)/freelance')}
        />
      ) : null}
      <ListRow icon="shield-outline" title="Verification" subtitle="Ruxstar Card, Verified tick and vendor" onPress={() => router.push('/(customer)/settings/verification')} />
      <ListRow icon="key-outline" title="Change password" subtitle="Signs out your other devices" onPress={() => router.push('/(customer)/settings/password')} />
      <ListRow icon="phone-portrait-outline" title="Sessions & devices" subtitle="Where you are logged in" onPress={() => router.push('/(customer)/settings/sessions')} />
      {pushAllowed !== null ? (
        <ToggleRow
          icon="notifications-outline"
          title="Push notifications"
          subtitle={pushAllowed ? 'On. Turn off in your phone settings' : 'Off. Tap to allow likes, comments and messages'}
          value={pushAllowed}
          onValueChange={() => void changePush()}
        />
      ) : null}
      <ToggleRow
        icon="radio-button-on-outline"
        title="Show activity status"
        subtitle={
          showActivity ? 'People you chat with can see when you were last active' : "No one sees when you're active, and you won't see when others are"
        }
        value={showActivity}
        onValueChange={changeActivity}
      />
      <ListRow icon="ban-outline" title="Blocked accounts" subtitle="People you blocked" onPress={() => router.push('/(customer)/settings/blocked')} />
      <ListRow icon="shield-checkmark-outline" title="Account & data" subtitle="Delete your account" onPress={() => router.push('/(customer)/settings/account')} />
      <ListRow icon="help-buoy-outline" title="Help & support" subtitle="Message the Ruxstar team" onPress={() => router.push('/(customer)/support')} />
      {__DEV__ ? (
        <ListRow icon="construct-outline" title="Booking pieces (dev)" subtitle="Preview the shared booking screen parts" onPress={() => router.push('/(customer)/settings/booking-pieces')} />
      ) : null}
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
