/**
 * Globe3D.web.tsx — Web-specific globe variant
 *
 * Uses the same react-native-svg approach as the native Globe3D but adds
 * CSS keyframe-based rotation via Reanimated's web driver for a smooth
 * 60 fps experience in browsers without WebGL requirements.
 *
 * Expo Router automatically picks this file on web over Globe3D.tsx.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Ellipse,
  Path,
  Defs,
  RadialGradient,
  Stop,
  G,
} from 'react-native-svg';

import { Brand } from '@/constants/theme';

interface Globe3DProps {
  size?: number;
  style?: ViewStyle;
  autoRotate?: boolean;
}

function latitudeLine(cx: number, cy: number, r: number, latitude: number) {
  const yOffset = (latitude / 90) * r;
  const rWidth = r * Math.cos((latitude * Math.PI) / 180);
  if (rWidth < 2) return null;
  return { cx, cy: cy + yOffset, rx: rWidth, ry: rWidth * 0.28 };
}

/** Deterministic stars so SSR / hydration stay consistent */
function buildStars(size: number) {
  return Array.from({ length: 100 }, (_, i) => {
    const s = i * 2654435761;
    return {
      x: Math.abs(s % (size * 2)) / 2,
      y: Math.abs((s * 1234567) % (size * 2)) / 2,
      r: Math.abs((s % 10) / 10) * 1.4 + 0.3,
      opacity: Math.abs((s % 100) / 100) * 0.6 + 0.2,
    };
  });
}

