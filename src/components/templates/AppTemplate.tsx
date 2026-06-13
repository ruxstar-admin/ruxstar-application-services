/**
 * AppTemplate — Template
 *
 * The layout shell for post-auth screens (dashboard, profile, etc.)
 *
 * Structure:
 *   • White / system background (light mode aware)
 *   • Optional header with title, back button, right action
 *   • Content area (optionally scrollable)
 *   • Safe-area aware via insets
 *
 * Pages fill this with real content.
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  StatusBar,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Spacing, Radius, Brand } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface AppTemplateProps {
  children: React.ReactNode;
  /** Screen title shown in the header */
  title?: string;
  /** Show a ← back button */
  showBack?: boolean;
  onBack?: () => void;
  /** Rendered in the top-right of the header */
  headerRight?: React.ReactNode;
  /** Allow the body to scroll (default: false) */
  scrollable?: boolean;
  contentStyle?: ViewStyle;
  /** Disables the header entirely */
  noHeader?: boolean;
}

export default function AppTemplate({
  children,
  title,
  showBack = false,
  onBack,
  headerRight,
  scrollable = false,
  contentStyle,
  noHeader = false,
}: AppTemplateProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[(scheme === 'dark' ? 'dark' : 'light')];

  const handleBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
  };

  const body = scrollable ? (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + Spacing.four },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.content,
        { paddingBottom: insets.bottom + Spacing.four },
        contentStyle,
      ]}>
      {children}
    </View>
  );

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}>
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      {!noHeader && (
        <View
          style={[
            styles.header,
            { borderBottomColor: colors.backgroundElement },
          ]}>
          {showBack ? (
            <Pressable
              onPress={handleBack}
              style={styles.backButton}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back">
              <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
            </Pressable>
          ) : (
            <View style={styles.headerPlaceholder} />
          )}

          {title ? (
            <Text
              style={[styles.headerTitle, { color: colors.text }]}
              numberOfLines={1}>
              {title}
            </Text>
          ) : (
            <View />
          )}

          <View style={styles.headerRight}>
            {headerRight ?? <View style={styles.headerPlaceholder} />}
          </View>
        </View>
      )}

      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  backButton: {
    padding: Spacing.one,
    borderRadius: Radius.sm,
  },
  backIcon: {
    fontSize: 22,
    lineHeight: 26,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.two,
  },
  headerRight: {
    alignItems: 'flex-end',
    minWidth: 40,
  },
  headerPlaceholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.three,
  },
  content: {
    flex: 1,
    padding: Spacing.three,
  },
});
