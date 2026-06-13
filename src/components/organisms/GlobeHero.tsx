/**
 * GlobeHero — Organism
 *
 * Combines Globe3D + GlobeParticles into a single hero section
 * with an entrance animation. Drop this at the top of the Login screen.
 *
 * Props:
 *   size          — diameter of the globe in px (default 260)
 *   showParticles — toggle the particle overlay (default true)
 *   pulseTrigger  — increment to trigger a "pulse" glow (e.g. when phone is valid)
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  FadeIn,
  SlideInUp,
} from 'react-native-reanimated';

import Globe3D from '@/components/globe/Globe3D';
import GlobeParticles from '@/components/globe/GlobeParticles';
import { Brand } from '@/constants/theme';

interface GlobeHeroProps {
  size?: number;
  showParticles?: boolean;
  /** Increment to trigger a pulse animation */
  pulseTrigger?: number;
  style?: ViewStyle;
}

export default function GlobeHero({
  size = 260,
  showParticles = true,
  pulseTrigger = 0,
  style,
}: GlobeHeroProps) {
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  // Pulse when phone becomes valid
  useEffect(() => {
    if (pulseTrigger === 0) return;
    pulseScale.value = withSequence(
      withSpring(1.04, { damping: 4, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 120 }),
    );
    glowOpacity.value = withSequence(
      withTiming(0.7, { duration: 200 }),
      withTiming(0, { duration: 600 }),
    );
  }, [pulseTrigger]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View
      entering={SlideInUp.springify().damping(18).stiffness(120)}
      style={[styles.wrapper, { width: size, height: size }, style]}>
      {/* Outer glow ring — pulses on validation */}
      <Animated.View
        style={[
          styles.outerGlow,
          {
            width: size + 40,
            height: size + 40,
            borderRadius: (size + 40) / 2,
            borderColor: Brand.accentGlow,
          },
          glowStyle,
        ]}
      />

      {/* Globe + particles */}
      <Animated.View style={[containerStyle]}>
        <Globe3D size={size} autoRotate />
        {showParticles && (
          <GlobeParticles size={size} count={16} />
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlow: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'solid',
  },
});