export default function Globe3D({ size = 280, style, autoRotate = true }: Globe3DProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;

  // Primary rotation (continents layer)
  const rotation = useSharedValue(0);
  // Secondary counter-rotation (grid overlay) for parallax depth
  const rotationGrid = useSharedValue(0);

  useEffect(() => {
    if (autoRotate) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 16000, easing: Easing.linear }),
        -1,
        false,
      );
      rotationGrid.value = withRepeat(
        withTiming(-360, { duration: 32000, easing: Easing.linear }),
        -1,
        false,
      );
    }
    return () => {
      cancelAnimation(rotation);
      cancelAnimation(rotationGrid);
    };
  }, [autoRotate]);

  const continentStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 0.07}deg` }],
  }));

  const gridStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationGrid.value * 0.04}deg` }],
  }));

  const latitudes = [-60, -45, -30, -15, 0, 15, 30, 45, 60];
  const longitudes = [0, 20, 40, 60, 80, 100, 120, 140, 160];

  const stars = React.useMemo(() => buildStars(size), [size]);

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* ── Static base layer ── */}
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="wGlobeBase" cx="38%" cy="32%" r="68%">
            <Stop offset="0%" stopColor="#2068B8" stopOpacity="1" />
            <Stop offset="55%" stopColor="#0D3875" stopOpacity="1" />
            <Stop offset="100%" stopColor="#040C1E" stopOpacity="1" />
          </RadialGradient>
          <RadialGradient id="wAtmo" cx="50%" cy="50%" r="50%">
            <Stop offset="72%" stopColor="transparent" stopOpacity="0" />
            <Stop offset="88%" stopColor={Brand.accentGlow} stopOpacity="0.14" />
            <Stop offset="100%" stopColor={Brand.accentGlow} stopOpacity="0.35" />
          </RadialGradient>
          <RadialGradient id="wSheen" cx="33%" cy="26%" r="44%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
            <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="wShadow" cx="68%" cy="68%" r="58%">
            <Stop offset="50%" stopColor="transparent" stopOpacity="0" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
          </RadialGradient>
        </Defs>

        {/* Stars */}
        <G opacity={0.85}>
          {stars.map((s, i) => (
            <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.opacity} />
          ))}
        </G>

        {/* Globe base */}
        <Circle cx={cx} cy={cy} r={r} fill="url(#wGlobeBase)" />

        {/* Equator */}
        <Ellipse
          cx={cx} cy={cy} rx={r} ry={r * 0.27}
          stroke="rgba(0,212,255,0.45)" strokeWidth={1} fill="none"
        />

        {/* Sheen + shadow */}
        <Circle cx={cx} cy={cy} r={r} fill="url(#wSheen)" />
        <Circle cx={cx} cy={cy} r={r} fill="url(#wShadow)" />

        {/* Atmosphere */}
        <Circle cx={cx} cy={cy} r={r + 6} fill="url(#wAtmo)" />

        {/* Outer glow rings */}
        <Circle cx={cx} cy={cy} r={r + 10} fill="none"
          stroke={Brand.accentGlow} strokeWidth={1.5} opacity={0.28} />
        <Circle cx={cx} cy={cy} r={r + 18} fill="none"
          stroke={Brand.accentGlow} strokeWidth={0.8} opacity={0.13} />

        {/* Day/night terminator */}
        <Path
          d={`M${cx},${cy - r} A${r},${r} 0 0 1 ${cx},${cy + r}`}
          fill="rgba(0,0,0,0.2)"
        />
      </Svg>

      {/* ── Animated grid layer ── */}
      <Animated.View style={[StyleSheet.absoluteFill, gridStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {latitudes.map((lat) => {
            const info = latitudeLine(cx, cy, r, lat);
            if (!info) return null;
            return (
              <Ellipse key={`wlat-${lat}`}
                cx={info.cx} cy={info.cy}
                rx={info.rx} ry={info.ry}
                stroke={Brand.globeGrid} strokeWidth={0.7} fill="none"
              />
            );
          })}
          {longitudes.map((lng, i) => {
            const tilt = (lng / 180) * r * 0.95;
            return (
              <Ellipse key={`wlng-${i}`}
                cx={cx} cy={cy}
                rx={Math.abs(tilt) < r ? Math.sqrt(r * r - tilt * tilt) * 0.08 + 2 : 2}
                ry={r}
                stroke={Brand.globeGrid} strokeWidth={0.6} fill="none"
                translateX={tilt * 0.25}
              />
            );
          })}
        </Svg>
      </Animated.View>

      {/* ── Animated continent layer ── */}
      <Animated.View style={[StyleSheet.absoluteFill, continentStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Africa */}
          <Path
            d={`M${cx - 15},${cy - 30}
                C${cx - 5},${cy - 40} ${cx + 20},${cy - 35} ${cx + 25},${cy - 15}
                C${cx + 30},${cy + 5} ${cx + 20},${cy + 35} ${cx + 5},${cy + 50}
                C${cx - 5},${cy + 45} ${cx - 20},${cy + 30} ${cx - 25},${cy + 15}
                C${cx - 30},${cy - 2} ${cx - 25},${cy - 18} ${cx - 15},${cy - 30}Z`}
            fill={Brand.globeLand} opacity={0.88}
          />
          {/* Europe */}
          <Path
            d={`M${cx - 55},${cy - 65}
                C${cx - 40},${cy - 80} ${cx - 15},${cy - 78} ${cx - 5},${cy - 65}
                C${cx},${cy - 55} ${cx - 8},${cy - 45} ${cx - 20},${cy - 40}
                C${cx - 35},${cy - 38} ${cx - 55},${cy - 45} ${cx - 60},${cy - 55}
                C${cx - 62},${cy - 60} ${cx - 60},${cy - 65} ${cx - 55},${cy - 65}Z`}
            fill={Brand.globeLand} opacity={0.82}
          />
          {/* Asia */}
          <Path
            d={`M${cx + 20},${cy - 80}
                C${cx + 55},${cy - 85} ${cx + 95},${cy - 70} ${cx + 100},${cy - 45}
                C${cx + 105},${cy - 20} ${cx + 90},${cy + 5} ${cx + 65},${cy + 10}
                C${cx + 40},${cy + 15} ${cx + 20},${cy - 5} ${cx + 10},${cy - 25}
                C${cx + 5},${cy - 50} ${cx + 10},${cy - 72} ${cx + 20},${cy - 80}Z`}
            fill={Brand.globeLand} opacity={0.82}
          />
          {/* North America */}
          <Path
            d={`M${cx - 90},${cy - 75}
                C${cx - 70},${cy - 90} ${cx - 45},${cy - 85} ${cx - 40},${cy - 65}
                C${cx - 35},${cy - 45} ${cx - 45},${cy - 20} ${cx - 60},${cy - 10}
                C${cx - 75},${cy} ${cx - 95},${cy - 5} ${cx - 100},${cy - 25}
                C${cx - 105},${cy - 48} ${cx - 105},${cy - 65} ${cx - 90},${cy - 75}Z`}
            fill={Brand.globeLand} opacity={0.77}
          />
          {/* South America */}
          <Path
            d={`M${cx - 65},${cy + 15}
                C${cx - 50},${cy + 10} ${cx - 38},${cy + 18} ${cx - 35},${cy + 35}
                C${cx - 32},${cy + 55} ${cx - 42},${cy + 80} ${cx - 58},${cy + 85}
                C${cx - 70},${cy + 88} ${cx - 78},${cy + 70} ${cx - 78},${cy + 50}
                C${cx - 78},${cy + 30} ${cx - 72},${cy + 18} ${cx - 65},${cy + 15}Z`}
            fill={Brand.globeLand} opacity={0.77}
          />
          {/* Australia */}
          <Path
            d={`M${cx + 60},${cy + 20}
                C${cx + 80},${cy + 15} ${cx + 100},${cy + 25} ${cx + 100},${cy + 40}
                C${cx + 100},${cy + 58} ${cx + 85},${cy + 68} ${cx + 65},${cy + 65}
                C${cx + 48},${cy + 62} ${cx + 42},${cy + 50} ${cx + 45},${cy + 38}
                C${cx + 48},${cy + 25} ${cx + 55},${cy + 22} ${cx + 60},${cy + 20}Z`}
            fill={Brand.globeLand} opacity={0.8}
          />

          {/* City glow dots — web gets a few extra */}
          <Circle cx={cx - 20} cy={cy - 30} r={2.5} fill={Brand.accentGlow} opacity={0.6} />
          <Circle cx={cx + 40} cy={cy - 22} r={2} fill={Brand.accentGlow} opacity={0.5} />
          <Circle cx={cx + 10} cy={cy + 38} r={2.5} fill={Brand.accentGlow} opacity={0.55} />
          <Circle cx={cx - 50} cy={cy + 18} r={2} fill={Brand.accentGlow} opacity={0.4} />
          <Circle cx={cx + 60} cy={cy + 28} r={2} fill={Brand.primary} opacity={0.5} />
          <Circle cx={cx - 5} cy={cy - 62} r={1.8} fill={Brand.primaryLight} opacity={0.45} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});
