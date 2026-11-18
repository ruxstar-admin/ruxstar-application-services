import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { Brand, Fonts } from '@/constants/theme';

/** The two halves of the star, the same outlines as the website's StarMark. */
const YELLOW =
  'M503.2 179.1C498.4 180.6 495.6 182.4 490.7 186.9C483.6 193.7 482.1 196.3 474.6 215.5C471.6 223.2 463.1 244.3 455.7 262.5C448.3 280.6 438.8 304.1 434.6 314.5C425.4 337.1 423.5 340.5 417.3 346C407.3 354.8 402.6 356.1 370 359C319.1 363.6 254.1 370.1 248.5 371.1C240.4 372.6 229.8 378.3 225 383.8C218.2 391.4 215.6 398 215.2 408.6C214.7 419.3 216.2 425.7 221.2 434C224.7 439.7 226.7 441.6 269 479C335 537.1 337.4 539.4 340.8 545.7C344.9 553.5 347.3 563.9 346.7 571C346.1 577 342.9 591.6 322.3 680C314.1 715 313.8 716.9 314.3 725.5C314.6 731.1 315.6 736.6 316.9 740.1C319.3 746.4 326 756.5 327.8 756.5C329 756.5 338.8 744.8 380.2 693.4C413.5 652 494.5 550.7 495.4 549.1C495.8 548.5 493.1 529.2 489.4 506.3L482.5 464.7 543.9 403.9 605.3 343.1 590.2 305.8C581.9 285.3 571.9 260.6 568 251C564 241.4 557.5 225.2 553.4 215.1C549.3 205 544.6 194.8 542.9 192.5C536.6 183.7 523.8 176.9 513.7 177.1C511.4 177.1 506.7 178 503.2 179.1';
const BLUE =
  'M588.4 416.8L525.9 478.5 526.5 485.1C526.9 488.7 529.3 507.4 531.9 526.6L536.7 561.5 521.6 580C513.4 590.2 495.8 611.8 482.6 628C469.4 644.2 455.7 661.1 452 665.5C445.7 673 379.4 755.5 372.1 764.9C368.9 768.8 368.9 769.2 371.1 768C374.5 766.2 421.3 738.4 462.5 713.6C481.8 702.1 499.9 691.8 502.9 690.8C510 688.5 519.2 688.5 526.3 690.9C529.4 692 547.7 702.7 567.7 715.3C656.2 770.7 653.7 769.4 668.5 768.8C679.8 768.3 686.6 765.4 694.9 757.5C708.5 744.6 712.7 727.5 708.1 704.9C706.4 696.9 693.9 640.5 682.8 591C679.2 574.6 678.9 565.3 681.9 555.8C685.3 545.3 689.9 539.8 712 519.9C755.3 481.2 798 441.9 800.4 438.8C804.6 433.2 809.1 422.5 810.1 415.4C812.2 400.2 805.4 384.2 793.2 375.8C783.4 369 783.3 369 699.5 360.5C674.8 358 653.7 355.8 652.7 355.6C651.4 355.3 633 372.8 588.4 416.8';
const STAR = 'translate(512 512) scale(1.07) translate(-514 -484)';
const SPARK = 'M12 0L14.6 9.4 24 12 14.6 14.6 12 24 9.4 14.6 0 12 9.4 9.4Z';

const YELLOW_FILL = '#EADC05';
const BLUE_FILL = '#33B4FA';

/** The star's box; the star itself fills about 62% of it. */
const SIZE = 220;
/** How far each half starts from its place, as on the website (140 of 1024). */
const OFFSET = (140 / 1024) * SIZE * 1.4;

const SPRING = Easing.bezier(0.47, 1.64, 0.41, 0.8);
const EASE_OUT = Easing.bezier(0.2, 0, 0, 1);

/** Timeline in ms: the halves fly in, meet with a glow and sparkles, the name rises in, then it all lifts away. */
const T = {
  halves: { at: 100, ms: 800 },
  meet: { at: 820, ms: 700 },
  name: { at: 950, ms: 450 },
  caption: { at: 1150, ms: 400 },
  leave: { at: 1850, ms: 350 },
};

/** Little stars that twinkle around the mark when the halves meet: where, how big, what colour, in what order. */
const SPARKS = [
  { x: -0.36, y: -0.3, size: 16, color: YELLOW_FILL, order: 0 },
  { x: 0.38, y: -0.2, size: 12, color: Brand.text, order: 1 },
  { x: 0.3, y: 0.36, size: 14, color: BLUE_FILL, order: 2 },
  { x: -0.3, y: 0.3, size: 10, color: Brand.text, order: 3 },
];

const Half = ({ d, fill }: { d: string; fill: string }) => (
  <Svg width={SIZE} height={SIZE} viewBox="0 0 1024 1024">
    <G transform={STAR}>
      <Path d={d} fill={fill} />
    </G>
  </Svg>
);

/** A half at `progress` 0 sits off towards its corner (`sign` -1 is top-left), tilted; at 1 it is in place. */
function halfStyle(progress: number, sign: 1 | -1, reduced: boolean) {
  'worklet';
  const away = reduced ? 0 : 1 - progress;
  return {
    opacity: Math.min(1, progress * 1.6),
    transform: [{ translateX: sign * OFFSET * away }, { translateY: sign * OFFSET * away }, { rotate: `${-10 * away}deg` }],
  };
}

