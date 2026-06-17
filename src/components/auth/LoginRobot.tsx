/**
 * LoginRobot — mirrors web login-mascot.tsx
 *
 * Bubble messages:
 *   password mode   → "Welcome back! Pop in mobile + password."
 *   otp step 0      → "No password? I'll ping you a code."
 *   otp step 1      → "Almost in — type the OTP!"
 *   loading         → "Checking the gate…"
 *   error           → red bubble with error text
 *
 * Face:  smile | frown (error) | thinking dot (loading)
 * Body:  float always · faster float when loading · shake on error
 * Arms:  left arm waves (password / otp-step-0) · phone on right (otp-step-1)
 *
 * NOTE: SVG G transform uses plain state + setInterval to avoid the
 *       "String cannot be cast to ReadableArray" native bridge crash.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Circle, Defs, Ellipse, G, Path,
  RadialGradient, Rect, Stop,
  Text as SvgText, TextPath,
} from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface LoginRobotProps {
  mode:    'password' | 'otp';
  otpStep: number;
  loading: boolean;
  shake:   boolean;
  error:   string;
  size?:   'sm' | 'md';
}

const HINTS = {
  password:  "Welcome back! Pop in mobile + password.",
  otpSend:   "No password? I'll ping you a code.",
  otpVerify: "Almost in — type the OTP!",
  loading:   "Checking the gate…",
};

export function LoginRobot({
  mode, otpStep, loading, shake, error, size = 'sm',
}: LoginRobotProps) {
  const dim    = size === 'sm' ? 160 : 200;
  const height = Math.round(dim * (260 / 220));

  const isError   = !!error && !loading;
  const showPhone = mode === 'otp' && otpStep === 1;

  const hint =
    mode === 'password' ? HINTS.password :
    otpStep === 0       ? HINTS.otpSend  : HINTS.otpVerify;

  const bubbleText = loading ? HINTS.loading : error || hint;

  // ── Float (reanimated — outer View, no SVG props) ─────────────────────────
  const floatY     = useSharedValue(0);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: floatY.value }] }));

  useEffect(() => {
    const dur = loading ? 900 : 1900;
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: dur, easing: Easing.inOut(Easing.sin) }),
        withTiming(0,  { duration: dur, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true,
    );
  }, [loading]);

  // ── Shake (reanimated — outer View) ──────────────────────────────────────
  const shakeX     = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  useEffect(() => {
    if (shake) {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 55 }),
        withTiming(8,  { duration: 90 }),
        withTiming(-8, { duration: 90 }),
        withTiming(8,  { duration: 90 }),
        withTiming(0,  { duration: 55 }),
      );
    }
  }, [shake]);

  // ── Left arm wave — plain state + setInterval (avoids ReadableArray crash) ─
  const [waveAngle, setWaveAngle] = useState(0);
  const waveT = useRef(0);

  useEffect(() => {
    if (!showPhone) {
      waveT.current = 0;
      const id = setInterval(() => {
        waveT.current += 50;
        // sine oscillation –9 ↔ 0 deg, period ≈ 1.2 s
        setWaveAngle(-9 + 9 * Math.cos((waveT.current / 600) * Math.PI));
      }, 50);
      return () => clearInterval(id);
    } else {
      setWaveAngle(0);
    }
  }, [showPhone]);

  // ── OTP asterisk blink — plain state ─────────────────────────────────────
  const [blinkOpacity, setBlinkOpacity] = useState(0.3);
  const blinkT = useRef(0);

  useEffect(() => {
    if (showPhone) {
      blinkT.current = 0;
      const id = setInterval(() => {
        blinkT.current += 50;
        setBlinkOpacity(0.65 + 0.35 * Math.sin((blinkT.current / 500) * Math.PI));
      }, 50);
      return () => clearInterval(id);
    } else {
      setBlinkOpacity(0.3);
    }
  }, [showPhone]);

  return (
    <View style={s.wrap}>
      {/* ── Speech bubble ─────────────────────────────────────────────── */}
      <View style={[s.bubble, isError && s.bubbleError]}>
        <Text style={[s.bubbleText, isError && s.bubbleTextError]}>
          {bubbleText}
        </Text>
      </View>

      {/* ── Robot ─────────────────────────────────────────────────────── */}
      <Animated.View style={[floatStyle, shakeStyle, { alignItems: 'center' }]}>
        <Svg viewBox="0 0 220 260" width={dim} height={height}>

          <Ellipse cx="110" cy="248" rx="52" ry="8" fill="rgba(0,0,0,0.04)" />

          {/* legs */}
          <Path d="M88 200 Q78 230 72 245"
            stroke="#e4e4e7" strokeWidth="8" fill="none" strokeLinecap="round" />
          <Ellipse cx="70" cy="248" rx="14" ry="8" fill="#d4d4d8" />
          <Path d="M132 200 Q142 230 148 245"
            stroke="#e4e4e7" strokeWidth="8" fill="none" strokeLinecap="round" />
          <Ellipse cx="150" cy="248" rx="14" ry="8" fill="#d4d4d8" />

          {/* body */}
          <Ellipse cx="110" cy="155" rx="58" ry="62"
            fill="url(#loginBodyGrad)" stroke="rgba(0,0,0,0.10)" strokeWidth="2" />
          <Ellipse cx="98" cy="165" rx="22" ry="28" fill="rgba(0,0,0,0.06)" />

          {/* hat */}
          <Ellipse cx="110" cy="98" rx="54" ry="10"
            fill="#27272a" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" />
          <Path d="M62 98 Q110 48 158 98 Z"
            fill="#3f3f46" stroke="rgba(0,0,0,0.10)" strokeWidth="1.5" />
          <Defs><Path id="lHatCurve" d="M74 96 Q110 76 146 96" /></Defs>
          <SvgText fill="#fafafa" fontSize="10" fontWeight="bold">
            <TextPath href="#lHatCurve" startOffset="50%" textAnchor="middle">
              Ruxstar
            </TextPath>
          </SvgText>

          {/* left arm — plain string transform, updated via state */}
          <G transform={`rotate(${waveAngle}, 58, 145)`}>
            <Path d="M58 145 Q35 130 28 105"
              stroke="#e4e4e7" strokeWidth="7" fill="none" strokeLinecap="round" />
            <Circle cx="26" cy="100" r="10"
              fill="#d4d4d8" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
          </G>

          {/* right arm — phone or hand */}
          <G>
            <Path d="M162 145 Q185 135 192 115"
              stroke="#e4e4e7" strokeWidth="7" fill="none" strokeLinecap="round" />
            {showPhone ? (
              <G>
                <Rect x="183" y="88" width="26" height="42" rx="5"
                  fill="#27272a" stroke="#fff" strokeWidth="1.5" />
                <Rect x="187" y="94" width="18" height="28" rx="2" fill="#52525b" />
                {/* blink via opacity prop (plain number from state — no native animated cast) */}
                <SvgText x="196" y="112" textAnchor="middle"
                  fill="#fbbf24" fontSize="8" fontWeight="bold"
                  opacity={blinkOpacity}>
                  *
                </SvgText>
              </G>
            ) : (
              <Circle cx="195" cy="108" r="10"
                fill="#d4d4d8" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
            )}
          </G>

          {/* eyes */}
          <G>
            <Ellipse cx="88"  cy="138" rx="14" ry="16" fill="#18181b" />
            <Ellipse cx="132" cy="138" rx="14" ry="16" fill="#18181b" />
            <Circle cx="92"  cy="134" r="5"   fill="#fff" />
            <Circle cx="136" cy="134" r="5"   fill="#fff" />
            <Circle cx="94"  cy="135" r="2.5" fill="#18181b" />
            <Circle cx="138" cy="135" r="2.5" fill="#18181b" />
          </G>

          {/* mouth */}
          {loading ? (
            <Ellipse cx="110" cy="168" rx="8" ry="5" fill="#52525b" />
          ) : isError ? (
            <Path d="M98 172 Q110 162 122 172"
              stroke="#52525b" strokeWidth="3" fill="none" strokeLinecap="round" />
          ) : (
            <Path d="M96 165 Q110 180 124 165"
              stroke="#52525b" strokeWidth="3" fill="none" strokeLinecap="round" />
          )}

          <Defs>
            <RadialGradient id="loginBodyGrad" cx="40%" cy="35%" r="65%">
              <Stop offset="0%"   stopColor="#fafafa" />
              <Stop offset="100%" stopColor="#a1a1aa" />
            </RadialGradient>
          </Defs>

        </Svg>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center' },
  bubble: {
    maxWidth: 280,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
  },
  bubbleError: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: 'rgba(239,68,68,0.35)',
  },
  bubbleText: {
    color: 'rgba(0,0,0,0.65)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  bubbleTextError: { color: '#fecaca' },
});
