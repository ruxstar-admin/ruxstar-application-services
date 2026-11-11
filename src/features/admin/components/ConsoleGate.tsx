import { useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { AuthService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { useAccessState } from '../access';

/** Holds the console back until access has loaded, and explains when it cannot open. */
export function ConsoleGate({ children }: { children: ReactNode }) {
  const { state, retry } = useAccessState();
  const token = useAuthToken();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [leaving, setLeaving] = useState(false);

  if (state && 'access' in state) return <>{children}</>;

  const logOut = async () => {
    setLeaving(true);
    await AuthService.logout(token, refreshToken).catch(() => undefined);
    clearAuth();
  };

  return (
    <SafeAreaView style={styles.container}>
      {!state ? (
        <ActivityIndicator color={Brand.primarySoft} accessibilityLabel="Loading" />
      ) : (
        <View style={styles.body}>
          <Text style={styles.overline}>Ruxstar console</Text>
          <Text style={styles.title}>{state.failed === 'ended' ? 'Your access has ended' : 'Could not open the console'}</Text>
          <Text style={styles.message}>
            {state.failed === 'ended'
              ? 'This account is no longer on the Ruxstar team. Ask an admin if this is a mistake.'
              : 'Check your connection and try again.'}
          </Text>
          {state.failed === 'offline' ? <PrimaryButton label="Try again" onPress={retry} /> : null}
          <PrimaryButton label="Log out" variant="outline" onPress={logOut} loading={leaving} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: Brand.bg },
  body: { gap: Spacing.three, paddingHorizontal: Spacing.four },
  overline: { ...Typography.overline, color: Brand.textMuted },
  title: { ...Typography.title, color: Brand.text },
  message: { ...Typography.body, color: Brand.textMuted },
});
