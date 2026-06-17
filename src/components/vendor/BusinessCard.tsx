/**
 * BusinessCard
 * Displays a single vendor business entry.
 * Mirrors the web's businesses grid card.
 * Long-press reveals the Remove button.
 */

import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Alert,
} from 'react-native';
import Animated, {
  FadeIn, useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';

import { Brand, Radius, Spacing } from '@/constants/theme';
import type { VendorBusiness } from '@/types/vendor';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return '';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  business:  VendorBusiness;
  onRemove:  (id: string) => void;
  delay?:    number;
};

export default function BusinessCard({ business, onRemove, delay = 0 }: Props) {
  const [showRemove, setShowRemove] = useState(false);
  const removeOpacity = useSharedValue(0);

  const removeStyle = useAnimatedStyle(() => ({
    opacity: removeOpacity.value,
  }));

  function handleLongPress() {
    setShowRemove(true);
    removeOpacity.value = withTiming(1, { duration: 200 });
  }

  function handlePressOut() {
    removeOpacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => setShowRemove(false), 200);
  }

  function handleRemove() {
    Alert.alert(
      'Remove Business',
      `Remove "${business.name}" from your listings?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemove(business.id),
        },
      ],
    );
  }

  return (
    <Animated.View entering={FadeIn.delay(delay)}>
      <Pressable
        style={s.card}
        onLongPress={handleLongPress}
        onPressOut={handlePressOut}
        delayLongPress={350}
      >
        {/* Header row */}
        <View style={s.header}>
          <View style={s.iconCircle}>
            <Text style={s.iconText}>{business.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={s.headerText}>
            <Text style={s.name} numberOfLines={1}>{business.name}</Text>
            <View style={s.categoryPill}>
              <Text style={s.categoryText}>{business.category}</Text>
            </View>
          </View>
        </View>

        {/* Details */}
        {business.phone ? (
          <InfoRow emoji="📞" text={business.phone} />
        ) : null}
        {business.address ? (
          <InfoRow emoji="📍" text={business.address} />
        ) : null}
        {business.description ? (
          <InfoRow emoji="💬" text={business.description} lines={2} />
        ) : null}

        {/* Footer */}
        <Text style={s.date}>Added {formatDate(business.createdAt)}</Text>

        {/* Remove button — appears on long press */}
        {showRemove ? (
          <Animated.View style={[s.removeWrap, removeStyle]}>
            <Pressable style={s.removeBtn} onPress={handleRemove}>
              <Text style={s.removeText}>Remove</Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function InfoRow({ emoji, text, lines = 1 }: { emoji: string; text: string; lines?: number }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoEmoji}>{emoji}</Text>
      <Text style={s.infoText} numberOfLines={lines}>{text}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    backgroundColor: Brand.surface1,
    borderRadius:    Radius.xl,
    borderWidth:     1,
    borderColor:     Brand.border1,
    padding:         Spacing.three,
    gap:             Spacing.two,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.two,
  },
  iconCircle: {
    width:           42,
    height:          42,
    borderRadius:    21,
    backgroundColor: Brand.primaryGlow,
    borderWidth:     1,
    borderColor:     'rgba(124,58,237,0.25)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  iconText: {
    color:      Brand.primary,
    fontSize:   18,
    fontWeight: '800',
  },
  headerText: {
    flex: 1,
    gap:  4,
  },
  name: {
    color:      Brand.cream,
    fontSize:   15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  categoryPill: {
    alignSelf:         'flex-start',
    backgroundColor:   Brand.surface2,
    borderRadius:      Radius.pill,
    paddingHorizontal: 8,
    paddingVertical:   2,
  },
  categoryText: {
    color:      Brand.creamSub,
    fontSize:   11,
    fontWeight: '600',
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           6,
  },
  infoEmoji: { fontSize: 13, lineHeight: 18 },
  infoText:  { color: Brand.creamSub, fontSize: 13, flex: 1, lineHeight: 18 },

  // Footer
  date: {
    color:      Brand.creamMuted,
    fontSize:   11,
    marginTop:  2,
  },

  // Remove
  removeWrap: {
    position:   'absolute',
    top:        Spacing.two,
    right:      Spacing.two,
  },
  removeBtn: {
    backgroundColor: 'rgba(220,38,38,0.10)',
    borderRadius:    Radius.pill,
    borderWidth:     1,
    borderColor:     'rgba(220,38,38,0.25)',
    paddingHorizontal: Spacing.three,
    paddingVertical:   6,
  },
  removeText: {
    color:      Brand.error,
    fontSize:   12,
    fontWeight: '700',
  },
});
