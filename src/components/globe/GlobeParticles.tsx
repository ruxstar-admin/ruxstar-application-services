/**
 * GlobeParticles — Animated floating particle overlay
 *
 * Renders a set of glowing dots that drift and pulse around the globe.
 * Mount it absolutely on top of Globe3D for the full effect.
 *
 * Usage:
 *   <View style={{ position: 'relative', width: size, height: size }}>
 *     <Globe3D size={size} />
 *     <GlobeParticles size={size} count={18} />
 *   </View>
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import { Brand } from '@/constants/theme';

// ─── Deterministic "random" helper ───────────────────────────────────────────
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// ─── Single particle ─────────────────────────────────────────────────────────

interface ParticleData {
  id: number;
  x: number;     // % of container width
  y: number;     // % of container height
  size: number;
  opacity: number;
  driftX: number; // px drift per cycle
  driftY: number;
  duration: number; // ms
  delay: number;    // ms
  color: string;
}

function buildParticles(count: number, containerSize: number): ParticleData[] {
  const colors = [
    Brand.accentGlow,
    Brand.primary,
    Brand.primaryLight,
    '#ffffff',
  ];

  return Array.from({ length: count }, (_, i) => {
    const r1 = seededRandom(i * 13);
    const r2 = seededRandom(i * 17 + 5);
    const r3 = seededRandom(i * 7 + 11);
    const r4 = seededRandom(i * 23);
    const r5 = seededRandom(i * 31 + 3);
    const r6 = seededRandom(i * 19 + 7);
    const r7 = seededRandom(i * 41);

    // Keep particles within the globe circle (rough circle mask)
    const angle = r1 * Math.PI * 2;
    const dist = (0.2 + r2 * 0.3) * containerSize * 0.5; // 20–50% of radius
    const cx = containerSize / 2 + Math.cos(angle) * dist;
    const cy = containerSize / 2 + Math.sin(angle) * dist;

    return {
      id: i,
      x: cx,
      y: cy,
      size: 1.5 + r3 * 3.5,
      opacity: 0.25 + r4 * 0.55,
      driftX: (r5 - 0.5) * 20,
      driftY: (r6 - 0.5) * 20,
      duration: 2500 + r7 * 4000,
      delay: i * 180,
      color: colors[Math.floor(r4 * colors.length)],
    };
  });
}

// ─── Particle component ───────────────────────────────────────────────────────

function Particle({ data }: { data: ParticleData }) {
  const opacity = useSharedValue(data.opacity * 0.3);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    const easing = Easing.inOut(Easing.sin);

    opacity.value = withDelay(
      data.delay,
      withRepeat(
        withSequence(
          withTiming(data.opacity, { duration: data.duration * 0.5, easing }),
          withTiming(data.opacity * 0.2, { duration: data.duration * 0.5, easing }),
        ),
        -1,
        true,
      ),
    );

    translateX.value = withDelay(
      data.delay,
      withRepeat(
        withSequence(
          withTiming(data.driftX, { duration: data.duration, easing }),
          withTiming(-data.driftX * 0.5, { duration: data.duration, easing }),
        ),
        -1,
        true,
      ),
    );

    translateY.value = withDelay(
      data.delay,
      withRepeat(
        withSequence(
          withTiming(data.driftY, { duration: data.duration * 0.8, easing }),
          withTiming(-data.driftY * 0.7, { duration: data.duration, easing }),
        ),
        -1,
        true,
      ),
    );

    scale.value = withDelay(
      data.delay,
      withRepeat(
        withSequence(
          withTiming(1.4, { duration: data.duration * 0.6, easing }),
          withTiming(0.5, { duration: data.duration * 0.8, easing }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        animStyle,
        {
          width: data.size,
          height: data.size,
          borderRadius: data.size / 2,
          backgroundColor: data.color,
          left: data.x - data.size / 2,
          top: data.y - data.size / 2,
          // Glow effect via shadow
          shadowColor: data.color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: data.size * 1.5,
        },
      ]}
    />
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

interface GlobeParticlesProps {
  size?: number;
  count?: number;
  style?: ViewStyle;
}

export default function GlobeParticles({
  size = 280,
  count = 18,
  style,
}: GlobeParticlesProps) {
  const particles = React.useMemo(
    () => buildParticles(count, size),
    [count, size],
  );

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { width: size, height: size },
        style,
      ]}
      pointerEvents="none">
      {particles.map((p) => (
        <Particle key={p.id} data={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  particle: {
    position: 'absolute',
  },
});
