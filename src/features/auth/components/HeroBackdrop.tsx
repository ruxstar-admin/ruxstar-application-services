import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image, type ImageProps } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import background from '@/assets/images/hero/background.png';
import star from '@/assets/images/hero/star.png';
import chat from '@/assets/images/hero/chat.png';
import photo from '@/assets/images/hero/photo.png';
import ticket from '@/assets/images/hero/ticket.png';
import cap from '@/assets/images/hero/cap.png';

/** The artwork is laid out in the background image's own pixels (1024 × 1536), then scaled to the screen. */
const ART_WIDTH = 1024;
const ASPECT = 1536 / 1024;
/** Where the star's centre sits inside the artwork (fraction of its height). */
const STAR_CENTRE = 700 / 1536;
/** Where the star's centre sits inside the hero area (fraction of its height). */
const HERO_FOCUS = 0.52;
/** Dark shadow over the artwork: heavier at the top and toward the sheet so the glow sits back. */
const SHADOW = ['rgba(13, 12, 18, 0.6)', 'rgba(13, 12, 18, 0.6)', 'rgba(13, 12, 18, 0.9)'] as const;

const STAR = { x: 523, y: 700, width: 320, aspect: 668 / 653 };
/** The ring painted in the background: centre, radii and tilt (right side lower). */
const RING = { x: 523, y: 710, rx: 291, ry: 112, tilt: (7 * Math.PI) / 180 };
/** Angle 0 is the ring's right end, a quarter turn is its front. */
const ICONS: { source: ImageProps['source']; width: number; aspect: number; phase: number }[] = [
  { source: cap, width: 130, aspect: 396 / 480, phase: Math.PI / 4 },
  { source: photo, width: 115, aspect: 396 / 388, phase: (3 * Math.PI) / 4 },
  { source: chat, width: 125, aspect: 380 / 397, phase: (5 * Math.PI) / 4 },
  { source: ticket, width: 130, aspect: 499 / 554, phase: (7 * Math.PI) / 4 },
];

const ORBIT_MS = 12000;

export interface HeroFrame {
  y: number;
  height: number;
}

/**
 * Star artwork centred on the hero area, under a dark shadow. The module icons travel round the star,
 * passing behind it at the back. Still under reduced motion.
 */
export function HeroBackdrop({ hero }: { hero: HeroFrame }) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const orbit = useSharedValue(0);

  const imageWidth = width;
  const imageHeight = imageWidth * ASPECT;
  const top = Math.min(0, hero.y + hero.height * HERO_FOCUS - imageHeight * STAR_CENTRE);
  const unit = imageWidth / ART_WIDTH;

  useEffect(() => {
    if (reduceMotion) return;
    orbit.value = withRepeat(withTiming(2 * Math.PI, { duration: ORBIT_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(orbit);
  }, [reduceMotion, orbit]);

  const starWidth = STAR.width * unit;
  const starHeight = starWidth * STAR.aspect;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ position: 'absolute', width: imageWidth, height: imageHeight, top }}>
        <Image source={background} contentFit="contain" style={StyleSheet.absoluteFill} />
        {ICONS.map((icon) => (
          <OrbitIcon key={`back-${icon.phase}`} {...icon} layer="back" orbit={orbit} unit={unit} />
        ))}
        <Image
          source={star}
          contentFit="contain"
          style={[
            styles.layer,
            { left: STAR.x * unit - starWidth / 2, top: STAR.y * unit - starHeight / 2, width: starWidth, height: starHeight },
          ]}
        />
        {ICONS.map((icon) => (
          <OrbitIcon key={`front-${icon.phase}`} {...icon} layer="front" orbit={orbit} unit={unit} />
        ))}
      </View>
      <LinearGradient colors={SHADOW} style={StyleSheet.absoluteFill} />
    </View>
  );
}

type OrbitIconProps = (typeof ICONS)[number] & {
  /** Each icon is drawn twice, once behind the star and once in front; only the copy on its side of the ring shows. */
  layer: 'back' | 'front';
  orbit: SharedValue<number>;
  unit: number;
};

function OrbitIcon({ source, width, aspect, phase, layer, orbit, unit }: OrbitIconProps) {
  const w = width * unit;
  const h = w * aspect;

  const style = useAnimatedStyle(() => {
    const angle = orbit.value + phase;
    const ex = RING.rx * Math.cos(angle);
    const ey = RING.ry * Math.sin(angle);
    const depth = (Math.sin(angle) + 1) / 2;
    const inFront = depth >= 0.5;
    return {
      opacity: inFront === (layer === 'front') ? 0.55 + 0.45 * depth : 0,
      transform: [
        { translateX: (ex * Math.cos(RING.tilt) - ey * Math.sin(RING.tilt)) * unit },
        { translateY: (ex * Math.sin(RING.tilt) + ey * Math.cos(RING.tilt)) * unit },
        { scale: 0.75 + 0.35 * depth },
      ],
    };
  });

  return (
    <Animated.View style={[styles.layer, { left: RING.x * unit - w / 2, top: RING.y * unit - h / 2, width: w, height: h }, style]}>
      <Image source={source} contentFit="contain" style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute' },
});
