/**
 * Root Layout — Auth guard & navigation controller
 */

import { useEffect } from 'react';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import { useAuthStore } from '@/stores/auth-store';

function AuthGuard() {
  const { isAuthenticated, role } = useAuthStore();
  const segments    = useSegments();
  const navState    = useRootNavigationState();

  useEffect(() => {
    // Navigator not ready yet — skip to avoid premature redirects
    if (!navState?.key) return;

    const inAuthGroup   = segments[0] === '(auth)';
    const inUserGroup   = segments[0] === '(user)';
    const inVendorGroup = segments[0] === '(vendor)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/welcome');
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      if (role === 'vendor') { router.replace('/(vendor)'); return; }
      router.replace('/(user)');
      return;
    }

    if (isAuthenticated && role === 'vendor' && inUserGroup) {
      router.replace('/(vendor)');
    } else if (isAuthenticated && role !== 'vendor' && inVendorGroup) {
      router.replace('/(user)');
    }
  }, [isAuthenticated, role, segments, navState?.key]);

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
