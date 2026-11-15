import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { Feedback } from '@/lib/haptics';
import type { GroundCard } from '@/types/turf';
import { AMENITY, priceFromText, sportsText } from '../lib/turf';

/** Amenities shown on a card; the ground page lists them all. */
const CARD_AMENITIES = 3;

/** A ground on Discover: the photo, then the name, sports, where, a few amenities and the lowest price. */
export function GroundCardView({ ground, onPress }: { ground: GroundCard; onPress: () => void }) {
  const { width } = useWindowDimensions();
  const sports = sportsText(ground.sports);
  const price = priceFromText(ground.priceFrom);
  const courts = ground.courts === 1 ? '1 court' : `${ground.courts} courts`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[ground.name, sports, ground.city, courts, price].filter(Boolean).join(', ')}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <ShopCover photo={ground.photo ? { ...ground.photo, smaller: [] } : null} name={ground.name} width={width} style={styles.cover} dimmed={!ground.courts} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {ground.name}
        </Text>
        {sports ? (
          <Text style={styles.meta} numberOfLines={1}>
            {sports}
          </Text>
        ) : null}
        <View style={styles.facts}>
          <View style={styles.fact}>
            <Ionicons name="location-outline" size={14} color={Brand.textMuted} />
            <Text style={styles.factText} numberOfLines={1}>
              {`${ground.city} · ${courts}`}
            </Text>
          </View>
          <Text style={styles.price}>{price}</Text>
        </View>
        {ground.amenities.length ? (
          <View style={styles.amenities}>
            {ground.amenities.slice(0, CARD_AMENITIES).map((a) => (
              <View key={a} style={styles.fact}>
                <Ionicons name={AMENITY[a].icon} size={13} color={Brand.textFaint} />
                <Text style={styles.amenity}>{AMENITY[a].label}</Text>
              </View>
            ))}
            {ground.amenities.length > CARD_AMENITIES ? <Text style={styles.amenity}>{`+${ground.amenities.length - CARD_AMENITIES} more`}</Text> : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, overflow: 'hidden' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  cover: { width: '100%', aspectRatio: 16 / 9 },
  body: { padding: Spacing.three, gap: Spacing.one },
  title: { ...Typography.heading, fontSize: 17, lineHeight: 23, color: Brand.text },
  meta: { ...Typography.caption, color: Brand.textMuted },
  facts: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.one },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  factText: { ...Typography.caption, fontSize: 12, color: Brand.textMuted },
  price: { ...Typography.bodyStrong, fontSize: 14, color: Brand.primarySoft, marginLeft: 'auto' },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three, rowGap: 4, marginTop: Spacing.one },
  amenity: { ...Typography.caption, fontSize: 12, color: Brand.textFaint },
});
