import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Brand, Spacing } from '@/constants/theme';

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={['#050E14', '#0A1218']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.icon}>📦</Text>
        <Text style={styles.title}>Products & Services</Text>
        <Text style={styles.subtitle}>Manage your listings here</Text>
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
