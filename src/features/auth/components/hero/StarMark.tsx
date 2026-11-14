import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';
import { CYAN_HALF, STAR_PATH, YELLOW_HALF } from '@/features/auth/lib/hero-geometry';
import { segment } from '@/features/auth/lib/hero-timeline';

/** Stroke in the fill colour rounds the star's corners. */
const CORNER_STROKE = 0.2;
const VIEW_BOX = '-1.3 -1.3 2.6 2.6';
/** Slice of the intro clock in which the halves fly in, and the moment the flash fires. */
const FLY_START = 0.1;
const FLY_END = 0.4;

interface HalfProps {
  size: number;
  id: string;
  clip: string;
  from: string;
  to: string;
}

function Half({ size, id, clip, from, to }: HalfProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <Defs>
        <LinearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
        <ClipPath id={`${id}-clip`}>
          <Polygon points={clip} />
        </ClipPath>
      </Defs>
      <Path
        d={STAR_PATH}
        fill={`url(#${id}-fill)`}
        stroke={`url(#${id}-fill)`}
        strokeWidth={CORNER_STROKE}
        strokeLinejoin="round"
        clipPath={`url(#${id}-clip)`}
      />
    </Svg>
  );
}

interface StarMarkProps {
  size: number;
  intro: SharedValue<number>;
  /** Slow breathing offset (-1…1) shared with the rest of the scene. */
  float: SharedValue<number>;
}

/** The logo: two halves slide in from opposite corners, snap together with a flash, then the star floats. */
export function StarMark({ size, intro, float }: StarMarkProps) {
  const travel = size * 0.55;

  const yellow = useAnimatedStyle(() => {
    const t = segment(intro.value, FLY_START, FLY_END, Easing.out(Easing.back(1.6)));
    return {
      opacity: Math.min(1, t * 3),
      transform: [{ translateX: -travel * (1 - t) }, { translateY: -travel * 0.6 * (1 - t) }, { rotate: `${-35 * (1 - t)}deg` }],
    };
  });

  const cyan = useAnimatedStyle(() => {
    const t = segment(intro.value, FLY_START, FLY_END, Easing.out(Easing.back(1.6)));
    return {
      opacity: Math.min(1, t * 3),
      transform: [{ translateX: travel * (1 - t) }, { translateY: travel * 0.6 * (1 - t) }, { rotate: `${35 * (1 - t)}deg` }],
    };
  });

  const flash = useAnimatedStyle(() => {
    const t = segment(intro.value, FLY_END - 0.04, FLY_END + 0.12, Easing.linear);
    return { opacity: Math.sin(t * Math.PI) * 0.9, transform: [{ scale: 0.6 + t * 1.1 }] };
  });

  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: float.value * size * 0.018 }] }));

  return (
    <Animated.View style={[{ width: size, height: size }, bob]} pointerEvents="none">
      <Animated.View style={[styles.layer, yellow]}>
        <Half size={size} id="star-yellow" clip={YELLOW_HALF} from="#FFE066" to="#FFB000" />
      </Animated.View>
      <Animated.View style={[styles.layer, cyan]}>
        <Half size={size} id="star-cyan" clip={CYAN_HALF} from="#4DD2FF" to="#2B7BFF" />
      </Animated.View>
      <Animated.View style={[styles.flash, { width: size * 1.1, height: size * 1.1, borderRadius: size }, flash]}>
        <View style={styles.flashCore} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill },
  flash: { position: 'absolute', alignSelf: 'center', top: '-5%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  flashCore: { width: '45%', height: '45%', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.55)' },
});
