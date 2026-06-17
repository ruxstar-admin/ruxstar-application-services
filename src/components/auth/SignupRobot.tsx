/**
 * SignupRobot — mirrors web signup-mascot.tsx
 *
 * Bubble messages:
 *   step 0  → "Hey! Drop your mobile and I'll send a magic code!"
 *   step 1  → "Psst… check your phone. Type the OTP before it melts!"
 *   step 2  → "Pick your superpower & a password. Then we launch!"
 *   loading → "Hold on… I'm on it!"
 *   error   → red bubble
 *
 * Face:  smile | frown (error) | thinking dot (loading)
 * Body:  step 0 = arm waves + phone(SMS) · step 1 = phone vibrates + OTP blink
 *        step 2 = role prop (bag / shop / scooter) · shake on error
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

type Role = 'customer' | 'vendor' | 'delivery' | string;

interface SignupRobotProps {
  step:    number;
  role:    Role;
  loading: boolean;
  shake:   boolean;
  error:   string;
  size?:   'sm' | 'md';
}

const LINES = [
  "Hey! Drop your mobile and I'll send a magic code!",
  "Psst… check your phone. Type the OTP before it melts!",
  "Pick your superpower & a password. Then we launch!",
];

export function SignupRobot({
  step, role, loading, shake, error, size = 'sm',
}: SignupRobotProps) {
  const dim    = size === 'sm' ? 160 : 200;
  const height = Math.round(dim * (260 / 220));

  const isError    = !!error && !loading;
  const bubbleText = loading ? "Hold on… I'm on it!" : error || LINES[step] || LINES[0];

  // ── Float ─────────────────────────────────────────────────────────────────
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

  // ── Shake ─────────────────────────────────────────────────────────────────
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

  // ── Left arm wave (step 0) — plain state, no animated SVG prop ────────────
  const [waveAngle, setWaveAngle] = useState(0);
  const waveT = useRef(0);

  useEffect(() => {
    if (step === 0) {
      waveT.current = 0;
      const id = setInterval(() => {
        waveT.current += 50;
        setWaveAngle(-9 + 9 * Math.cos((waveT.current / 600) * Math.PI));
      }, 50);
      return () => clearInterval(id);
    } else {
      setWaveAngle(0);
    }
  }, [step]);

  // ── OTP blink (step 1) — plain state ─────────────────────────────────────
  const [blinkOpacity, setBlinkOpacity] = useState(0.3);
  const blinkT = useRef(0);

  useEffect(() => {
    if (step === 1) {
      blinkT.current = 0;
      const id = setInterval(() => {
        blinkT.current += 50;
        setBlinkOpacity(0.65 + 0.35 * Math.sin((blinkT.current / 500) * Math.PI));
      }, 50);
      return () => clearInterval(id);
    } else {
      setBlinkOpacity(0.3);
    }
  }, [step]);

  // ── Antenna blink — plain state ───────────────────────────────────────────
  const [antOpacity, setAntOpacity] = useState(0.6);
  const antT = useRef(0);

  useEffect(() => {
    antT.current = 0;
    const id = setInterval(() => {
      antT.current += 50;
      setAntOpacity(0.8 + 0.2 * Math.sin((antT.current / 1000) * Math.PI));
    }, 50);
    return () => clearInterval(id);
  }, []);

  // ── Orbit dot (step 1) — rotating View around robot center ───────────────
  const orbitAngle = useSharedValue(0);
  useEffect(() => {
    if (step === 1) {
      orbitAngle.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }), -1,
      );
    } else {
      orbitAngle.value = 0;
    }
  }, [step]);
  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitAngle.value}deg` }],
  }));

  return (
    <View style={s.wrap}>
      {/* ── Speech bubble ─────────────────────────────────────────────── */}
      <View key={`bubble-${step}-${isError ? 'e' : 'ok'}`}
        style={[s.bubble, isError && s.bubbleError]}>
        <Text style={[s.bubbleText, isError && s.bubbleTextError]}>
          {bubbleText}
        </Text>
      </View>

      {/* ── Robot + orbit layer ───────────────────────────────────────── */}
      <Animated.View style={[floatStyle, shakeStyle, { alignItems: 'center' }]}>

        {step === 1 && (
          <Animated.View style={[s.orbitWrap, orbitStyle]}>
            <View style={s.orbitDot} />
          </Animated.View>
        )}

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
            fill="url(#signupBodyGrad)" stroke="rgba(0,0,0,0.10)" strokeWidth="2" />
          <Ellipse cx="98" cy="165" rx="22" ry="28" fill="rgba(0,0,0,0.06)" />

          {/* role props — step 2 */}
          {step === 2 && role === 'customer' && (
            <G>
              <Rect x="158" y="130" width="28" height="32" rx="4"
                fill="#a1a1aa" stroke="#fff" strokeWidth="1.5" opacity="0.9" />
              <Path d="M158 130 L172 118 L186 130" fill="none" stroke="#fff" strokeWidth="1.5" />
            </G>
          )}
          {step === 2 && role === 'vendor' && (
            <G>
              <Path d="M150 108 L110 88 L70 108 L70 125 L150 125 Z"
                fill="#71717a" stroke="#fff" strokeWidth="1.5" />
              <Rect x="78" y="112" width="64" height="8" rx="2" fill="#fff" opacity="0.5" />
              <SvgText x="110" y="120" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="bold">
                SHOP
              </SvgText>
            </G>
          )}

          {/* hat */}
          <Ellipse cx="110" cy="98" rx="54" ry="10"
            fill="#27272a" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" />
          <Path d="M62 98 Q110 48 158 98 Z"
            fill="#3f3f46" stroke="rgba(0,0,0,0.10)" strokeWidth="1.5" />
          <Defs><Path id="sHatCurve" d="M74 96 Q110 76 146 96" /></Defs>
          <SvgText fill="#fafafa" fontSize="10" fontWeight="bold">
            <TextPath href="#sHatCurve" startOffset="50%" textAnchor="middle">
              Ruxstar
            </TextPath>
          </SvgText>

          {/* left arm — plain string transform from state */}
          <G transform={`rotate(${waveAngle}, 58, 145)`}>
            <Path d="M58 145 Q35 130 28 105"
              stroke="#e4e4e7" strokeWidth="7" fill="none" strokeLinecap="round" />
            <Circle cx="26" cy="100" r="10"
              fill="#d4d4d8" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
          </G>

          {/* right arm */}
          <G>
            <Path d="M162 145 Q185 135 192 115"
              stroke="#e4e4e7" strokeWidth="7" fill="none" strokeLinecap="round" />
            {step <= 1 ? (
              <G>
                <Rect x="183" y="88" width="26" height="42" rx="5"
                  fill="#27272a" stroke="#fff" strokeWidth="1.5" />
                <Rect x="187" y="94" width="18" height="28" rx="2" fill="#52525b" />
                {step === 1 ? (
                  <>
                    <SvgText x="196" y="108" textAnchor="middle"
                      fill="#fbbf24" fontSize="8" fontWeight="bold"
                      opacity={blinkOpacity}>*</SvgText>
                    <SvgText x="196" y="118" textAnchor="middle"
                      fill="#fbbf24" fontSize="8" fontWeight="bold"
                      opacity={blinkOpacity}>*</SvgText>
                    <SvgText x="196" y="128" textAnchor="middle"
                      fill="#fbbf24" fontSize="8" fontWeight="bold"
                      opacity={blinkOpacity}>*</SvgText>
                  </>
                ) : (
                  <SvgText x="196" y="112" textAnchor="middle"
                    fill="#86efac" fontSize="6">SMS</SvgText>
                )}
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

          {/* antenna */}
          <Path d="M110 88 Q105 70 98 58"
            stroke="#e4e4e7" strokeWidth="4" fill="none" strokeLinecap="round" />
          <Circle cx="96" cy="54" r="6" fill="#fafafa" opacity={antOpacity} />

          <Defs>
            <RadialGradient id="signupBodyGrad" cx="40%" cy="35%" r="65%">
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

  orbitWrap: {
    position: 'absolute',
    width: 96,
    height: 96,
    top: -14,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 2,
  },
  orbitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fbbf24',
  },
});
