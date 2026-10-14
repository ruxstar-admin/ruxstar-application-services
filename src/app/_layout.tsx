import { useEffect, useRef } from 'react';
import { Slot, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/stores/auth-store';
import { consumePendingLoginRoute } from '@/lib/pending-login-route';
import { ROLES, type Role } from '@/constants/roles';
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

initMonitoring();

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const ROLE_HOME: Record<Role, string> = {
  [ROLES.CUSTOMER]: '/(customer)',
  [ROLES.VENDOR]: '/(vendor)/dashboard',
  [ROLES.DELIVERY]: '/(delivery)/dashboard',
  [ROLES.ADMIN]: '/(customer)',
  [ROLES.EMPLOYEE]: '/(customer)',
};

/** Renderless — controls all navigation after app start. See CLAUDE.md §6. */
function AuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();
  const { isAuthenticated, role, _hasHydrated, setHasHydrated } = useAuthStore();
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
    const inDeliveryGroup = segments[0] === '(delivery)';
    const inNamedGroup = inAuthGroup || inCustomerGroup || inVendorGroup || inDeliveryGroup;

    const home = role ? ROLE_HOME[role] : '/(auth)/welcome';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/welcome');
      return;
    }

    if (isAuthenticated && !inNamedGroup) {
      const pending = consumePendingLoginRoute();
      router.replace((pending ?? home) as never);
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      const pending = consumePendingLoginRoute();
      router.replace((pending ?? home) as never);
      return;
    }

    if (isAuthenticated && role === ROLES.VENDOR && (inCustomerGroup || inDeliveryGroup)) {
      router.replace(ROLE_HOME[ROLES.VENDOR] as never);
    } else if (isAuthenticated && role === ROLES.DELIVERY && (inCustomerGroup || inVendorGroup)) {
      router.replace(ROLE_HOME[ROLES.DELIVERY] as never);
    } else if (isAuthenticated && role === ROLES.CUSTOMER && (inVendorGroup || inDeliveryGroup)) {
      router.replace(ROLE_HOME[ROLES.CUSTOMER] as never);
    }
  }, [navState?.key, _hasHydrated, isAuthenticated, role, segments, router]);

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
