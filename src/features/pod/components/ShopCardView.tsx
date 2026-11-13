import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { deliveryLine, fromLine, placeLine, readyLine } from '@/features/pod/lib/shop';
import { ratingLine, ratingShort } from '@/features/reviews/lib/review';
import { Feedback } from '@/lib/haptics';
import type { ShopCard } from '@/types/shop';

/** Open or Closed, drawn over a photo so it reads on any image. */
export function OpenPill({ open }: { open: boolean }) {
  return (
    <View style={styles.pill}>
      <View style={[styles.dot, { backgroundColor: open ? Brand.success : Brand.textFaint }]} />
      <Text style={styles.pillText}>{open ? 'Open' : 'Closed'}</Text>
    </View>
  );
}

/** A print shop on Discover: a wide photo, then name, place, price and ready time. */
export function ShopCardView({ shop, onPress }: { shop: ShopCard; onPress: () => void }) {
  const { width } = useWindowDimensions();
  const price = fromLine(shop);
  const place = placeLine(shop);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[shop.name, shop.open ? 'open' : 'closed', ratingLine(shop.rating), place, price].filter(Boolean).join(', ')}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <ShopCover photo={shop.cover} name={shop.name} width={width} style={styles.cover} dimmed={!shop.open}>
        <View style={styles.overlay}>
          <OpenPill open={shop.open} />
        </View>
      </ShopCover>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {shop.name}
          </Text>
          {price ? <Text style={styles.price}>{price}</Text> : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {[shop.typeLabel, place].filter(Boolean).join(' · ')}
        </Text>
        <View style={styles.facts}>
          <View style={styles.fact}>
            <Ionicons name="star" size={14} color={shop.rating.average === null ? Brand.textMuted : Brand.warning} />
            <Text style={styles.factText}>{ratingShort(shop.rating)}</Text>
          </View>
          <View style={styles.fact}>
            <Ionicons name="time-outline" size={14} color={Brand.textMuted} />
            <Text style={styles.factText}>{readyLine(shop.turnaroundDays)}</Text>
          </View>
          <View style={styles.fact}>
            <Ionicons name="bicycle-outline" size={14} color={Brand.textMuted} />
            <Text style={styles.factText} numberOfLines={1}>
              {deliveryLine(shop)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, overflow: 'hidden' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  cover: { width: '100%', aspectRatio: 16 / 9 },
  overlay: { position: 'absolute', top: Spacing.two, left: Spacing.two },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 26, borderRadius: Radius.pill, backgroundColor: 'rgba(13,12,18,0.72)' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { ...Typography.caption, fontSize: 12, color: Brand.text },
  body: { padding: Spacing.three, gap: Spacing.one },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { ...Typography.heading, fontSize: 17, color: Brand.text, flex: 1 },
  price: { ...Typography.bodyStrong, fontSize: 14, color: Brand.primarySoft },
  meta: { ...Typography.caption, color: Brand.textMuted },
  facts: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.one },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  factText: { ...Typography.caption, fontSize: 12, color: Brand.textMuted },
});
