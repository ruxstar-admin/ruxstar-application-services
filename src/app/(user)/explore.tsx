/**
 * User Explore Screen — Browse & discover vendors
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Brand, Radius, Spacing } from '@/constants/theme';

const TRENDING = [
  { icon: '🍕', name: 'Pizza Palace', category: 'Food', rating: '4.8', distance: '0.5 km' },
  { icon: '💆', name: 'Zen Spa', category: 'Beauty', rating: '4.9', distance: '1.2 km' },
  { icon: '🔧', name: 'Fix-It Fast', category: 'Home Services', rating: '4.7', distance: '0.8 km' },
  { icon: '📚', name: 'Brain Boost', category: 'Education', rating: '5.0', distance: '2.1 km' },
];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={['#FFFFFF', '#F5F5F7']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.three, paddingBottom: Spacing.six },
        ]}
        showsVerticalScrollIndicator={false}>

        <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
          <Text style={styles.title}>Explore</Text>
          <Text style={styles.subtitle}>Discover vendors & services near you</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150)}>
          <Text style={styles.sectionTitle}>Trending Near You</Text>
          {TRENDING.map((item, i) => (
            <Pressable key={i} style={styles.vendorCard}>
              <View style={styles.vendorIconCircle}>
                <Text style={styles.vendorIcon}>{item.icon}</Text>
              </View>
              <View style={styles.vendorInfo}>
                <Text style={styles.vendorName}>{item.name}</Text>
                <Text style={styles.vendorCategory}>{item.category}</Text>
              </View>
              <View style={styles.vendorMeta}>
                <Text style={styles.vendorRating}>⭐ {item.rating}</Text>
                <Text style={styles.vendorDistance}>{item.distance}</Text>
              </View>
            </Pressable>
          ))}
        </Animated.View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  header: { gap: Spacing.one },
  title: { color: Brand.textOnDark, fontSize: 28, fontWeight: '700' },
  subtitle: { color: Brand.textOnDarkSecondary, fontSize: 14 },
  sectionTitle: { color: Brand.textOnDark, fontSize: 17, fontWeight: '700', marginBottom: Spacing.two },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.surfaceCard,
    borderWidth: 1,
    borderColor: Brand.surfaceCardBorder,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.three,
  },
  vendorIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(32,138,239,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorIcon: { fontSize: 24 },
  vendorInfo: { flex: 1 },
  vendorName: { color: Brand.textOnDark, fontSize: 15, fontWeight: '600' },
  vendorCategory: { color: Brand.textOnDarkSecondary, fontSize: 12, marginTop: 2 },
  vendorMeta: { alignItems: 'flex-end', gap: 3 },
  vendorRating: { color: Brand.textOnDark, fontSize: 13, fontWeight: '600' },
  vendorDistance: { color: Brand.textOnDarkMuted, fontSize: 11 },
});
