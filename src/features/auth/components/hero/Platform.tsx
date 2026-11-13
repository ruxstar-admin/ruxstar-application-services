import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Rect, Stop } from 'react-native-svg';
import { segment } from '@/features/auth/lib/hero-timeline';

interface PlatformProps {
  width: number;
  intro: SharedValue<number>;
  float: SharedValue<number>;
}

const RIM_RATIO = 0.17;

/** Glowing disc under the logo with the yellow and cyan reflections the star casts on the floor. */
export function Platform({ width, intro, float }: PlatformProps) {
  const height = width * 0.5;
  const rx = width * 0.46;
  const ry = rx * RIM_RATIO;
  const cx = width / 2;
  const cy = ry + 2;

  const rise = useAnimatedStyle(() => {
    const t = segment(intro.value, 0, 0.22, Easing.out(Easing.cubic));
    return { opacity: t, transform: [{ scaleX: 0.7 + 0.3 * t }, { scaleY: 0.7 + 0.3 * t }] };
  });

  // Reflections brighten as the star lifts away from the floor and dim as it settles back.
  const reflection = useAnimatedStyle(() => {
    const t = segment(intro.value, 0.3, 0.5, Easing.linear);
    return { opacity: t * (0.75 - float.value * 0.2) };
  });

  return (
    <Animated.View style={[{ width, height }, rise]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="rim" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#B45CF2" />
            <Stop offset="0.5" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor="#7C3AED" />
          </LinearGradient>
        </Defs>
        <Ellipse cx={cx} cy={cy + ry * 0.5} rx={rx * 1.08} ry={ry * 1.5} fill="#7C3AED" opacity={0.16} />
        <Ellipse cx={cx} cy={cy + 6} rx={rx} ry={ry} fill="#0A0912" stroke="url(#rim)" strokeWidth={2} />
        <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#15122A" stroke="url(#rim)" strokeWidth={2.5} />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, reflection]}>
        <Svg width={width} height={height}>
          <Defs>
          <LinearGradient id="refl-yellow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFB000" stopOpacity="0.5" />
            <Stop offset="1" stopColor="#FFB000" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="refl-cyan" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2B7BFF" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#2B7BFF" stopOpacity="0" />
          </LinearGradient>
          </Defs>
          <Rect x={cx - rx * 0.46} y={cy + ry + 8} width={rx * 0.42} height={height - cy - ry - 8} fill="url(#refl-yellow)" />
          <Rect x={cx + rx * 0.04} y={cy + ry + 8} width={rx * 0.42} height={height - cy - ry - 8} fill="url(#refl-cyan)" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
