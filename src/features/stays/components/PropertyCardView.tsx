import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { Feedback } from '@/lib/haptics';
import type { PropertyCard } from '@/types/stays';
import { FOR_LABEL, KIND_LABEL, foodText, priceFromText } from '../lib/stays';

/** Facilities shown on a card; the property page lists them all. */
const CARD_FACILITIES = 3;

/** A PG or hostel on Discover: the photo, then the name, who it's for, where, food, a few facilities and the lowest price. */
export function PropertyCardView({ property, onPress }: { property: PropertyCard; onPress: () => void }) {
  const { width } = useWindowDimensions();
  const price = priceFromText(property.priceFrom);
  const full = property.priceFrom.month === null && property.priceFrom.night === null;
  const where = [property.area, property.city].filter(Boolean).join(', ');
  const who = `${KIND_LABEL[property.kind]} · ${FOR_LABEL[property.for]}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[property.name, who, where, foodText(property.food), price].join(', ')}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <ShopCover photo={property.photo ? { ...property.photo, smaller: [] } : null} name={property.name} width={width} style={styles.cover} dimmed={full} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {property.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {who}
        </Text>
        <View style={styles.facts}>
          <View style={styles.fact}>
            <Ionicons name="location-outline" size={14} color={Brand.textMuted} />
            <Text style={styles.factText} numberOfLines={1}>
              {where}
            </Text>
          </View>
          <Text style={[styles.price, full && styles.full]}>{price}</Text>
        </View>
        <View style={styles.extras}>
          <View style={styles.fact}>
            <Ionicons name="restaurant-outline" size={13} color={Brand.textFaint} />
            <Text style={styles.extra}>{foodText(property.food)}</Text>
          </View>
          {property.facilities.slice(0, CARD_FACILITIES).map((f) => (
            <Text key={f.key} style={styles.extra}>
              {f.name}
            </Text>
          ))}
          {property.facilities.length > CARD_FACILITIES ? <Text style={styles.extra}>{`+${property.facilities.length - CARD_FACILITIES} more`}</Text> : null}
        </View>
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
  full: { color: Brand.textMuted },
  extras: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three, rowGap: 4, marginTop: Spacing.one },
  extra: { ...Typography.caption, fontSize: 12, color: Brand.textFaint },
});
