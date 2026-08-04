/**
 * Root Layout — Auth guard & navigation controller
 */

import { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  FadeOut,
} from 'react-native-reanimated';

import { useAuthStore, consumePendingLoginRoute } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { useKycStore } from '@/stores/kyc-store';
import { useBusinessStore } from '@/stores/business-store';
import { useUserStore } from '@/stores/user-store';
import { initPushService, pushLogin, pushLogout, setPushNavReady } from '@/services/push-service';

// Prevent native splash from hiding until we're ready
SplashScreen.preventAutoHideAsync();

const SPLASH_MIN_MS = 1800; // minimum time splash is visible
const splashStart   = Date.now();

// ─── In-app Splash ────────────────────────────────────────────────────────────

function AppSplash() {
  const scale = useSharedValue(0.82);
  const glow  = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.08)) });
    glow.value  = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1,   { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logoAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowAnim = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.9 + glow.value * 0.1 }],
  }));

  return (
    <Animated.View style={sp.container} exiting={FadeOut.duration(300)}>
      <Animated.View style={[sp.glow, glowAnim]} />
      <Animated.View style={logoAnim}>
        <Image
          source={require('../../assets/images/logo-combined.png')}
          style={sp.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const sp = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0314',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logo: {
    width: 200,
    height: 200,
  },
  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.03)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 60,
    elevation: 0,
  },
});

// ─── Auth Guard ───────────────────────────────────────────────────────────────

function AuthGuard() {
  const { isAuthenticated, role, userId, _hasHydrated, activeMode } = useAuthStore();
  const resetKyc      = useKycStore((s) => s.reset);
  const resetBusiness = useBusinessStore((s) => s.reset);
  const clearProfile  = useUserStore((s) => s.clearProfile);
  const segments      = useSegments();
  const hydrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isNavReady, setIsNavReady] = useState(false);
  useEffect(() => {
    setIsNavReady(true);
    setPushNavReady(true);
    initPushService();
  }, []);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (isAuthenticated && userId) {
      pushLogin(userId);
    } else {
      pushLogout();
    }
  }, [isAuthenticated, userId, _hasHydrated]);

  // Force hydration after 800 ms on Android kill+restart edge case
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

  useEffect(() => {
    if (!isAuthenticated) {
      resetKyc();
      resetBusiness();
      clearProfile();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isNavReady || !_hasHydrated) return;

    const inAuthGroup   = segments[0] === '(auth)';
    const inUserGroup   = segments[0] === '(user)';
    const inVendorGroup = segments[0] === '(vendor)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/welcome');
      return;
    }

    if (isAuthenticated && !inAuthGroup && !inUserGroup && !inVendorGroup) {
      const pending = consumePendingLoginRoute();
      router.replace((pending ?? (role === 'vendor' ? '/(vendor)' : '/(user)')) as never);
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      const pending = consumePendingLoginRoute();
      router.replace((pending ?? (role === 'vendor' ? '/(vendor)' : '/(user)')) as never);
      return;
    }

    // Allow vendors to browse the user app when they've explicitly switched modes
    if (isAuthenticated && role === 'vendor' && inUserGroup && activeMode !== 'user') {
      router.replace('/(vendor)');
    } else if (isAuthenticated && role !== 'vendor' && inVendorGroup) {
      router.replace('/(user)');
    }
  }, [isAuthenticated, role, activeMode, segments, isNavReady, _hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const { _hasHydrated } = useAuthStore();
  const themeMode = useThemeStore((s) => s.mode);
  const [showSplash, setShowSplash] = useState(true);
  // Measure from component mount, not module load — Metro bundling time in dev
  // can exceed SPLASH_MIN_MS before the component even mounts, causing instant hide.
  const mountTime = useRef(Date.now());

  useEffect(() => {
    if (!_hasHydrated) return;

    // Ensure splash shows for at least SPLASH_MIN_MS from component mount
    const elapsed   = Date.now() - mountTime.current;
    const remaining = Math.max(0, SPLASH_MIN_MS - elapsed);

    const timer = setTimeout(async () => {
      await SplashScreen.hideAsync();
      setShowSplash(false);
    }, remaining);

    return () => clearTimeout(timer);
  }, [_hasHydrated]);

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: themeMode === 'dark' ? '#0A0A0F' : '#FFFFFF',
      card:       themeMode === 'dark' ? '#12121A' : '#FFFFFF',
      text:       themeMode === 'dark' ? '#F0EBE3' : '#0A0A0F',
      border:     themeMode === 'dark' ? '#252535' : '#E5E5EA',
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: themeMode === 'dark' ? '#0A0A0F' : '#FFFFFF' }}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <StatusBar style={showSplash ? 'light' : themeMode === 'dark' ? 'light' : 'dark'} />
          <AuthGuard />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index"    options={{ headerShown: false }} />
            <Stack.Screen name="(auth)"   options={{ headerShown: false }} />
            <Stack.Screen name="(user)"   options={{ headerShown: false }} />
            <Stack.Screen name="(vendor)" options={{ headerShown: false }} />
          </Stack>
          {showSplash && <AppSplash />}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
