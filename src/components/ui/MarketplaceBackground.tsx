/**
 * MarketplaceBackground — Animated looping marketplace video backdrop
 *
 * Renders rows of symbolic marketplace cards that drift slowly across
 * the screen — giving the feel of a looping short video background.
 * Glassmorphism panels sit on top of this layer.
 *
 * Performance notes:
 *  • useNativeDriver-compatible (transform only)
 *  • All animations use withRepeat + withTiming (linear, low CPU)
 *  • Rows pause on web for reduced motion environments
 *  • No images, no WebGL — pure RN/SVG
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Brand, Gradients, Spacing, Radius } from '@/constants/theme';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Marketplace item definitions ─────────────────────────────────────────────
// Symbolic labels only — no emojis

const ITEMS: { label: string; sublabel: string; shape: 'square' | 'circle' | 'wide' }[] = [
  { label: 'FOOD', sublabel: 'Delivery', shape: 'square' },
  { label: 'TECH', sublabel: 'Gadgets', shape: 'square' },
  { label: 'STYLE', sublabel: 'Fashion', shape: 'square' },
  { label: 'HOME', sublabel: 'Decor', shape: 'square' },
  { label: 'HEALTH', sublabel: 'Wellness', shape: 'wide' },
  { label: 'SPORT', sublabel: 'Equipment', shape: 'square' },
  { label: 'BOOKS', sublabel: 'Learning', shape: 'square' },
  { label: 'AUTO', sublabel: 'Services', shape: 'square' },
  { label: 'BEAUTY', sublabel: 'Cosmetics', shape: 'wide' },
  { label: 'PETS', sublabel: 'Supplies', shape: 'square' },
  { label: 'TRAVEL', sublabel: 'Packages', shape: 'wide' },
  { label: 'ART', sublabel: 'Craft', shape: 'circle' },
];

const CARD_W = 90;
const CARD_H = 80;
const WIDE_W = 130;
const CIRCLE_D = 80;
const GAP = 12;

// ─── Single card ───────────────────────────────────────────────────────────────

function MarketCard({ item, index }: {
  item: typeof ITEMS[number];
  index: number;
}) {
  const isCircle = item.shape === 'circle';
  const isWide = item.shape === 'wide';
  const w = isCircle ? CIRCLE_D : isWide ? WIDE_W : CARD_W;
  const h = isCircle ? CIRCLE_D : CARD_H;

  // Subtle per-card pulse
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.75, {
        duration: 2000 + index * 400,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.card,
        pulseStyle,
        {
          width: w,
          height: h,
          borderRadius: isCircle ? h / 2 : Radius.md,
        },
      ]}>
      {/* Purple accent bar */}
      <View style={[styles.cardBar, isCircle && styles.cardBarCircle]} />

      <Text style={styles.cardLabel}>{item.label}</Text>
      <Text style={styles.cardSublabel}>{item.sublabel}</Text>

      {/* Subtle dot grid indicator */}
      <View style={styles.dotRow}>
        {[0, 1, 2].map((d) => (
          <View key={d} style={styles.dot} />
        ))}
      </View>
    </Animated.View>
  );
}

// ─── Scrolling row ─────────────────────────────────────────────────────────────

interface RowProps {
  items: typeof ITEMS;
  direction: 'left' | 'right';
  speed: number; // px per cycle
  offsetY: number;
}

function ScrollRow({ items, direction, speed, offsetY }: RowProps) {
  // Duplicate items for seamless loop
  const doubled = [...items, ...items];
  const rowWidth = items.reduce((acc, item) => {
    const w = item.shape === 'circle' ? CIRCLE_D : item.shape === 'wide' ? WIDE_W : CARD_W;
    return acc + w + GAP;
  }, 0);

  const translateX = useSharedValue(direction === 'left' ? 0 : -rowWidth);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(
        direction === 'left' ? -rowWidth : 0,
        { duration: speed, easing: Easing.linear },
      ),
      -1,
      false,
    );
  }, []);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.rowContainer, { top: offsetY }]}>
      <Animated.View style={[styles.row, rowStyle]}>
        {doubled.map((item, i) => (
          <MarketCard key={`${item.label}-${i}`} item={item} index={i} />
        ))}
      </Animated.View>
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface MarketplaceBackgroundProps {
  style?: ViewStyle;
  children?: React.ReactNode;
}

// Split items into 3 rows
const ROW1 = ITEMS.slice(0, 4);
const ROW2 = ITEMS.slice(4, 8);
const ROW3 = ITEMS.slice(8, 12);

export default function MarketplaceBackground({
  style,
  children,
}: MarketplaceBackgroundProps) {
  return (
    <View style={[styles.root, style]}>
      {/* ── Dark gradient base ── */}
      <LinearGradient
        colors={Gradients.marketplace}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.2, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Scrolling marketplace rows ── */}
      <View style={styles.rowsContainer} pointerEvents="none">
        <ScrollRow items={ROW1} direction="left"  speed={28000} offsetY={SH * 0.08} />
        <ScrollRow items={ROW2} direction="right" speed={22000} offsetY={SH * 0.28} />
        <ScrollRow items={ROW3} direction="left"  speed={32000} offsetY={SH * 0.50} />
      </View>

      {/* ── Purple radial glow overlay ── */}
      <View style={styles.glowTopLeft} pointerEvents="none" />
      <View style={styles.glowBottomRight} pointerEvents="none" />

      {/* ── Subtle grid lines ── */}
      <View style={styles.gridOverlay} pointerEvents="none">
        {[0.15, 0.30, 0.45, 0.60, 0.75, 0.90].map((frac, i) => (
          <View
            key={i}
            style={[styles.gridLine, { top: `${frac * 100}%` as any }]}
          />
        ))}
        {[0.15, 0.35, 0.55, 0.75, 0.92].map((frac, i) => (
          <View
            key={i}
            style={[styles.gridLineV, { left: `${frac * 100}%` as any }]}
          />
        ))}
      </View>

      {/* ── Darkening vignette — makes glass content readable ── */}
      <LinearGradient
        colors={['rgba(8,8,15,0.0)', 'rgba(8,8,15,0.55)', 'rgba(8,8,15,0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* ── Content (glassmorphism cards go here) ── */}
      {children}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  rowsContainer: {
    ...StyleSheet.absoluteFill,
  },
  rowContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: CARD_H + 4,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
    paddingHorizontal: GAP,
  },

  // Marketplace card — glassmorphism
  card: {
    backgroundColor: Brand.glass,
    borderWidth: 1,
    borderColor: Brand.glassBorder,
    padding: Spacing.two,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    flexShrink: 0,
  },
  cardBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Brand.primary,
    opacity: 0.6,
  },
  cardBarCircle: {
    borderRadius: 1,
  },
  cardLabel: {
    color: Brand.primaryXLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  cardSublabel: {
    color: Brand.textOnDarkMuted,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Brand.primary,
    opacity: 0.5,
  },

  // Glow blobs
  glowTopLeft: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: Brand.primary,
    opacity: 0.12,
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Brand.primaryDark,
    opacity: 0.15,
  },

  // Subtle grid
  gridOverlay: {
    ...StyleSheet.absoluteFill,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(167,139,250,0.06)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(167,139,250,0.06)',
  },
});
