import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { ReportReviewSheet } from '@/features/reviews/components/ReportReviewSheet';
import { ReviewItem } from '@/features/reviews/components/ReviewItem';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { ApiError } from '@/lib/api-error';
import { ReviewService } from '@/services/review-service';
import { useAuthStore } from '@/stores/auth-store';

/** All of a print shop's reviews, newest first. Anyone can report one. */
export function ShopReviewsScreen() {
  const token = useAuthToken();
  const me = useAuthStore((s) => s.userId);
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const list = usePaginated((cursor) => ReviewService.forShop(token, id, cursor));
  const [reporting, setReporting] = useState<string | null>(null);
  const [reported, setReported] = useState<string[]>([]);
  const refused = list.error instanceof ApiError && list.error.status === 404 ? list.error.message : null;

  return (
    <ScreenContainer title={name ? `${name} reviews` : 'Reviews'}>
      {list.loading ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={110} radius={18} />
          ))}
        </View>
      ) : list.error && !list.items.length ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load the reviews" message={refused ?? 'Check your connection and try again.'} actionLabel="Try again" onAction={list.retry} />
      ) : !list.items.length ? (
        <EmptyState icon="star-outline" title="No reviews yet" message="Customers can review an order once it's delivered." />
      ) : (
        <View style={styles.list}>
          {list.items.map((review) => (
            <ReviewItem key={review.id} review={review}>
              {review.author?.id === me ? null : reported.includes(review.id) ? (
                <Text style={styles.faint}>Reported. Thanks for telling us.</Text>
              ) : (
                <View style={styles.actions}>
                  <TextLink label="Report" muted onPress={() => setReporting(review.id)} />
                </View>
              )}
            </ReviewItem>
          ))}
          {list.hasMore ? <PrimaryButton label="Show more" variant="outline" onPress={list.loadMore} loading={list.loadingMore} /> : null}
        </View>
      )}
      <ReportReviewSheet
        reviewId={reporting}
        onClose={(done) => {
          if (done && reporting) setReported((prev) => [...prev, reporting]);
          setReporting(null);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.three },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  faint: { ...Typography.caption, fontSize: 12, color: Brand.textFaint, textAlign: 'right' },
});
