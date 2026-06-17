/**
 * Vendor Orders Screen
 */

import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing } from '@/constants/theme';

export default function VendorOrdersScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Orders</Text>
      </View>

      {/* Empty state */}
      <View style={s.center}>
        <View style={s.iconWrap}>
          <Ionicons name="receipt-outline" size={32} color={Brand.creamMuted} />
        </View>
        <Text style={s.title}>No orders yet</Text>
        <Text style={s.subtitle}>
          Orders from your customers will appear here once your business is live.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bg },

  header: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border1,
  },
  headerTitle: { color: Brand.cream, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    backgroundColor: Brand.surface2,
    borderWidth: 1,
    borderColor: Brand.border1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title:    { color: Brand.cream, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: Brand.creamSub, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
