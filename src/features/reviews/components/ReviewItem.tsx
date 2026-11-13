import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Stars } from '@/features/reviews/components/Stars';
import { timeAgo } from '@/lib/time';
import type { Review } from '@/types/review';

interface ReviewItemProps {
  review: Review;
  /** Shown after the product, for example the order number for the shop. */
  extra?: string;
  /** Actions under the review: report it, or reply to it. */
  children?: React.ReactNode;
}

/** One review: who, the stars, what they ordered, what they wrote and the shop's reply. */
export function ReviewItem({ review, extra, children }: ReviewItemProps) {
  const name = review.author?.name ?? 'A customer';
  const meta = [review.product, extra, `${timeAgo(review.createdAt)}${review.editedAt ? ' · edited' : ''}`].filter(Boolean).join(' · ');
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Avatar name={name} uri={review.author?.avatarUrl ?? undefined} size={36} />
        <View style={styles.flex}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <Stars value={review.rating} />
      </View>
      {review.text ? <Text style={styles.text}>{review.text}</Text> : null}
      {review.reply ? (
        <View style={styles.reply}>
          <Text style={styles.replyLabel}>{`From the shop${review.reply.editedAt ? ' · edited' : ''}`}</Text>
          <Text style={styles.text}>{review.reply.text}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  name: { ...Typography.bodyStrong, color: Brand.text },
  meta: { ...Typography.caption, fontSize: 12, color: Brand.textMuted },
  text: { ...Typography.body, color: Brand.text, lineHeight: 22 },
  reply: { gap: 2, padding: Spacing.two, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt, borderLeftWidth: 3, borderLeftColor: Brand.primarySoft },
  replyLabel: { ...Typography.caption, fontSize: 12, color: Brand.primarySoft },
});
