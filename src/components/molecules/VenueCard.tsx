/**
 * VenueCard — Premium ecommerce-style venue card
 * variant="vertical"   — full-width listing card with shadow
 * variant="horizontal" — fixed 220px horizontal scroll card
 */

import { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import StarRating from '@/components/atoms/StarRating';
import { Radius, Spacing } from '@/constants/theme';

const GOLD   = '#F5A623';
const CARD_W = 230;

export interface VenueCardProps {
  id:           string;
  name:         string;
  typeLabel?:   string;
  address?:     string;
  price?:       string;
  coverUrl?:    string;
  rating?:      number;
  ratingCount?: number;
  emoji?:       string;
  variant?:     'vertical' | 'horizontal';
  onPress:      () => void;
  onBook?:      () => void;
}

export default function VenueCard({
  name,
  typeLabel,
  address,
  price,
  coverUrl,
  rating,
  ratingCount,
  emoji   = '🏛️',
  variant = 'vertical',
  onPress,
  onBook,
}: VenueCardProps) {
  const { brand, isDark } = useTheme();
  const [imgErr, setImgErr] = useState(false);

  const isHorizontal = variant === 'horizontal';
  const coverHeight  = isHorizontal ? 140 : 185;

  const cardShadow = isDark
    ? {
        shadowColor:   '#000',
        shadowOffset:  { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius:  8,
        elevation:     6,
      }
    : {
        shadowColor:   '#000',
        shadowOffset:  { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius:  14,
        elevation:     5,
      };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        cardShadow,
        {
          backgroundColor: brand.surface1,
          borderColor:     brand.border1,
          width:           isHorizontal ? CARD_W : undefined,
          transform:       [{ scale: pressed ? 0.975 : 1 }],
          opacity:         pressed ? 0.95 : 1,
        },
      ]}
    >
      {/* ── Cover ── */}
      <View style={[styles.coverWrap, { height: coverHeight }]}>
        {coverUrl && !imgErr ? (
          <Image
            source={{ uri: coverUrl }}
            style={styles.cover}
            resizeMode="cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <View style={[styles.fallback, { backgroundColor: brand.primaryGlow }]}>
            <Text style={styles.fallbackEmoji}>{emoji}</Text>
          </View>
        )}

        {/* Gradient overlay for badge readability + premium feel */}
        <LinearGradient
          colors={['rgba(0,0,0,0.38)', 'transparent', 'rgba(0,0,0,0.15)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* Type badge — top left */}
        {typeLabel ? (
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{typeLabel.toUpperCase()}</Text>
          </View>
        ) : null}

        {/* Rating pill — top right */}
        {rating !== undefined && (
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={10} color={GOLD} />
            <Text style={styles.ratingPillText}>{rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>
        <Text style={[styles.name, { color: brand.cream }]} numberOfLines={isHorizontal ? 2 : 1}>
          {name}
        </Text>

        {address ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={11} color={brand.creamMuted} />
            <Text style={[styles.address, { color: brand.creamSub }]} numberOfLines={1}>
              {address}
            </Text>
          </View>
        ) : null}

        {/* Footer: price + Book Now */}
        <View style={styles.footer}>
          <View>
            {rating !== undefined && !isHorizontal && (
              <StarRating rating={rating} count={ratingCount} size="sm" />
            )}
            {price ? (
              <Text style={[styles.price, { color: brand.primary }]}>{price}</Text>
            ) : null}
          </View>

          {onBook && (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onBook(); }}
              style={({ pressed }) => [
                styles.bookBtn,
                { backgroundColor: brand.primary, opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <Text style={styles.bookBtnText}>Book Now</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow:     Platform.OS === 'android' ? 'hidden' : 'visible',
    borderWidth:  1,
  },

  coverWrap: { position: 'relative', borderRadius: Radius.lg, overflow: 'hidden' },
  cover:     { width: '100%', height: '100%' },
  fallback: {
    width:          '100%',
    height:         '100%',
    alignItems:     'center',
    justifyContent: 'center',
  },
  fallbackEmoji: { fontSize: 52 },

  typeBadge: {
    position:          'absolute',
    top:               Spacing.two,
    left:              Spacing.two,
    backgroundColor:   'rgba(0,0,0,0.60)',
    borderRadius:      Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical:   3,
  },
  typeBadgeText: {
    color:         '#fff',
    fontSize:      9,
    fontWeight:    '700',
    letterSpacing: 0.8,
  },
  ratingPill: {
    position:          'absolute',
    top:               Spacing.two,
    right:             Spacing.two,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    borderRadius:      Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical:   3,
    backgroundColor:   'rgba(0,0,0,0.65)',
  },
  ratingPillText: {
    color:      '#fff',
    fontSize:   11,
    fontWeight: '700',
  },

  body: {
    padding:          Spacing.three,
    gap:              Spacing.one + 2,
    backgroundColor:  'transparent',
  },
  name: {
    fontSize:      15,
    fontWeight:    '700',
    letterSpacing: -0.1,
    lineHeight:    20,
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           3,
  },
  address: {
    fontSize: 12,
    flex:     1,
    lineHeight: 16,
  },
  footer: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:      Spacing.one,
  },
  price: {
    fontSize:   14,
    fontWeight: '800',
  },

  bookBtn: {
    borderRadius:      Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical:   Spacing.one + 4,
  },
  bookBtnText: {
    color:      '#fff',
    fontSize:   12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
