/**
 * AppTabs (web) — minimal web nav bar for SDK 52 / expo-router 4.x
 */
import { Platform, Pressable, StyleSheet, View, Text } from 'react-native';
import { Spacing, MaxContentWidth } from '@/constants/theme';

export default function AppTabs() {
  return (
    <View style={styles.tabListContainer}>
      <WebNavBar />
    </View>
  );
}

function WebNavBar() {
  return (
    <View style={styles.innerContainer}>
      <Text style={styles.brandText}>Ruxstar</Text>
    </View>
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
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  brandText: {
    marginRight: 'auto',
    fontWeight: '700',
    fontSize: 14,
    color: '#0A0A0F',
  },
});
