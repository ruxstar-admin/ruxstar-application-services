import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { ReviewItem } from '@/features/reviews/components/ReviewItem';
import { REPLY_TEXT_MAX } from '@/features/reviews/lib/review';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { ShopReviewService, TeamReviewService } from '@/services/review-service';
import type { ShopReview } from '@/types/review';

const messageOf = (err: unknown) =>
  err instanceof ApiError && err.kind !== 'network' && err.kind !== 'timeout' ? err.message : 'Could not reach Ruxstar. Check your connection and try again.';

function ReplySheet({
  review,
  onClose,
  send,
}: {
  review: ShopReview | null;
  onClose: () => void;
  send: (review: ShopReview, text: string | null) => Promise<void>;
}) {
  const [text, setText] = useState(review?.reply?.text ?? '');
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: 'save' | 'remove') => {
    if (!review) return;
    setBusy(kind);
    setError(null);
    try {
      await send(review, kind === 'save' ? text.trim() : null);
      Feedback.success();
      onClose();
    } catch (err) {
      Feedback.error();
      setError(messageOf(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <BottomSheet visible={review !== null} onClose={onClose} title={review?.reply ? 'Change the reply' : 'Reply to this review'}>
      <Text style={styles.muted}>Everyone sees the reply under the review. The customer is told the first time.</Text>
      <InputField label="Reply" value={text} onChangeText={setText} multiline maxLength={REPLY_TEXT_MAX} showCount placeholder="Thank them, or say what you'll do about it" />
      {error ? <ErrorBanner message={error} /> : null}
      <PrimaryButton label={review?.reply ? 'Save reply' : 'Post reply'} onPress={() => run('save')} loading={busy === 'save'} disabled={text.trim().length < 2 || busy !== null} />
      {review?.reply ? (
        <View style={styles.center}>
          <TextLink label={busy === 'remove' ? 'Taking it down…' : 'Take the reply down'} muted onPress={() => run('remove')} />
        </View>
      ) : null}
    </BottomSheet>
  );
}

/**
 * A shop's reviews with its replies: the owner's from the vendor portal (`id` is the business), or the team's from Work
 * (`id` is the place, and it needs "Reply to reviews").
 */
export function ReplyReviewsScreen({ team = false }: { team?: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const service = team ? TeamReviewService : ShopReviewService;
  const list = usePaginated((cursor) => service.list(token, id, cursor));
  useRefetchOnFocus(list.refresh);
  const [replying, setReplying] = useState<ShopReview | null>(null);

  const send = async (review: ShopReview, text: string | null) => {
    const next = text === null ? await service.removeReply(token, id, review.id) : await service.reply(token, id, review.id, text);
    list.setItems((items) => items.map((r) => (r.id === next.id ? next : r)));
  };

  const openOrder = (review: ShopReview) =>
    router.push(team ? { pathname: '/(customer)/work/order/[id]', params: { id: review.orderId } } : { pathname: '/(vendor)/sale/[id]', params: { id: review.orderId } });

  return (
    <ScreenContainer title={name ? `${name} reviews` : 'Reviews'}>
      <Text style={styles.muted}>Customers review delivered orders for 30 days. Only Ruxstar can remove a review.</Text>
      {list.loading ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={110} radius={18} />
          ))}
        </View>
      ) : list.error && !list.items.length ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load the reviews" message={messageOf(list.error)} actionLabel="Try again" onAction={list.retry} />
      ) : !list.items.length ? (
        <EmptyState icon="star-outline" title="No reviews yet" message="Customers are asked to rate their order once it's delivered." />
      ) : (
        <View style={styles.list}>
          {list.items.map((review) => (
            <ReviewItem key={review.id} review={review} extra={`#${review.orderNo}`}>
              <View style={styles.actions}>
                <TextLink label={review.reply ? 'Edit reply' : 'Reply'} onPress={() => setReplying(review)} />
                <TextLink label="Open order" muted onPress={() => openOrder(review)} />
              </View>
            </ReviewItem>
          ))}
          {list.hasMore ? <PrimaryButton label="Show more" variant="outline" onPress={list.loadMore} loading={list.loadingMore} /> : null}
        </View>
      )}
      {replying ? <ReplySheet key={replying.id} review={replying} onClose={() => setReplying(null)} send={send} /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.three },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  center: { alignItems: 'center' },
});
