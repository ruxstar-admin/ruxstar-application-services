import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { Brand, Gradients, Spacing, Typography } from '@/constants/theme';

const CATEGORIES = ['Bookings', 'Shopping', 'Print on demand', 'Creators', 'Events'] as const;
const ROTATE_MS = 2200;

/** Brand hero shown above the welcome sheet: logo, wordmark and a rotating "what you can do" label. */
export function AuthHero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % CATEGORIES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <LinearGradient colors={Gradients.authHero.colors} locations={Gradients.authHero.locations} style={styles.hero}>
      <Animated.View entering={FadeInDown.duration(500)} style={styles.brand}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <Text style={styles.wordmark}>Ruxstar</Text>
      </Animated.View>

      <View style={styles.labelRow} accessibilityLiveRegion="polite">
        <Text style={styles.sparkle}>✦</Text>
        <Animated.Text
          key={CATEGORIES[index]}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.label}
        >
          {CATEGORIES[index]}
        </Animated.Text>
        <Text style={styles.sparkle}>✦</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four },
  brand: { alignItems: 'center', marginBottom: Spacing.five },
  logo: { width: 112, height: 112, borderRadius: 28, marginBottom: Spacing.three },
  wordmark: { ...Typography.display, color: Brand.text, letterSpacing: 0.5 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, height: 32 },
  label: { ...Typography.title, fontSize: 20, color: Brand.primary },
  sparkle: { color: Brand.primary, fontSize: 14 },
});
