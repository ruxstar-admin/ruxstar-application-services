import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { Brand, Fonts } from '@/constants/theme';

const WORDS = [
  { text: 'Feed', color: '#8DB4FF' },
  { text: 'Print', color: '#FFD98A' },
  { text: 'Events', color: '#FF8FA3' },
  { text: 'Stay', color: '#9BE7C4' },
  { text: 'Learn', color: '#D9A0FF' },
  { text: 'Ruxstar', color: '#FFFFFF' },
] as const;

const WORD_MS = 1000;
const LAST = WORDS.length - 1;

/** "✦ Events ✦" caption that steps through each word once and settles on "Ruxstar". */
export function HeroCaption() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => {
      setIndex((i) => {
        if (i + 1 >= LAST) clearInterval(id);
        return i + 1;
      });
    }, WORD_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const word = WORDS[reduceMotion ? LAST : index];

  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <Animated.View
        key={word.text}
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(250)}
        style={styles.row}
      >
        <Text style={styles.sparkle}>✦</Text>
        <Text style={[styles.word, { color: word.color }]}>{word.text}</Text>
        <Text style={styles.sparkle}>✦</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 28 },
  word: { fontFamily: Fonts.semibold, fontSize: 16, letterSpacing: 0.5 },
  sparkle: { color: Brand.text, fontSize: 12 },
});
