/**
 * Root Layout — Auth guard & navigation controller
 */

import { useEffect, useRef, useState } from 'react';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import { useAuthStore, consumePendingLoginRoute } from '@/stores/auth-store';
import { useKycStore } from '@/stores/kyc-store';
import { useBusinessStore } from '@/stores/business-store';
import { useUserStore } from '@/stores/user-store';

function AuthGuard() {
  const { isAuthenticated, role, _hasHydrated } = useAuthStore();
  const resetKyc      = useKycStore((s) => s.reset);
  const resetBusiness = useBusinessStore((s) => s.reset);
  const clearProfile  = useUserStore((s) => s.clearProfile);
  const segments      = useSegments();
  const hydrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Navigator ready flag ──────────────────────────────────────────────────
  // Set to true after the first render completes (React has committed the full
  // tree including <Stack>, so router.replace() is always safe at this point).
  // This replaces useRootNavigationState() which can return undefined on the
  // first render in Expo Router 4 before the navigation 'state' event fires,
  // causing the route guard to silently return early and never retry.
  const [isNavReady, setIsNavReady] = useState(false);
  useEffect(() => {
    setIsNavReady(true);
  }, []);

  // ── Hydration safety timeout ──────────────────────────────────────────────
  // If AsyncStorage never calls onRehydrateStorage (e.g. after kill+restart
  // on certain Android versions), force _hasHydrated = true after 800 ms so
  // the app never stays on the loader indefinitely.
  useEffect(() => {
    if (_hasHydrated) return;
    hydrationTimer.current = setTimeout(() => {
      if (!useAuthStore.getState()._hasHydrated) {
        useAuthStore.setState({ _hasHydrated: true });
      }
    }, 800);
    return () => {
      if (hydrationTimer.current) clearTimeout(hydrationTimer.current);
    };
  }, [_hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Full store wipe the moment auth is gone ───────────────────────────────
  // Prevents any data from a previous session leaking into a new one.
  useEffect(() => {
    if (!isAuthenticated) {
      resetKyc();
      resetBusiness();
      clearProfile();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Route guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    // Wait for navigator mount AND AsyncStorage hydration before redirecting.
    if (!isNavReady || !_hasHydrated) return;

    const inAuthGroup   = segments[0] === '(auth)';
    const inUserGroup   = segments[0] === '(user)';
    const inVendorGroup = segments[0] === '(vendor)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/welcome');
      return;
    }

    // Authenticated user stuck at root index (e.g. after kill-from-recents cold start).
    // segments[0] is '' or undefined when Expo Router lands on the root index.tsx,
    // which means none of the group checks below would ever match — causing the
    // spinner to hang forever. Redirect immediately to the correct home group.
    if (isAuthenticated && !inAuthGroup && !inUserGroup && !inVendorGroup) {
      const pending = consumePendingLoginRoute();
      router.replace((pending ?? (role === 'vendor' ? '/(vendor)' : '/(user)')) as never);
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      // Use the destination set by login/OTP screen (KYC-aware), else fall back to role default
      const pending = consumePendingLoginRoute();
      router.replace((pending ?? (role === 'vendor' ? '/(vendor)' : '/(user)')) as never);
      return;
    }

    if (isAuthenticated && role === 'vendor' && inUserGroup) {
      router.replace('/(vendor)');
    } else if (isAuthenticated && role !== 'vendor' && inVendorGroup) {
      router.replace('/(user)');
    }
  }, [isAuthenticated, role, segments, isNavReady, _hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={DefaultTheme}>
          <StatusBar style="dark" />
          <AuthGuard />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index"    options={{ headerShown: false }} />
            <Stack.Screen name="(auth)"   options={{ headerShown: false }} />
            <Stack.Screen name="(user)"   options={{ headerShown: false }} />
            <Stack.Screen name="(vendor)" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
