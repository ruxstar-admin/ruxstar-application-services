import { useEffect, useRef } from 'react';
import { Slot, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/stores/auth-store';
import { consumePendingLoginRoute } from '@/lib/pending-login-route';
import { ROLES } from '@/constants/roles';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as SplashScreen from 'expo-splash-screen';
import { Brand } from '@/constants/theme';
import { initMonitoring, wrapRoot } from '@/lib/monitoring';
import { ErrorFallback } from '@/components/ui/ErrorFallback';

initMonitoring();

/** Expo Router renders this when any screen under the root throws during render. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <ErrorFallback error={error} retry={retry} />;
}

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Every signed-in user lands in the user app; vendors enter their portal from Profile (roles stack on one account). */
const HOME = '/(customer)/(tabs)';

/** Renderless — controls all navigation after app start. See CLAUDE.md §6. */
function AuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();
  const { isAuthenticated, roles, _hasHydrated, setHasHydrated } = useAuthStore();
  const forcedHydration = useRef(false);

  useEffect(() => {
    if (_hasHydrated || forcedHydration.current) return;
    const timeout = setTimeout(() => {
      forcedHydration.current = true;
      setHasHydrated(true);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [_hasHydrated, setHasHydrated]);

  useEffect(() => {
    if (!navState?.key || !_hasHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inCustomerGroup = segments[0] === '(customer)';
    const inVendorGroup = segments[0] === '(vendor)';
    const inPartnerGroup = segments[0] === '(partner)';
    const inNamedGroup = inAuthGroup || inCustomerGroup || inVendorGroup || inPartnerGroup;

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/welcome');
      return;
    }

    if (isAuthenticated && (!inNamedGroup || inAuthGroup)) {
      router.replace((consumePendingLoginRoute() ?? HOME) as never);
      return;
    }

    // Role-gated areas: the vendor portal and the delivery partner area each need their role.
    if (isAuthenticated && inVendorGroup && !roles.includes(ROLES.VENDOR)) router.replace(HOME as never);
    if (isAuthenticated && inPartnerGroup && !roles.includes(ROLES.DELIVERY)) router.replace(HOME as never);
  }, [navState?.key, _hasHydrated, isAuthenticated, roles, segments, router]);

  return null;
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Brand.bg }}>
      <StatusBar style="light" />
      <AuthGuard />
      <Slot />
    </GestureHandlerRootView>
  );
}

export default wrapRoot(RootLayout);
