/**
 * AuthTemplate — Template
 *
 * The layout shell for every auth screen (Welcome, Login, OTP, Register).
 *
 * Structure:
 *   • Full-screen dark gradient background
 *   • Optional back button (top-left)
 *   • Optional header slot (logo / globe area)
 *   • Scrollable content area
 *   • Safe-area aware
 *
 * This template wires together GradientBackground + layout concerns.
 * Pages fill it with real content.
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import GradientBackground from '@/components/ui/GradientBackground';
import { Brand, Spacing, Gradients } from '@/constants/theme';

interface AuthTemplateProps {
  children: React.ReactNode;
  /** Rendered in the top section (e.g. globe, logo) */
  header?: React.ReactNode;
  /** Show a ← back button */
  showBack?: boolean;
  /** Custom back handler — defaults to router.back() */
  onBack?: () => void;
  /** Right-side header action */
  headerRight?: React.ReactNode;
  /** Extra style for the content area */
  contentStyle?: ViewStyle;
  /** Allow content to scroll (default true) */
  scrollable?: boolean;
  /** Custom gradient — default authBackground */
  gradient?: readonly [string, string, ...string[]];
}

export default function AuthTemplate({
  children,
  header,
  showBack = false,
  onBack,
  headerRight,
  contentStyle,
  scrollable = true,
  gradient = Gradients.authBackground,
}: AuthTemplateProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <GradientBackground
      colors={gradient}
      scrollable={scrollable}
      safeArea={false}
      contentStyle={styles.outerContent}>

      {/* Top bar: back + right action */}
      {(showBack || headerRight) && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.topBar}>
          {showBack ? (
            <Pressable
              onPress={handleBack}
              style={styles.backButton}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back">
              <Text style={styles.backIcon}>←</Text>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : (
            <View />
          )}
          {headerRight ?? <View />}
        </Animated.View>
      )}

      {/* Header slot (globe / logo area) */}
      {header && (
        <View style={styles.headerSlot}>{header}</View>
      )}

      {/* Page content */}
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  outerContent: {
    paddingBottom: Spacing.five,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.two,
    minHeight: 56,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  backIcon: {
    color: Brand.textOnDark,
    fontSize: 20,
    lineHeight: 24,
  },
  backText: {
    color: Brand.textOnDarkSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  headerSlot: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
});
