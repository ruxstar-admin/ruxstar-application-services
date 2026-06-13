/**
 * AppTabs (web) — web-specific tab bar (SDK 52 / expo-router 4.x compatible)
 *
 * expo-router/ui (TabList, TabTrigger, TabSlot) is not reliably available in
 * expo-router 4.x. This file provides a simplified web tab bar implementation
 * using standard React Native Pressable components so the web build compiles.
 *
 * SymbolView name is a plain string in expo-symbols 0.2.0 (SDK 52).
 */
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { ExternalLink } from './external-link';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppTabs() {
  // On web this component is a static nav bar — actual routing is handled by expo-router layouts.
  return (
    <View style={styles.tabListContainer}>
      <WebNavBar />
    </View>
  );
}

function WebNavBar() {
  const scheme = useColorScheme();
  const colors = Colors[(scheme === null || scheme === undefined) ? 'light' : scheme];

  return (
    <ThemedView type="backgroundElement" style={styles.innerContainer}>
      <ThemedText type="smallBold" style={styles.brandText}>
        Ruxstar
      </ThemedText>

      <ExternalLink href="https://docs.expo.dev" asChild>
        <Pressable style={styles.externalPressable}>
          <ThemedText type="link">Docs</ThemedText>
          {Platform.OS !== 'android' && (
            <SymbolView
              tintColor={colors.text}
              name="arrow.up.right.square"
              size={12}
            />
          )}
        </Pressable>
      </ExternalLink>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  externalPressable: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    marginLeft: Spacing.three,
  },
});
