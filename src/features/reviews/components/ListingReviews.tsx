import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { ReportReviewSheet } from '@/features/reviews/components/ReportReviewSheet';
import { ReviewItem } from '@/features/reviews/components/ReviewItem';
import { Stars } from '@/features/reviews/components/Stars';
import { acrossLine, ratingLine } from '@/features/reviews/lib/review';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { reviewsOf } from '@/services/review-service';
import { StoreService } from '@/services/store-service';
import { useAuthStore } from '@/stores/auth-store';
import type { Rating, ReviewListing } from '@/types/review';

const PAGE = 10;

interface ListingReviewsProps {
  module: 'events' | 'coaching' | 'turf' | 'stays' | 'shop' | 'gigs';
  listing: ReviewListing;
  /** The business, whose rating covers all its reviews; a product's rating is its own. */
  business: string;
  rating: Rating | undefined;
}

/** On an event, course, ground, property or product page: the rating, and this listing's reviews 10 at a time, each with Report. Hidden with neither. */
export function ListingReviews({ module, listing, business, rating }: ListingReviewsProps) {
  const token = useAuthToken();
  const me = useAuthStore((s) => s.userId);
  const product = listing.type === 'product';
  const list = usePaginated((cursor) =>
    product ? StoreService.productReviews(token, listing.id, cursor, PAGE) : reviewsOf(module).forListing(token, listing.id, cursor, PAGE),
  );
  const [reporting, setReporting] = useState<string | null>(null);
  const [reported, setReported] = useState<string[]>([]);

  if (!rating?.count && !list.items.length) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.section}>Reviews</Text>
      {rating?.count ? (
        <View style={styles.rating}>
          <View style={styles.row}>
            {rating.average !== null ? <Stars value={Math.round(rating.average)} size={18} /> : null}
            <Text style={styles.text}>{ratingLine(rating)}</Text>
          </View>
          {product ? null : <Text style={styles.faint}>{acrossLine(business, listing.type)}</Text>}
        </View>
      ) : null}
      {list.items.map((review) => (
        <ReviewItem key={review.id} review={review}>
          {review.author?.id === me ? null : reported.includes(review.id) ? (
            <Text style={[styles.faint, styles.right]}>Reported. Thanks for telling us.</Text>
          ) : (
            <View style={styles.actions}>
              <TextLink label="Report" muted onPress={() => setReporting(review.id)} />
            </View>
          )}
        </ReviewItem>
      ))}
      {list.error && !list.loadingMore ? <TextLink label="Couldn’t load reviews. Try again" muted onPress={list.items.length ? list.loadMore : list.retry} /> : null}
      {list.hasMore && !list.error ? <PrimaryButton label="Show more reviews" variant="outline" onPress={list.loadMore} loading={list.loadingMore} /> : null}
      <ReportReviewSheet
        reviewId={reporting}
        module={module}
        onClose={(done) => {
          if (done && reporting) setReported((prev) => [...prev, reporting]);
          setReporting(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  section: { ...Typography.overline, fontSize: 12, color: Brand.textMuted, marginTop: Spacing.three },
  rating: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  text: { ...Typography.body, fontSize: 15, color: Brand.text },
  faint: { ...Typography.caption, fontSize: 12, color: Brand.textFaint },
  right: { textAlign: 'right' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
});
