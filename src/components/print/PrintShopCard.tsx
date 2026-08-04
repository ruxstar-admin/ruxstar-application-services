/**
 * PrintShopCard — theme-aware tappable card for a print shop in the picker list.
 */

import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PrintShop } from '@/types/print';

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// ─── Card ─────────────────────────────────────────────────────────────────────

interface Props {
  shop:   PrintShop;
  onPick: (shop: PrintShop) => void;
}

export function PrintShopCard({ shop, onPick }: Props) {
  const { brand } = useTheme();
  const closed   = !shop.acceptingOrders;
  const perLabel = shop.pricingModel === 'per_page' ? '/page' : '/unit';

  return (
    <Pressable
      style={({ pressed }) => [
        s.card,
        { backgroundColor: brand.surface1, borderColor: brand.border1 },
        closed  && s.cardClosed,
        pressed && !closed && s.cardPressed,
      ]}
      onPress={() => { if (!closed) onPick(shop); }}
      disabled={closed}
      accessibilityRole="button"
      accessibilityLabel={shop.name}
    >
      {/* Top row */}
      <View style={s.topRow}>
        <View style={[s.thumbnailWrap, { backgroundColor: brand.surface2, borderColor: brand.border1 }]}>
          {shop.thumbnailUrl ? (
            <Image source={{ uri: shop.thumbnailUrl }} style={s.thumbnail} resizeMode="cover" />
          ) : (
            <Text style={s.thumbnailEmoji}>🖨️</Text>
          )}
        </View>

        <View style={s.meta}>
          <View style={s.nameRow}>
            <Text style={[s.name, { color: closed ? brand.creamMuted : brand.cream }]} numberOfLines={1}>
              {shop.name}
            </Text>
            {closed && (
              <View style={[s.closedBadge, { backgroundColor: brand.surface2, borderColor: brand.border2 }]}>
                <Text style={[s.closedBadgeText, { color: brand.creamSub }]}>Closed</Text>
              </View>
            )}
          </View>
          <Text style={[s.cityLine, { color: brand.creamSub }]} numberOfLines={1}>
            {[
              shop.city,
              shop.turnaroundDays > 0 ? `~${shop.turnaroundDays}d turnaround` : 'Fast turnaround',
            ].filter(Boolean).join(' · ')}
          </Text>
          {shop.minQuantity > 1 && (
            <Text style={[s.minQty, { color: brand.creamMuted }]}>Min {shop.minQuantity} pcs</Text>
          )}
        </View>
      </View>

      {/* Bottom row */}
      <View style={[s.bottomRow, { borderTopColor: brand.border1 }]}>
        <View>
          <Text style={[s.fromLabel, { color: brand.creamMuted }]}>Starting from</Text>
          <View style={s.priceRow}>
            <Text style={[s.price, { color: closed ? brand.creamMuted : brand.success }]}>
              {money(shop.fromPrice)}
            </Text>
            <Text style={[s.perLabel, { color: brand.creamSub }]}>{perLabel}</Text>
          </View>
        </View>
        <Text style={[s.cta, { color: closed ? brand.creamMuted : brand.primary }]}>
          {closed ? 'Currently closed' : 'Configure →'}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function PrintShopCardSkeleton() {
  const { brand } = useTheme();
  return (
    <View style={[s.card, s.skeleton, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
      <View style={s.topRow}>
        <View style={[s.thumbnailWrap, { backgroundColor: brand.surface2, borderColor: brand.border1 }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ height: 14, width: '60%', backgroundColor: brand.surface2, borderRadius: Radius.sm }} />
          <View style={{ height: 11, width: '80%', backgroundColor: brand.surface2, borderRadius: Radius.sm }} />
        </View>
      </View>
      <View style={{ height: 1, marginVertical: Spacing.two, backgroundColor: brand.border1 }} />
      <View style={{ height: 18, width: '40%', backgroundColor: brand.surface2, borderRadius: Radius.sm }} />
    </View>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

export function PrintShopEmptyState() {
  const { brand } = useTheme();
  return (
    <View style={[s.emptyWrap, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
      <Text style={s.emptyIcon}>🏬</Text>
      <Text style={[s.emptyTitle, { color: brand.cream }]}>No print shops found</Text>
      <Text style={[s.emptySub, { color: brand.creamSub }]}>
        No shops are available for this product in that area yet.{'\n'}Try another city or check back soon.
      </Text>
    </View>
  );
}

// ─── Styles (layout only) ─────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth:  1,
    padding:      Spacing.three,
    gap:          Spacing.two,
  },
  cardClosed:  { opacity: 0.65 },
  cardPressed: { opacity: 0.82 },
  skeleton:    { opacity: 0.6 },

  topRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two + 4 },
  thumbnailWrap: {
    width:        48,
    height:       48,
    borderRadius: Radius.sm,
    borderWidth:  1,
    alignItems:   'center',
    justifyContent: 'center',
    overflow:     'hidden',
  },
  thumbnail:      { width: 48, height: 48 },
  thumbnailEmoji: { fontSize: 22 },

  meta:    { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  name:    { fontSize: 15, fontWeight: '700', flexShrink: 1 },

  closedBadge: {
    borderRadius:      Radius.pill,
    borderWidth:       1,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  closedBadgeText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  cityLine: { fontSize: 12, marginTop: 2 },
  minQty:   { fontSize: 11, marginTop: 2 },

  bottomRow: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop:     Spacing.two,
    marginTop:      Spacing.one,
  },
  fromLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  priceRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 1 },
  price:     { fontSize: 20, fontWeight: '700' },
  perLabel:  { fontSize: 12 },
  cta:       { fontSize: 12, fontWeight: '600' },

  emptyWrap: {
    alignItems:     'center',
    justifyContent: 'center',
    padding:        Spacing.five,
    gap:            Spacing.two,
    borderRadius:   Radius.lg,
    borderWidth:    1,
  },
  emptyIcon:  { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
