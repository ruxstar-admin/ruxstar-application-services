import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient as TileGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Ellipse } from 'react-native-svg';
import { depthOf, ellipsePerimeter, ICON_START_ANGLES, orbitPoint } from '@/features/auth/lib/hero-geometry';
import { segment } from '@/features/auth/lib/hero-timeline';
import { Brand } from '@/constants/theme';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

type IconName = keyof typeof Ionicons.glyphMap;

/** Order matches ICON_START_ANGLES: chat, ticket, cap, photo. */
const ICONS: readonly IconName[] = ['chatbubble-ellipses-outline', 'ticket-outline', 'school-outline', 'image-outline'];

/** Where the ring starts drawing itself, and the stagger between icon pop-ins (slices of the intro clock). */
const RING_START = 0.34;
const RING_END = 0.7;
const POP_START = 0.5;
const POP_STAGGER = 0.07;
const POP_LENGTH = 0.14;
const TILE_RATIO = 0.135;
const RING_RATIO = 0.27;
const RING_FLATTEN = 0.38;

interface OrbitIconProps {
  index: number;
  size: number;
  rx: number;
  ry: number;
  intro: SharedValue<number>;
  spin: SharedValue<number>;
}

function OrbitIcon({ index, size, rx, ry, intro, spin }: OrbitIconProps) {
  const tile = size * TILE_RATIO;

  const style = useAnimatedStyle(() => {
    const angle = ICON_START_ANGLES[index] + spin.value;
    const { x, y } = orbitPoint(angle, rx, ry);
    const depth = depthOf(angle);
    const pop = segment(intro.value, POP_START + index * POP_STAGGER, POP_START + index * POP_STAGGER + POP_LENGTH, Easing.out(Easing.back(2.2)));
    return {
      opacity: Math.min(1, pop * 2) * (0.62 + 0.38 * depth),
      // Back-of-ring icons sit behind the star; front ones pass in front of it.
      zIndex: depth > 0.5 ? 3 : 1,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: pop * (0.78 + 0.3 * depth) },
        { rotate: `${Math.cos(angle) * 12}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.iconAnchor, { width: tile, height: tile, marginLeft: -tile / 2, marginTop: -tile / 2 }, style]}>
      <TileGradient
        colors={['rgba(190,120,255,0.55)', 'rgba(90,50,180,0.35)']}
        style={[styles.tile, { borderRadius: tile * 0.28 }]}
      >
        <Ionicons name={ICONS[index]} size={tile * 0.52} color={Brand.primarySoft} />
      </TileGradient>
    </Animated.View>
  );
}

interface OrbitIconsProps {
  /** The logo; rendered at the ring's centre, between the back and front icons. */
  children: ReactNode;
  size: number;
  intro: SharedValue<number>;
  spin: SharedValue<number>;
}

/** Neon orbit ring that draws itself, with four product icons that pop onto it and then circle the logo. */
export function OrbitIcons({ children, size, intro, spin }: OrbitIconsProps) {
  const rx = size * RING_RATIO;
  const ry = rx * RING_FLATTEN;
  const length = ellipsePerimeter(rx, ry);
  const box = { width: rx * 2 + 8, height: ry * 2 + 8 };

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - segment(intro.value, RING_START, RING_END, Easing.inOut(Easing.cubic))),
  }));

  return (
    <Animated.View style={styles.center} pointerEvents="none">
      <Svg {...box} style={styles.ring}>
        <AnimatedEllipse
          cx={box.width / 2}
          cy={box.height / 2}
          rx={rx}
          ry={ry}
          stroke={Brand.primary}
          strokeWidth={1.6}
          strokeOpacity={0.85}
          fill="none"
          strokeDasharray={[length, length]}
          animatedProps={ringProps}
        />
      </Svg>
      {ICONS.map((_, index) => (
        <OrbitIcon key={index} index={index} size={size} rx={rx} ry={ry} intro={intro} spin={spin} />
      ))}
      <View style={styles.centrepiece}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  centrepiece: { position: 'absolute', zIndex: 2 },
  iconAnchor: { position: 'absolute' },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217,160,255,0.5)',
  },
});
