import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { INTRO_MS, ORBIT_LAP_MS, segment } from '@/features/auth/lib/hero-timeline';
import { OrbitIcons } from './OrbitIcons';
import { Platform } from './Platform';
import { Sparks } from './Sparks';
import { StarMark } from './StarMark';

/** Stage proportions, as fractions of its width. */
export const STAGE_HEIGHT_RATIO = 0.95;
/** Where the star's centre sits inside the stage (fraction of its height). */
export const STAR_CENTRE_RATIO = 0.4;
const STAR_RATIO = 0.3;
/** How far below the star's centre the platform's centre sits (fraction of stage width). */
const PLATFORM_DROP = 0.3;
const PLATFORM_RIM_HEIGHT = 0.46 * 0.17;
const SPARK_CLOCK_MS = 5000;
const FLOAT_MS = 2600;

/**
 * The landing animation: platform lights up, the two star halves fly in and snap together, the ring
 * draws itself, the icons pop on and then orbit while the star floats. One intro clock drives it all.
 */
export function HeroScene({ width }: { width: number }) {
  const reduceMotion = useReducedMotion();
  const height = width * STAGE_HEIGHT_RATIO;
  const starSize = width * STAR_RATIO;
  const starCentre = height * STAR_CENTRE_RATIO;

  const intro = useSharedValue(reduceMotion ? 1 : 0);
  const spin = useSharedValue(0);
  const float = useSharedValue(reduceMotion ? 0 : -1);
  const clock = useSharedValue(0.3);

  useEffect(() => {
    if (reduceMotion) return;
    intro.value = withTiming(1, { duration: INTRO_MS, easing: Easing.linear });
    spin.value = withDelay(INTRO_MS * 0.7, withRepeat(withTiming(2 * Math.PI, { duration: ORBIT_LAP_MS, easing: Easing.linear }), -1));
    float.value = withRepeat(withTiming(1, { duration: FLOAT_MS, easing: Easing.inOut(Easing.sin) }), -1, true);
    clock.value = withRepeat(withTiming(1.3, { duration: SPARK_CLOCK_MS, easing: Easing.linear }), -1);
  }, [reduceMotion, intro, spin, float, clock]);

  const glow = useAnimatedStyle(() => ({ opacity: segment(intro.value, 0.3, 0.55) * (0.8 + float.value * 0.2) }));

  return (
    <View style={{ width, height }} pointerEvents="none">
      <View style={[styles.layer, { top: starCentre + width * PLATFORM_DROP - width * PLATFORM_RIM_HEIGHT - 2 }]}>
        <Platform width={width} intro={intro} float={float} />
      </View>

      <Animated.View style={[styles.layer, { top: starCentre - width / 2, height: width }, glow]}>
        <Svg width={width} height={width}>
          <Defs>
            <RadialGradient id="star-glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#7C3AED" stopOpacity="0.45" />
              <Stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={width / 2} cy={width / 2} r={width * 0.4} fill="url(#star-glow)" />
        </Svg>
      </Animated.View>

      <View style={[styles.layer, { top: starCentre - width / 2, height: width, alignItems: 'center', justifyContent: 'center' }]}>
        <OrbitIcons size={width} intro={intro} spin={spin}>
          <StarMark size={starSize} intro={intro} float={float} />
        </OrbitIcons>
      </View>

      <Sparks width={width} height={height} clock={clock} intro={intro} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0 },
});
