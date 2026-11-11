import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Avatar } from '@/components/ui/Avatar';
import { Fonts } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
import type { RuxstarCard as Card } from '@/types/kyc';
import { QrCode } from './QrCode';

/** ISO/IEC 7810 ID-1, the shape of a bank card. */
const RATIO = 1.586;
const FLIP = { damping: 16, stiffness: 110 };
/** A drag past this share of the card's width, or a flick, turns it over. */
const FLIP_DISTANCE = 0.3;
const FLIP_VELOCITY = 700;
const REVEAL_MS = 1100;
const FLOAT_MS = 2750;

/** Matte black with champagne accents, from the v1 card. */
const C = {
  base: '#111110',
  champagne: '#C4B49A',
  text: '#F4F4F5',
  soft: '#A1A1AA',
  muted: '#71717A',
  faint: '#52525B',
  line: 'rgba(255,255,255,0.09)',
} as const;
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const memberSince = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }).replace(' ', " '").toUpperCase();
};

/** 0 to 360, whichever way the card has been turned. */
const facing = (deg: number) => {
  'worklet';
  return ((deg % 360) + 360) % 360;
};

function Surface({ id }: { id: string }) {
  return (
    <>
      <LinearGradient colors={['#161514', C.base, '#0E0E0D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id={`${id}-warm`} cx="0%" cy="0%" rx="70%" ry="80%">
            <Stop offset="0" stopColor="#D4C4A8" stopOpacity={0.08} />
            <Stop offset="1" stopColor="#D4C4A8" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}-cool`} cx="100%" cy="100%" rx="60%" ry="70%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.045} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id}-warm)`} />
        <Rect width="100%" height="100%" fill={`url(#${id}-cool)`} />
      </Svg>
    </>
  );
}

function Chip({ s }: { s: number }) {
  return (
    <LinearGradient colors={['#2A2826', '#1E1D1B', '#161514']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.chip, { width: 38 * s, height: 28 * s, padding: 4 * s }]}>
      {[0, 1].map((row) => (
        <View key={row} style={styles.chipRow}>
          {[0, 1, 2].map((cell) => (
            <View key={cell} style={styles.chipCell} />
          ))}
        </View>
      ))}
    </LinearGradient>
  );
}

function Contactless({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8.5 8.5a5 5 0 0 1 0 7" stroke={C.faint} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M11.5 6a8 8 0 0 1 0 12" stroke={C.faint} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
      <Path d="M14.5 4a11 11 0 0 1 0 16" stroke={C.faint} strokeWidth={1.5} strokeLinecap="round" opacity={0.45} />
    </Svg>
  );
}

/**
 * The member card in the v1 style: matte black, champagne accents. It rises in on first show and floats
 * gently. A tap turns it over; a sideways drag turns it with the finger and it lands on whichever side
 * it was dragged to. The back has the profile QR code and the masked numbers, which only the owner sees.
 */
