import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { ratingShort } from '@/features/reviews/lib/review';
import { Feedback } from '@/lib/haptics';
import type { StoreCard } from '@/types/store';
import { methodsText, storeTypeLabel } from '../lib/store';

/** A local shop on Discover: the photo, name, kind, where, open or closed, delivery or pickup, and the return rule. */
export function StoreCardView({ store, onPress }: { store: StoreCard; onPress: () => void }) {
  const { width } = useWindowDimensions();
  const where = [store.area, store.city].filter(Boolean).join(', ');
  const kind = storeTypeLabel(store.type);
  const how = methodsText(store);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[store.name, kind, where, store.open ? 'Open' : 'Closed', how, store.returnRule].join(', ')}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <ShopCover photo={store.photoUrl ? { url: store.photoUrl, width: 0, height: 0, smaller: [] } : null} name={store.name} width={width} style={styles.cover} dimmed={!store.open}>
        {!store.open ? (
          <View style={styles.closed}>
            <Text style={styles.closedText}>Closed now</Text>
          </View>
        ) : null}
      </ShopCover>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {store.name}
          </Text>
          <View style={styles.rating}>
            <Ionicons name="star" size={13} color={Brand.warning} />
            <Text style={styles.ratingText}>{ratingShort(store.rating)}</Text>
          </View>
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {kind}
        </Text>
        <View style={styles.fact}>
          <Ionicons name="location-outline" size={14} color={Brand.textMuted} />
          <Text style={styles.factText} numberOfLines={1}>
            {where}
          </Text>
        </View>
        <View style={styles.extras}>
          <View style={styles.fact}>
            <Ionicons name={store.delivery ? 'bicycle-outline' : 'walk-outline'} size={13} color={Brand.textFaint} />
            <Text style={styles.extra}>{how}</Text>
          </View>
          <Text style={styles.extra} numberOfLines={1}>
            {store.returnRule.split('.')[0]}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, overflow: 'hidden' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  cover: { width: '100%', aspectRatio: 16 / 9 },
  closed: { position: 'absolute', left: Spacing.three, top: Spacing.three, paddingHorizontal: Spacing.two, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: Brand.surface },
  closedText: { ...Typography.caption, fontSize: 12, color: Brand.text },
  body: { padding: Spacing.three, gap: Spacing.one },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  title: { ...Typography.heading, fontSize: 17, lineHeight: 23, color: Brand.text, flex: 1 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingTop: 3 },
  ratingText: { ...Typography.caption, fontSize: 12, color: Brand.textMuted },
  meta: { ...Typography.caption, color: Brand.textMuted },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  factText: { ...Typography.caption, fontSize: 12, color: Brand.textMuted },
  extras: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three, rowGap: 4, marginTop: Spacing.one },
  extra: { ...Typography.caption, fontSize: 12, color: Brand.textFaint },
});
