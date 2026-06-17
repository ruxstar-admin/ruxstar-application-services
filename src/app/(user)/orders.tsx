import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Brand, Spacing } from '@/constants/theme';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={['#050E24', '#0A1830']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.icon}>🛒</Text>
        <Text style={styles.title}>My Orders</Text>
        <Text style={styles.subtitle}>Your orders will appear here</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  icon: { fontSize: 54 },
  title: { color: Brand.textOnDark, fontSize: 22, fontWeight: '700' },
  subtitle: { color: Brand.textOnDarkSecondary, fontSize: 14 },
});
