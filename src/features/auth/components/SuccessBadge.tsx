import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Brand } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

const STAGE = 220;
const BADGE = 96;
const CHECK = 'M30 50 L43 63 L67 37';
const CHECK_LENGTH = 56;

const POP_MS = 380;
const DRAW_DELAY_MS = 180;
const DRAW_MS = 340;
/** When the check finishes drawing: the haptic, thump, ripples and sparks all start here. */
export const SUCCESS_LANDS_MS = DRAW_DELAY_MS + DRAW_MS;

const SPARKS = Array.from({ length: 8 }, (_, i) => ({
  angle: (i / 8) * 2 * Math.PI + Math.PI / 8,
  reach: i % 2 === 0 ? 92 : 78,
  size: i % 2 === 0 ? 7 : 5,
  color: i % 2 === 0 ? Brand.primarySoft : Brand.text,
}));

const AnimatedPath = Animated.createAnimatedComponent(Path);
const easeOut = Easing.out(Easing.cubic);

/** The signup success mark: the badge pops, the check draws itself, then it lands with a buzz and a burst. */
export function SuccessBadge() {
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(reduceMotion ? 1 : 0);
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  const thump = useSharedValue(1);
  const burst = useSharedValue(reduceMotion ? 1 : 0);
  const ripple = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    const haptic = setTimeout(Feedback.success, reduceMotion ? 0 : SUCCESS_LANDS_MS);
    if (!reduceMotion) {
      pop.value = withTiming(1, { duration: POP_MS, easing: Easing.out(Easing.back(1.6)) });
      draw.value = withDelay(DRAW_DELAY_MS, withTiming(1, { duration: DRAW_MS, easing: Easing.inOut(Easing.cubic) }));
      thump.value = withDelay(
        SUCCESS_LANDS_MS,
        withSequence(withTiming(1.08, { duration: 110, easing: easeOut }), withSpring(1, { damping: 12, stiffness: 220 })),
      );
      burst.value = withDelay(SUCCESS_LANDS_MS, withTiming(1, { duration: 640, easing: easeOut }));
      ripple.value = withDelay(SUCCESS_LANDS_MS, withTiming(1, { duration: 1000, easing: easeOut }));
    }
    return () => clearTimeout(haptic);
  }, [reduceMotion, pop, draw, thump, burst, ripple]);

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 2),
    transform: [{ scale: (0.4 + 0.6 * pop.value) * thump.value }],
  }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LENGTH * (1 - draw.value) }));

  return (
    <View style={styles.stage} accessible accessibilityRole="image" accessibilityLabel="Account created">
      <Ripple progress={ripple} lag={0} />
      <Ripple progress={ripple} lag={0.25} />
      {SPARKS.map((spark) => (
        <Spark key={spark.angle} progress={burst} {...spark} />
      ))}
      <Animated.View style={[styles.badge, badgeStyle]}>
        <Svg width={BADGE} height={BADGE} viewBox={`0 0 ${BADGE} ${BADGE}`}>
          <AnimatedPath
            d={CHECK}
            stroke={Brand.text}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={CHECK_LENGTH}
            animatedProps={checkProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** A soft disc that spreads out from behind the badge and fades; `lag` (0–1) starts it later. */
function Ripple({ progress, lag }: { progress: SharedValue<number>; lag: number }) {
  const style = useAnimatedStyle(() => {
    const t = (progress.value - lag) / (1 - lag);
    return { opacity: t <= 0 || t >= 1 ? 0 : 0.35 * (1 - t), transform: [{ scale: 1 + 1.1 * Math.max(0, t) }] };
  });
  return <Animated.View style={[styles.ripple, style]} />;
}

function Spark({
  progress,
  angle,
  reach,
  size,
  color,
}: {
  progress: SharedValue<number>;
  angle: number;
  reach: number;
  size: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const r = BADGE / 2 - 4 + (reach - BADGE / 2 + 4) * t;
    return {
      opacity: t >= 1 ? 0 : t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85,
      transform: [{ translateX: Math.cos(angle) * r }, { translateY: Math.sin(angle) * r }, { scale: 1 - 0.6 * t }],
    };
  });
  return (
    <Animated.View
      style={[
        styles.spark,
        { width: size, height: size, borderRadius: size / 2, marginLeft: -size / 2, marginTop: -size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  stage: {
    width: STAGE,
    height: STAGE,
    marginVertical: -(STAGE - BADGE) / 2 + 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: Brand.primary,
  },
  spark: { position: 'absolute', left: STAGE / 2, top: STAGE / 2 },
});