function Sparkle({ meet, spark }: { meet: SharedValue<number>; spark: (typeof SPARKS)[number] }) {
  const start = 0.05 + spark.order * 0.1;
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(meet.value, [start, start + 0.25, start + 0.65], [0, 1, 0], 'clamp'),
    transform: [
      { scale: interpolate(meet.value, [start, start + 0.25, start + 0.65], [0.2, 1, 0.4], 'clamp') },
      { rotate: `${interpolate(meet.value, [start, start + 0.65], [0, 90], 'clamp')}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[styles.spark, { left: SIZE / 2 + spark.x * SIZE - spark.size / 2, top: SIZE / 2 + spark.y * SIZE - spark.size / 2 }, style]}
    >
      <Svg width={spark.size} height={spark.size} viewBox="0 0 24 24">
        <Path d={SPARK} fill={spark.color} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Shown on every app start over the first screen. The star's halves fly in from opposite corners and
 * meet with a soft glow, "ruxstar" and its line rise in underneath, then it all lifts away into the app.
 * `onShown` fires on the first layout so the native splash can hide without a blank frame.
 */
export function AnimatedSplash({ onShown, onDone }: { onShown: () => void; onDone: () => void }) {
  const reduced = useReducedMotion();
  const halves = useSharedValue(0);
  const meet = useSharedValue(0);
  const name = useSharedValue(0);
  const caption = useSharedValue(0);
  const leave = useSharedValue(0);

  useEffect(() => {
    const finish = (done?: boolean) => {
      'worklet';
      if (done) scheduleOnRN(onDone);
    };
    if (reduced) {
      halves.value = withTiming(1, { duration: 300 });
      name.value = withTiming(1, { duration: 300 });
      caption.value = withTiming(1, { duration: 300 });
      leave.value = withDelay(1100, withTiming(1, { duration: 300 }, finish));
      return;
    }
    halves.value = withDelay(T.halves.at, withTiming(1, { duration: T.halves.ms, easing: SPRING }));
    meet.value = withDelay(T.meet.at, withTiming(1, { duration: T.meet.ms, easing: EASE_OUT }));
    name.value = withDelay(T.name.at, withTiming(1, { duration: T.name.ms, easing: EASE_OUT }));
    caption.value = withDelay(T.caption.at, withTiming(1, { duration: T.caption.ms, easing: EASE_OUT }));
    leave.value = withDelay(T.leave.at, withTiming(1, { duration: T.leave.ms, easing: Easing.in(Easing.quad) }, finish));
  }, [reduced, halves, meet, name, caption, leave, onDone]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: 1 - leave.value }));
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -24 * leave.value }, { scale: 1 + 0.06 * leave.value }],
  }));
  // A small bump as the halves lock together.
  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(meet.value, [0, 0.25, 0.7], [1, 1.07, 1], 'clamp') }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(meet.value, [0, 0.2, 1], [0, 0.7, 0], 'clamp'),
    transform: [{ scale: interpolate(meet.value, [0, 1], [0.4, 1.8]) }],
  }));
  const yellowStyle = useAnimatedStyle(() => halfStyle(halves.value, -1, reduced));
  const blueStyle = useAnimatedStyle(() => halfStyle(halves.value, 1, reduced));
  const nameStyle = useAnimatedStyle(() => ({ opacity: name.value, transform: [{ translateY: 14 * (1 - name.value) }] }));
  const captionStyle = useAnimatedStyle(() => ({ opacity: caption.value, transform: [{ translateY: 10 * (1 - caption.value) }] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]} onLayout={onShown} pointerEvents="none">
      <Animated.View style={[styles.content, contentStyle]} accessible accessibilityRole="image" accessibilityLabel="Ruxstar">
        <Animated.View style={[styles.mark, markStyle]}>
          <Animated.View style={[styles.layer, glowStyle]}>
            <Svg width={SIZE} height={SIZE} viewBox="0 0 100 100">
              <Defs>
                <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.55} />
                  <Stop offset="45%" stopColor={BLUE_FILL} stopOpacity={0.25} />
                  <Stop offset="100%" stopColor={BLUE_FILL} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={50} cy={50} r={50} fill="url(#glow)" />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.layer, yellowStyle]}>
            <Half d={YELLOW} fill={YELLOW_FILL} />
          </Animated.View>
          <Animated.View style={[styles.layer, blueStyle]}>
            <Half d={BLUE} fill={BLUE_FILL} />
          </Animated.View>
          {reduced ? null : SPARKS.map((s) => <Sparkle key={s.order} meet={meet} spark={s} />)}
        </Animated.View>
        <Animated.View style={nameStyle}>
          <Text style={styles.name}>ruxstar</Text>
        </Animated.View>
        <Animated.View style={captionStyle}>
          <Text style={styles.caption}>Everything local, in one place</Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  content: { alignItems: 'center' },
  mark: { width: SIZE, height: SIZE },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  spark: { position: 'absolute' },
  name: { fontFamily: Fonts.bold, fontSize: 34, letterSpacing: 1, color: Brand.text, marginTop: -8 },
  caption: { fontFamily: Fonts.medium, fontSize: 14, letterSpacing: 0.3, color: Brand.textMuted, marginTop: 6 },
});
