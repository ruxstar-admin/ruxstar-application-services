import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import backdrop from '@/assets/images/Neon Orbit Star Emblem.png';

const ASPECT = 1730 / 909;
/** Share of the screen width the artwork takes; 1 = full width. */
const WIDTH_SCALE = 1;
/** Where the star's centre sits inside the artwork (fraction of its height). */
const STAR_CENTRE = 0.42;
/** Where the star's centre sits inside the hero area (fraction of its height). */
const HERO_FOCUS = 0.52;
/** Dark shadow over the artwork: heavier at the top and toward the sheet so the glow sits back. */
const SHADOW = ['rgba(13, 12, 18, 0.6)', 'rgba(13, 12, 18, 0.6)', 'rgba(13, 12, 18, 0.9)'] as const;

export interface HeroFrame {
  y: number;
  height: number;
}

/** Full-width star artwork centred on the hero area, never lower than the screen top so it runs under the status bar, under a dark shadow. */
export function HeroBackdrop({ hero }: { hero: HeroFrame }) {
  const { width } = useWindowDimensions();
  const imageWidth = width * WIDTH_SCALE;
  const imageHeight = imageWidth * ASPECT;
  const top = Math.min(0, hero.y + hero.height * HERO_FOCUS - imageHeight * STAR_CENTRE);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={backdrop}
        contentFit="contain"
        style={{ position: 'absolute', width: imageWidth, height: imageHeight, left: (width - imageWidth) / 2, top }}
      />
      <LinearGradient colors={SHADOW} style={StyleSheet.absoluteFill} />
    </View>
  );
}
