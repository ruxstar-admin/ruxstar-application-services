/**
 * RobotMascot — SVG robot that reacts to finger/touch position.
 * Same character as the web frontend (login-mascot.tsx).
 *
 * Props
 *  mouseX  — normalised –1 to +1  (left/right)
 *  mouseY  — normalised –1 to +1  (up/down)
 *  size    — 'sm' | 'md'
 *
 * The parent screen feeds live touch coords here.
 * Eyes shift  : mouseX * 4 px,  mouseY * 3 px  (in SVG units)
 * Head tilts  : mouseX * 6 degrees
 * Body floats : gentle sine via react-native-reanimated (always on)
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
  TextPath,
} from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface RobotMascotProps {
  size?:   'sm' | 'md';
  mouseX?: number;   // –1 to +1, default 0
  mouseY?: number;   // –1 to +1, default 0
}

export function RobotMascot({ size = 'sm', mouseX = 0, mouseY = 0 }: RobotMascotProps) {
  const dim    = size === 'sm' ? 160 : 200;
  const height = Math.round(dim * (260 / 220));

  // ── eye offset (SVG coordinate units) ──────────────────────────────────────
  const eyeX = mouseX * 4;
  const eyeY = mouseY * 3;
  // ── head tilt (degrees) ────────────────────────────────────────────────────
  const tilt = mouseX * 6;

  // ── gentle float ───────────────────────────────────────────────────────────
  const floatY     = useSharedValue(0);
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0,  { duration: 1900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, []);

  return (
    <Animated.View style={[{ alignItems: 'center' }, floatStyle]}>
      {/* Head tilt reacts to mouseX — mirrors the web frontend */}
      <View style={{ transform: [{ rotate: `${tilt}deg` }] }}>
        <Svg viewBox="0 0 220 260" width={dim} height={height}>

          {/* ── Ground shadow ─────────────────────────────────────────────── */}
          <Ellipse cx="110" cy="248" rx="52" ry="8" fill="rgba(0,0,0,0.04)" />

          {/* ── Left leg ──────────────────────────────────────────────────── */}
          <Path d="M88 200 Q78 230 72 245"
            stroke="#e4e4e7" strokeWidth="8" fill="none" strokeLinecap="round" />
          <Ellipse cx="70" cy="248" rx="14" ry="8" fill="#d4d4d8" />

          {/* ── Right leg ─────────────────────────────────────────────────── */}
          <Path d="M132 200 Q142 230 148 245"
            stroke="#e4e4e7" strokeWidth="8" fill="none" strokeLinecap="round" />
          <Ellipse cx="150" cy="248" rx="14" ry="8" fill="#d4d4d8" />

          {/* ── Body ──────────────────────────────────────────────────────── */}
          <Ellipse cx="110" cy="155" rx="58" ry="62"
            fill="url(#bodyGrad)" stroke="rgba(0,0,0,0.10)" strokeWidth="2" />
          {/* belly shine */}
          <Ellipse cx="98" cy="165" rx="22" ry="28" fill="rgba(0,0,0,0.06)" />

          {/* ── Hat brim ──────────────────────────────────────────────────── */}
          <Ellipse cx="110" cy="98" rx="54" ry="10"
            fill="#27272a" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" />
          {/* Hat cap */}
          <Path d="M62 98 Q110 48 158 98 Z"
            fill="#3f3f46" stroke="rgba(0,0,0,0.10)" strokeWidth="1.5" />

          {/* ── "Ruxstar" curved text on hat ──────────────────────────────── */}
          <Defs>
            <Path id="hatCurve" d="M74 96 Q110 76 146 96" />
          </Defs>
          <SvgText fill="#fafafa" fontSize="10" fontWeight="bold">
            <TextPath href="#hatCurve" startOffset="50%" textAnchor="middle">
              Ruxstar
            </TextPath>
          </SvgText>

          {/* ── Left arm ──────────────────────────────────────────────────── */}
          <Path d="M58 145 Q35 130 28 105"
            stroke="#e4e4e7" strokeWidth="7" fill="none" strokeLinecap="round" />
          <Circle cx="26" cy="100" r="10"
            fill="#d4d4d8" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />

          {/* ── Right arm ─────────────────────────────────────────────────── */}
          <Path d="M162 145 Q185 135 192 115"
            stroke="#e4e4e7" strokeWidth="7" fill="none" strokeLinecap="round" />
          <Circle cx="195" cy="108" r="10"
            fill="#d4d4d8" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />

          {/* ── Eyes — shift with finger position (mirrors web mouse track) ─ */}
          <G transform={`translate(${eyeX}, ${eyeY})`}>
            {/* eye sockets */}
            <Ellipse cx="88"  cy="138" rx="14" ry="16" fill="#18181b" />
            <Ellipse cx="132" cy="138" rx="14" ry="16" fill="#18181b" />
            {/* eye whites */}
            <Circle cx="92"  cy="134" r="5"   fill="#fff" />
            <Circle cx="136" cy="134" r="5"   fill="#fff" />
            {/* pupils */}
            <Circle cx="94"  cy="135" r="2.5" fill="#18181b" />
            <Circle cx="138" cy="135" r="2.5" fill="#18181b" />
          </G>

          {/* ── Smile ─────────────────────────────────────────────────────── */}
          <Path d="M96 165 Q110 180 124 165"
            stroke="#52525b" strokeWidth="3" fill="none" strokeLinecap="round" />

          {/* ── Gradient ──────────────────────────────────────────────────── */}
          <Defs>
            <RadialGradient id="bodyGrad" cx="40%" cy="35%" r="65%">
              <Stop offset="0%"   stopColor="#fafafa" />
              <Stop offset="100%" stopColor="#a1a1aa" />
            </RadialGradient>
          </Defs>

        </Svg>
      </View>
    </Animated.View>
  );
}
