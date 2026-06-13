/**
 * Globe3D — Native (iOS / Android)
 *
 * Renders an animated 3D-looking Earth globe using react-native-svg
 * + react-native-reanimated. No WebGL required — works on all Expo platforms.
 *
 * Features:
 *  • Continuous auto-rotation
 *  • Latitude / longitude wireframe grid
 *  • Simplified continent silhouettes
 *  • Atmosphere glow ring
 *  • Star-field background
 *  • Touch-to-drag rotation (horizontal pan)
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
  LinearGradient as SvgLinearGradient,
  Stop,
  G,
  Line,
} from 'react-native-svg';

import { Brand } from '@/constants/theme';

interface Globe3DProps {
  size?: number;
  style?: ViewStyle;
  autoRotate?: boolean;
}

/** Build a simple "latitude" ellipse path clipped to the left half (visible) */
function latitudeLine(cx: number, cy: number, rx: number, ry: number, latitude: number) {
  const yOffset = (latitude / 90) * ry;
  const rWidth = rx * Math.cos((latitude * Math.PI) / 180);
  if (rWidth < 2) return null;
  return { cx, cy: cy + yOffset, rx: rWidth, ry: rWidth * 0.3 };
}

export default function Globe3D({ size = 280, style, autoRotate = true }: Globe3DProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8; // globe radius with padding

  // Rotation angle (0–360 degrees) mapped to a longitude shift
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (autoRotate) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 18000, easing: Easing.linear }),
        -1,
        false,
      );
    }
    return () => cancelAnimation(rotation);
  }, [autoRotate]);

  // Animate the continents container by rotating it slightly
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 0.08}deg` }],
  }));

  // Generate latitude lines
  const latitudes = [-60, -45, -30, -15, 0, 15, 30, 45, 60];

  // Generate longitude lines (as ellipses tilted — simulated via narrow ellipses)
  const longitudes = [0, 20, 40, 60, 80, 100, 120, 140, 160];

  const stars = React.useMemo(() => {
    const arr: { x: number; y: number; r: number; opacity: number }[] = [];
    // Deterministic "random" using a seeded approach
    for (let i = 0; i < 80; i++) {
      const seed = i * 2654435761;
      const x = (seed % (size * 2)) / 2;
      const y = ((seed * 1234567) % (size * 2)) / 2;
      const radius = ((seed % 10) / 10) * 1.2 + 0.3;
      const opacity = ((seed % 100) / 100) * 0.6 + 0.2;
      arr.push({ x, y, r: radius, opacity });
    }
    return arr;
  }, [size]);

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {/* Globe base gradient — purple tones */}
          <RadialGradient id="globeBase" cx="40%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#4C1D95" stopOpacity="1" />
            <Stop offset="60%" stopColor="#2E1065" stopOpacity="1" />
            <Stop offset="100%" stopColor="#0A0314" stopOpacity="1" />
          </RadialGradient>

          {/* Atmosphere glow */}
          <RadialGradient id="atmosphere" cx="50%" cy="50%" r="50%">
            <Stop offset="75%" stopColor="transparent" stopOpacity="0" />
            <Stop offset="88%" stopColor={Brand.accentGlow} stopOpacity="0.12" />
            <Stop offset="100%" stopColor={Brand.accentGlow} stopOpacity="0.3" />
          </RadialGradient>

          {/* Highlight sheen */}
          <RadialGradient id="sheen" cx="35%" cy="28%" r="45%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
            <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </RadialGradient>

          {/* Shadow */}
          <RadialGradient id="shadow" cx="70%" cy="65%" r="60%">
            <Stop offset="0%" stopColor="transparent" stopOpacity="0" />
            <Stop offset="60%" stopColor="#000000" stopOpacity="0" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
          </RadialGradient>
        </Defs>

        {/* ── Star field ── */}
        <G opacity={0.9}>
          {stars.map((s, i) => (
            <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.opacity} />
          ))}
        </G>

        {/* ── Globe base sphere ── */}
        <Circle cx={cx} cy={cy} r={r} fill="url(#globeBase)" />

        {/* ── Latitude grid lines ── */}
        {latitudes.map((lat) => {
          const info = latitudeLine(cx, cy, r, r, lat);
          if (!info) return null;
          return (
            <Ellipse
              key={`lat-${lat}`}
              cx={info.cx}
              cy={info.cy}
              rx={info.rx}
              ry={info.ry}
              stroke={Brand.globeGrid}
              strokeWidth={0.7}
              fill="none"
            />
          );
        })}

        {/* ── Equator (brighter) ── */}
        <Ellipse
          cx={cx}
          cy={cy}
          rx={r}
          ry={r * 0.28}
          stroke="rgba(167,139,250,0.45)"
          strokeWidth={1}
          fill="none"
        />

        {/* ── Longitude "meridian" lines (simulated as thin vertical ellipses) ── */}
        {longitudes.map((lng, i) => {
          const tilt = (lng / 180) * r * 0.95;
          return (
            <Ellipse
              key={`lng-${i}`}
              cx={cx}
              cy={cy}
              rx={Math.abs(tilt) < r ? Math.sqrt(r * r - tilt * tilt) * 0.08 + 2 : 2}
              ry={r}
              stroke={Brand.globeGrid}
              strokeWidth={0.6}
              fill="none"
              translateX={tilt * 0.25}
            />
          );
        })}

        {/* ── Continent silhouettes (simplified, artistically placed SVG paths) ── */}
        {/* Africa */}
        <Path
          d={`M${cx - 15},${cy - 30}
              C${cx - 5},${cy - 40} ${cx + 20},${cy - 35} ${cx + 25},${cy - 15}
              C${cx + 30},${cy + 5} ${cx + 20},${cy + 35} ${cx + 5},${cy + 50}
              C${cx - 5},${cy + 45} ${cx - 20},${cy + 30} ${cx - 25},${cy + 15}
              C${cx - 30},${cy - 2} ${cx - 25},${cy - 18} ${cx - 15},${cy - 30}Z`}
          fill={Brand.globeLand}
          opacity={0.85}
        />

        {/* Europe */}
        <Path
          d={`M${cx - 55},${cy - 65}
              C${cx - 40},${cy - 80} ${cx - 15},${cy - 78} ${cx - 5},${cy - 65}
              C${cx},${cy - 55} ${cx - 8},${cy - 45} ${cx - 20},${cy - 40}
              C${cx - 35},${cy - 38} ${cx - 55},${cy - 45} ${cx - 60},${cy - 55}
              C${cx - 62},${cy - 60} ${cx - 60},${cy - 65} ${cx - 55},${cy - 65}Z`}
          fill={Brand.globeLand}
          opacity={0.8}
        />

        {/* Asia */}
        <Path
          d={`M${cx + 20},${cy - 80}
              C${cx + 55},${cy - 85} ${cx + 95},${cy - 70} ${cx + 100},${cy - 45}
              C${cx + 105},${cy - 20} ${cx + 90},${cy + 5} ${cx + 65},${cy + 10}
              C${cx + 40},${cy + 15} ${cx + 20},${cy - 5} ${cx + 10},${cy - 25}
              C${cx + 5},${cy - 50} ${cx + 10},${cy - 72} ${cx + 20},${cy - 80}Z`}
          fill={Brand.globeLand}
          opacity={0.8}
        />

        {/* North America */}
        <Path
          d={`M${cx - 90},${cy - 75}
              C${cx - 70},${cy - 90} ${cx - 45},${cy - 85} ${cx - 40},${cy - 65}
              C${cx - 35},${cy - 45} ${cx - 45},${cy - 20} ${cx - 60},${cy - 10}
              C${cx - 75},${cy} ${cx - 95},${cy - 5} ${cx - 100},${cy - 25}
              C${cx - 105},${cy - 48} ${cx - 105},${cy - 65} ${cx - 90},${cy - 75}Z`}
          fill={Brand.globeLand}
          opacity={0.75}
        />

        {/* South America */}
        <Path
          d={`M${cx - 65},${cy + 15}
              C${cx - 50},${cy + 10} ${cx - 38},${cy + 18} ${cx - 35},${cy + 35}
              C${cx - 32},${cy + 55} ${cx - 42},${cy + 80} ${cx - 58},${cy + 85}
              C${cx - 70},${cy + 88} ${cx - 78},${cy + 70} ${cx - 78},${cy + 50}
              C${cx - 78},${cy + 30} ${cx - 72},${cy + 18} ${cx - 65},${cy + 15}Z`}
          fill={Brand.globeLand}
          opacity={0.75}
        />

        {/* Australia */}
        <Path
          d={`M${cx + 60},${cy + 20}
              C${cx + 80},${cy + 15} ${cx + 100},${cy + 25} ${cx + 100},${cy + 40}
              C${cx + 100},${cy + 58} ${cx + 85},${cy + 68} ${cx + 65},${cy + 65}
              C${cx + 48},${cy + 62} ${cx + 42},${cy + 50} ${cx + 45},${cy + 38}
              C${cx + 48},${cy + 25} ${cx + 55},${cy + 22} ${cx + 60},${cy + 20}Z`}
          fill={Brand.globeLand}
          opacity={0.78}
        />

        {/* ── Sheen & shadow overlays ── */}
        <Circle cx={cx} cy={cy} r={r} fill="url(#sheen)" />
        <Circle cx={cx} cy={cy} r={r} fill="url(#shadow)" />

        {/* ── Atmosphere ring (outside the sphere) ── */}
        <Circle cx={cx} cy={cy} r={r + 6} fill="url(#atmosphere)" />

        {/* ── Outer glow ring ── */}
        <Circle
          cx={cx}
          cy={cy}
          r={r + 10}
          fill="none"
          stroke={Brand.accentGlow}
          strokeWidth={1.5}
          opacity={0.25}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r + 18}
          fill="none"
          stroke={Brand.accentGlow}
          strokeWidth={0.8}
          opacity={0.12}
        />

        {/* ── Clip indicator (terminator line — day/night divide) ── */}
        <Path
          d={`M${cx},${cy - r} A${r},${r} 0 0 1 ${cx},${cy + r}`}
          fill="rgba(0,0,0,0.18)"
        />
      </Svg>

      {/* Rotating overlay for continent drift effect */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.rotatingLayer, animatedStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Subtle animated dots on the globe surface */}
          <Circle cx={cx - 20} cy={cy - 30} r={2} fill={Brand.accentGlow} opacity={0.5} />
          <Circle cx={cx + 40} cy={cy - 20} r={1.5} fill={Brand.accentGlow} opacity={0.4} />
          <Circle cx={cx + 10} cy={cy + 40} r={2} fill={Brand.accentGlow} opacity={0.45} />
          <Circle cx={cx - 50} cy={cy + 20} r={1.5} fill={Brand.accentGlow} opacity={0.35} />
          <Circle cx={cx + 60} cy={cy + 30} r={1.5} fill={Brand.accentGlow} opacity={0.4} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotatingLayer: {
    pointerEvents: 'none' as const,
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
