import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Brand } from '@/constants/theme';

/** Fixed sparkle spots around the logo as fractions of the stage (x, y), size in px, and twinkle phase (0–1). */
const SPARKS = [
  { x: 0.2, y: 0.18, r: 3, phase: 0 },
  { x: 0.31, y: 0.3, r: 2, phase: 0.3 },
  { x: 0.74, y: 0.2, r: 3, phase: 0.55 },
  { x: 0.83, y: 0.36, r: 2, phase: 0.8 },
  { x: 0.15, y: 0.46, r: 2, phase: 0.15 },
  { x: 0.88, y: 0.5, r: 3, phase: 0.45 },
  { x: 0.42, y: 0.1, r: 2, phase: 0.7 },
  { x: 0.6, y: 0.08, r: 2, phase: 0.25 },
] as const;

interface SparkProps {
  spark: (typeof SPARKS)[number];
  width: number;
  height: number;
  clock: SharedValue<number>;
  intro: SharedValue<number>;
}

function Spark({ spark, width, height, clock, intro }: SparkProps) {
  const style = useAnimatedStyle(() => {
    const wave = Math.sin((clock.value + spark.phase) * 2 * Math.PI);
    return {
      opacity: Math.min(1, Math.max(0, (intro.value - 0.6) / 0.3)) * (0.25 + 0.75 * Math.abs(wave)),
      transform: [{ translateY: wave * 3 }, { scale: 0.7 + 0.5 * Math.abs(wave) }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.spark,
        { left: spark.x * width, top: spark.y * height, width: spark.r * 2, height: spark.r * 2, borderRadius: spark.r },
        style,
      ]}
    />
  );
}

interface SparksProps {
  width: number;
  height: number;
  /** Repeating 0→1 clock; one full turn per twinkle cycle. */
  clock: SharedValue<number>;
  intro: SharedValue<number>;
}

/** Sparse violet specks that twinkle and drift around the logo. */
export function Sparks({ width, height, clock, intro }: SparksProps) {
  return (
    <>
      {SPARKS.map((spark, index) => (
        <Spark key={index} spark={spark} width={width} height={height} clock={clock} intro={intro} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  spark: { position: 'absolute', backgroundColor: Brand.primarySoft },
});
