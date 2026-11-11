import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ListRow } from '@/components/ui/ListRow';
import { useAuthToken } from '@/hooks/use-auth-token';
import { createLogger } from '@/lib/logger';
import { AuthService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { allows, useAccess } from '../access';
import { ConsoleScreen, Section, consoleStyles } from '../components/parts';

const log = createLogger('console');

export function MoreScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const access = useAccess();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const name = useAuthStore((s) => s.name);
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const logOut = async () => {
    setLoggingOut(true);
    // The server session is ended best-effort; the local session always ends.
    await AuthService.logout(token, refreshToken).catch(() => log.warn('server logout failed'));
    clearAuth();
  };

  return (
    <ConsoleScreen title="More" subtitle={[name, access.admin ? 'Admin' : access.title].filter(Boolean).join(' · ')}>
      <ScrollView contentContainerStyle={consoleStyles.list} showsVerticalScrollIndicator={false}>
        {access.admin ? <ListRow icon="shield-outline" title="Ruxstar staff" subtitle="Who can use the console, and what they can do" onPress={() => router.push('/(admin)/staff')} /> : null}
        {allows(access, 'modules.view') ? (
          <ListRow icon="apps-outline" title="Modules" subtitle="Live, new vendors, delivery and commission" onPress={() => router.push('/(admin)/modules')} />
        ) : null}
        {allows(access, 'audit.view') ? <ListRow icon="time-outline" title="Audit log" subtitle="Every change, newest first" onPress={() => router.push('/(admin)/audit')} /> : null}

        <Section>Your account</Section>
        <ListRow icon="key-outline" title="Change password" subtitle="Signs out your other devices" onPress={() => router.push('/(admin)/password')} />
        <ListRow icon="phone-portrait-outline" title="Sessions & devices" subtitle="Where you are logged in" onPress={() => router.push('/(admin)/sessions')} />
        <ListRow icon="log-out-outline" title="Log out" destructive onPress={() => setConfirming(true)} />
      </ScrollView>

      <ConfirmSheet
        visible={confirming}
        title="Log out?"
        message="You will need your password or a one-time code to log back in."
        confirmLabel="Log out"
        loading={loggingOut}
        onConfirm={logOut}
        onCancel={() => setConfirming(false)}
      />
    </ConsoleScreen>
  );
}
