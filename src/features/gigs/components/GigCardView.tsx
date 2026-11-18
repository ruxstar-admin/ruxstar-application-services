import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { ratingLine } from '@/features/reviews/lib/review';
import { Feedback } from '@/lib/haptics';
import type { GigCard } from '@/types/gigs';
import { cardPriceLine } from '../lib/gigs';

/** A gig on Discover or a freelancer's page: the photo, the title, who and where, the rating and the starting price. */
export function GigCardView({ gig, onPress, hideFreelancer }: { gig: GigCard; onPress: () => void; hideFreelancer?: boolean }) {
  const { width } = useWindowDimensions();
  const rating = gig.rating?.average != null ? `${gig.rating.average.toFixed(1)} (${gig.rating.count})` : gig.rating?.count ? ratingLine(gig.rating) : null;
  const price = cardPriceLine(gig);
  const who = [gig.freelancer.name, gig.freelancer.city].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[gig.title, hideFreelancer ? null : who, gig.categoryLabel, rating, price].filter(Boolean).join(', ')}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <ShopCover photo={gig.photo ? { ...gig.photo, smaller: [] } : null} name={gig.title} width={width} style={styles.cover}>
        <View style={styles.overlay}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{gig.categoryLabel}</Text>
          </View>
        </View>
      </ShopCover>
      <View style={styles.body}>
        {hideFreelancer ? null : (
          <View style={styles.who}>
            <Avatar name={gig.freelancer.name} uri={gig.freelancer.avatarUrl ?? undefined} size={24} />
            <Text style={styles.meta} numberOfLines={1}>
              {who}
            </Text>
          </View>
        )}
        <Text style={styles.title} numberOfLines={2}>
          {gig.title}
        </Text>
        <View style={styles.facts}>
          {rating ? (
            <View style={styles.fact}>
              <Ionicons name="star" size={13} color={Brand.warning} />
              <Text style={styles.factText}>{rating}</Text>
            </View>
          ) : null}
          <Text style={styles.price}>{price}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, overflow: 'hidden' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  cover: { width: '100%', aspectRatio: 16 / 9 },
  overlay: { position: 'absolute', top: Spacing.two, left: Spacing.two, right: Spacing.two, flexDirection: 'row' },
  chip: { paddingHorizontal: 10, height: 26, justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: 'rgba(13,12,18,0.78)' },
  chipText: { ...Typography.caption, fontSize: 12, color: Brand.text, fontFamily: Typography.bodyStrong.fontFamily },
  body: { padding: Spacing.three, gap: Spacing.one },
  who: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { ...Typography.heading, fontSize: 17, lineHeight: 23, color: Brand.text },
  meta: { ...Typography.caption, color: Brand.textMuted, flexShrink: 1 },
  facts: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.one },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  factText: { ...Typography.caption, fontSize: 12, color: Brand.textMuted },
  price: { ...Typography.bodyStrong, fontSize: 14, color: Brand.primarySoft, marginLeft: 'auto' },
});
