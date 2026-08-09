import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AuthBackgroundVideo from '@/components/auth/AuthBackgroundVideo';

export default function AuthLayout() {
  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Mounted once here — every screen below sits transparently on top of
          it, so the video never restarts/flashes when navigating. */}
      <AuthBackgroundVideo />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" />
        <Stack.Screen name="otp" />
        <Stack.Screen name="register" />
      </Stack>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
});
