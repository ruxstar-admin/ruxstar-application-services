/**
 * HeroBanner — Full-width venue carousel
 * Pure RN Animated — works in Expo Go, zero extra packages.
 * Parallax cover · live-tracking dots · content fade · auto-advance
 */

import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing } from '@/constants/theme';

const { width: W } = Dimensions.get('window');
const H             = 260;
const AUTO_MS       = 4500;
const PARALLAX      = 0.22;

export interface BannerVenue {
  id:         string;
  name:       string;
  typeLabel?: string;
  address?:   string;
  price?:     string;
  coverUrl?:  string;
  emoji?:     string;
}

interface HeroBannerProps {
  venues?:  BannerVenue[];
  onPress?: (v: BannerVenue) => void;
}

// ─── Animated dot ─────────────────────────────────────────────────────────────

function Dot({ index, scrollX }: { index: number; scrollX: Animated.Value }) {
  const range = [(index - 1) * W, index * W, (index + 1) * W];
  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: scrollX.interpolate({ inputRange: range, outputRange: [6, 24, 6], extrapolate: 'clamp' }),
          opacity: scrollX.interpolate({ inputRange: range, outputRange: [0.38, 1, 0.38], extrapolate: 'clamp' }),
          backgroundColor: scrollX.interpolate({
            inputRange: range,
            outputRange: ['rgba(255,255,255,0.5)', '#F5A623', 'rgba(255,255,255,0.5)'],
            extrapolate: 'clamp',
          }),
        },
      ]}
    />
  );
}

// ─── Single slide ─────────────────────────────────────────────────────────────

function Slide({
  item, index, scrollX, onPress,
}: {
  item:    BannerVenue | 'placeholder';
  index:   number;
  scrollX: Animated.Value;
  onPress?: (v: BannerVenue) => void;
}) {
  const range = [(index - 1) * W, index * W, (index + 1) * W];

  const imgX = scrollX.interpolate({
    inputRange: range, outputRange: [-W * PARALLAX, 0, W * PARALLAX], extrapolate: 'clamp',
  });
  const contentOpacity = scrollX.interpolate({
    inputRange: range, outputRange: [0, 1, 0], extrapolate: 'clamp',
  });
  const contentY = scrollX.interpolate({
    inputRange: range, outputRange: [14, 0, 14], extrapolate: 'clamp',
  });

  if (item === 'placeholder') {
    return (
      <View style={styles.slide}>
        <LinearGradient
          colors={['#0d0221', '#1a0a3d', '#4c1d95', '#7C3AED']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={styles.placeholderIcon}>🏛️</Text>
        <Animated.View style={[styles.content, { opacity: contentOpacity, transform: [{ translateY: contentY }] }]}>
          <Text style={styles.venueName}>Top Venues Near You</Text>
          <Text style={styles.venueAddress}>Discover, book, experience</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.slide, { opacity: pressed ? 0.96 : 1 }]}
      onPress={() => onPress?.(item)}
    >
      {/* Parallax cover image */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { transform: [{ translateX: imgX }] },
        ]}
      >
        {item.coverUrl ? (
          <Image
            source={{ uri: item.coverUrl }}
            style={styles.coverImg}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={['#1a0a3d', '#4c1d95', '#7C3AED']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.coverImg, styles.fallbackCenter]}
          >
            <Text style={{ fontSize: 64 }}>{item.emoji ?? '🏛️'}</Text>
          </LinearGradient>
        )}
      </Animated.View>

      {/* Gradient overlay — heavier at bottom */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.80)']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Type badge — top left */}
      {item.typeLabel ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.typeLabel.toUpperCase()}</Text>
        </View>
      ) : null}

      {/* Animated bottom content */}
      <Animated.View
        style={[
          styles.content,
          { opacity: contentOpacity, transform: [{ translateY: contentY }] },
        ]}
      >
        <Text style={styles.venueName} numberOfLines={1}>{item.name}</Text>

        {item.address ? (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.72)" />
            <Text style={styles.venueAddress} numberOfLines={1}>{item.address}</Text>
          </View>
        ) : null}

        <View style={styles.bottomRow}>
          {item.price ? (
            <Text style={styles.price}>{item.price}</Text>
          ) : null}
          <View style={styles.explorePill}>
            <Text style={styles.exploreText}>Explore</Text>
            <Ionicons name="arrow-forward" size={12} color="#fff" />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HeroBanner({ venues = [], onPress }: HeroBannerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollX   = useRef(new Animated.Value(0)).current;
  const indexRef  = useRef(0);

  const slides: (BannerVenue | 'placeholder')[] = venues.length > 0 ? venues : ['placeholder'];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % slides.length;
      scrollRef.current?.scrollTo({ x: indexRef.current * W, animated: true });
    }, AUTO_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={1}
        decelerationRate="fast"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onMomentumScrollEnd={(e) => {
          indexRef.current = Math.round(e.nativeEvent.contentOffset.x / W);
        }}
      >
        {slides.map((item, i) => (
          <Slide key={i} item={item} index={i} scrollX={scrollX} onPress={onPress} />
        ))}
      </ScrollView>

      {/* Live dots — bottom centre */}
      {slides.length > 1 && (
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <Dot key={i} index={i} scrollX={scrollX} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const COVER_W = W + W * PARALLAX * 2;

const styles = StyleSheet.create({
  container: {
    width:        W,
    height:       H,
    overflow:     'hidden',
    marginBottom: Spacing.three,
    // NO marginHorizontal — must be full width
  },

  slide: {
    width:    W,
    height:   H,
    overflow: 'hidden',
  },

  coverImg: {
    width:  COVER_W,
    height: H,
    marginLeft: -(W * PARALLAX),
  },
  fallbackCenter: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    position:   'absolute',
    fontSize:   80,
    alignSelf:  'center',
    top:        '25%',
    opacity:    0.15,
  },

  // Type badge
  badge: {
    position:          'absolute',
    top:               Spacing.three,
    left:              Spacing.three,
    backgroundColor:   'rgba(0,0,0,0.52)',
    borderRadius:      99,
    paddingHorizontal: 10,
    paddingVertical:   3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.9 },

  // Bottom content
  content: {
    position: 'absolute',
    bottom:   Spacing.four + 6,
    left:     Spacing.three,
    right:    Spacing.three,
    gap:      4,
  },
  venueName: {
    fontSize:         22,
    fontWeight:       '800',
    color:            '#fff',
    letterSpacing:    -0.4,
    textShadowColor:  'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  venueAddress: {
    fontSize: 12,
    color:    'rgba(255,255,255,0.75)',
    flex:     1,
  },
  bottomRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:      2,
  },
  price: {
    fontSize:   15,
    fontWeight: '800',
    color:      '#F5A623',
  },
  explorePill: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius:    99,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.25)',
  },
  exploreText: {
    color:      '#fff',
    fontSize:   12,
    fontWeight: '600',
  },

  // Dots
  dots: {
    position:       'absolute',
    bottom:         10,
    left:           0,
    right:          0,
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    gap:            5,
  },
  dot: { height: 4, borderRadius: 99 },
});