export function RuxstarCard({ card }: { card: Card }) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(340);
  const [back, setBack] = useState(false);
  const turn = useSharedValue(0);
  const start = useSharedValue(0);
  const lean = useSharedValue(0);
  const enter = useSharedValue(reduced ? 1 : 0);
  const float = useSharedValue(0);

  const height = width / RATIO;
  const s = width / 340;

  useEffect(() => {
    if (reduced) return;
    enter.value = withTiming(1, { duration: REVEAL_MS, easing: Easing.bezier(0.16, 1, 0.3, 1) });
    float.value = withDelay(
      REVEAL_MS,
      withRepeat(
        withSequence(withTiming(-7, { duration: FLOAT_MS, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: FLOAT_MS, easing: Easing.inOut(Easing.sin) })),
        -1,
      ),
    );
  }, [reduced, enter, float]);

  const landed = (deg: number) => {
    Feedback.press();
    const n = ((deg % 360) + 360) % 360;
    setBack(n > 90 && n < 270);
  };

  const flipOver = () => {
    const target = Math.round(turn.value / 180) * 180 + 180;
    turn.value = reduced ? withTiming(target, { duration: 0 }) : withSpring(target, FLIP);
    landed(target);
  };

  const tap = Gesture.Tap()
    .maxDuration(300)
    .onEnd(() => scheduleOnRN(flipOver));

  // Horizontal drags turn the card; vertical ones still scroll the page.
  const drag = Gesture.Pan()
    .enabled(!reduced)
    .activeOffsetX([-8, 8])
    .failOffsetY([-14, 14])
    .onStart(() => {
      start.value = Math.round(turn.value / 180) * 180;
    })
    .onUpdate((e) => {
      turn.value = start.value + Math.max(-180, Math.min(180, (e.translationX / width) * 180));
      lean.value = Math.max(-8, Math.min(8, (-e.translationY / height) * 20));
    })
    .onEnd((e) => {
      const moved = turn.value - start.value;
      const over = Math.abs(moved) > FLIP_DISTANCE * 180 || Math.abs(e.velocityX) > FLIP_VELOCITY;
      const direction = Math.abs(moved) > 1 ? Math.sign(moved) : Math.sign(e.velocityX);
      const target = over ? start.value + direction * 180 : start.value;
      turn.value = withSpring(target, FLIP);
      if (over) scheduleOnRN(landed, target);
    })
    .onFinalize(() => {
      lean.value = withSpring(0, FLIP);
    });

  const gesture = Gesture.Race(drag, tap);

  const stageStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { perspective: 1200 },
      { translateY: (1 - enter.value) * 34 + float.value },
      { rotateX: `${(1 - enter.value) * 28}deg` },
      { rotateY: `${(1 - enter.value) * -12}deg` },
      { scale: 0.9 + enter.value * 0.1 },
    ],
  }));

  const face = (offset: number) => () => {
    'worklet';
    const n = facing(turn.value);
    const frontShowing = n < 90 || n > 270;
    return {
      opacity: (offset === 0) === frontShowing ? 1 : 0,
      transform: [{ perspective: 1200 }, { rotateX: `${lean.value}deg` }, { rotateY: `${turn.value + offset}deg` }],
    };
  };
  const frontStyle = useAnimatedStyle(face(0));
  const backStyle = useAnimatedStyle(face(180));

  const label = (text: string, size = 8) => <Text style={[styles.label, { fontSize: size * s }]}>{text}</Text>;
  const pad = 18 * s;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.stage, { height }, stageStyle]}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          back
            ? `Back of your Ruxstar Card: profile QR code, Aadhaar ${card.aadhaar}${card.pan ? `, PAN ${card.pan}` : ''}`
            : `Ruxstar Card ${card.id}, ${card.name}, verified, member since ${memberSince(card.memberSince)}`
        }
        accessibilityHint="Turns the card over"
        onAccessibilityTap={flipOver}
      >
        <Animated.View style={[styles.face, frontStyle]}>
          <Surface id="front" />
          <View style={[styles.content, { padding: pad }]}>
            <View style={styles.row}>
              <View style={styles.brandRow}>
                <Text style={[styles.star, { fontSize: 12 * s }]}>✦</Text>
                <Text style={[styles.brand, { fontSize: 14 * s }]}>RUXSTAR</Text>
              </View>
              <View style={[styles.pill, { paddingHorizontal: 10 * s, paddingVertical: 4 * s }]}>
                <View style={[styles.dot, { width: 6 * s, height: 6 * s, borderRadius: 3 * s }]} />
                <Text style={[styles.pillText, { fontSize: 9 * s }]}>{card.vendor ? 'VERIFIED · VENDOR' : 'VERIFIED'}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.chipGroup}>
                <Chip s={s} />
                <Contactless size={18 * s} />
              </View>
              <View style={[styles.photo, { padding: 1.5 * s, borderRadius: 30 * s }]}>
                <Avatar name={card.name} uri={card.photoUrl ?? undefined} size={Math.round(42 * s)} />
              </View>
            </View>

            <Text style={[styles.number, { fontSize: 18 * s }]} numberOfLines={1} adjustsFontSizeToFit>
              {card.id.split('-').join('  ')}
            </Text>

            <View style={[styles.row, styles.bottom]}>
              <View style={styles.flex}>
                {label('Card holder')}
                <Text style={[styles.value, { fontSize: 13 * s }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {card.name.trim() ? card.name.trim().toUpperCase() : '-'}
                </Text>
              </View>
              <View style={styles.end}>
                {label('Member since')}
                <Text style={[styles.value, { fontSize: 13 * s }]}>{memberSince(card.memberSince)}</Text>
              </View>
            </View>
          </View>
          <View pointerEvents="none" style={styles.edge} />
        </Animated.View>

        <Animated.View style={[styles.face, backStyle]}>
          <Surface id="back" />
          <View style={[styles.stripe, { top: height * 0.09, height: height * 0.15 }]} />
          <View style={[styles.back, { padding: pad, gap: 14 * s }]}>
            <View style={[styles.qrTile, { padding: 4 * s, borderRadius: 10 * s }]}>
              <QrCode value={card.profileUrl} size={Math.round(height * 0.46)} label="QR code to your public profile" />
            </View>
            <View style={[styles.flex, { gap: 8 * s }]}>
              <View>
                {label('Aadhaar')}
                <Text style={[styles.small, { fontSize: 12 * s }]} numberOfLines={1} adjustsFontSizeToFit>
                  {card.aadhaar}
                </Text>
              </View>
              {card.pan ? (
                <View>
                  {label('PAN')}
                  <Text style={[styles.small, { fontSize: 12 * s }]} numberOfLines={1}>
                    {card.pan}
                  </Text>
                </View>
              ) : null}
              <Text style={[styles.label, { fontSize: 8 * s }]}>Scan to open profile</Text>
            </View>
          </View>
          <View pointerEvents="none" style={styles.edge} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const fill = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;

const styles = StyleSheet.create({
  stage: { width: '100%' },
  face: {
    ...fill,
    borderRadius: 16,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    backgroundColor: C.base,
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 20 },
    elevation: 12,
  },
  edge: { ...fill, borderRadius: 16, borderWidth: 1, borderColor: C.line },
  content: { flex: 1, justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottom: { alignItems: 'flex-end', gap: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  star: { color: C.champagne, opacity: 0.8 },
  brand: { fontFamily: Fonts.medium, letterSpacing: 3.9, color: C.text },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)' },
  dot: { backgroundColor: C.champagne, opacity: 0.7 },
  pillText: { fontFamily: Fonts.medium, letterSpacing: 1.2, color: C.champagne },
  chipGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chip: { borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', gap: 1 },
  chipRow: { flex: 1, flexDirection: 'row', gap: 1 },
  chipCell: { flex: 1, borderRadius: 1, backgroundColor: 'rgba(196,180,154,0.16)' },
  photo: { borderWidth: 1, borderColor: 'rgba(196,180,154,0.45)' },
  number: { fontFamily: MONO, letterSpacing: 2.5, color: 'rgba(196,180,154,0.9)' },
  label: { fontFamily: Fonts.medium, letterSpacing: 2, textTransform: 'uppercase', color: C.faint },
  value: { fontFamily: Fonts.medium, letterSpacing: 1, color: C.text, marginTop: 3 },
  flex: { flex: 1, minWidth: 0 },
  end: { alignItems: 'flex-end' },
  small: { fontFamily: MONO, letterSpacing: 1, color: C.soft, marginTop: 3 },
  stripe: { position: 'absolute', left: 0, right: 0, backgroundColor: '#050505' },
  back: { flex: 1, flexDirection: 'row', alignItems: 'flex-end' },
  qrTile: { backgroundColor: '#F4F1EA' },
});
