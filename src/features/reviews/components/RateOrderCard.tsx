import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { ReviewItem } from '@/features/reviews/components/ReviewItem';
import { StarPicker } from '@/features/reviews/components/Stars';
import { REVIEW_TEXT_MAX, STAR_WORDS } from '@/features/reviews/lib/review';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { ReviewService } from '@/services/review-service';
import type { Order } from '@/types/order';
import type { MyReview } from '@/types/review';

function WriteSheet({
  order,
  review,
  start,
  visible,
  onClose,
  onSaved,
}: {
  order: Order;
  review: MyReview | null;
  start: number;
  visible: boolean;
  onClose: () => void;
  onSaved: (review: MyReview) => void;
}) {
  const token = useAuthToken();
  const [rating, setRating] = useState(start);
  const [text, setText] = useState(review?.text ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const next = await ReviewService.write(token, order.id, { rating, text: text.trim() || null });
      Feedback.success();
      onSaved(next);
    } catch (err) {
      Feedback.error();
      setError(err instanceof Error ? err.message : 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={review ? 'Change your review' : `Rate ${order.shop.name}`}>
      <View style={styles.pick}>
        <StarPicker value={rating} onChange={setRating} disabled={saving} />
        <Text style={styles.muted}>{rating ? STAR_WORDS[rating] : 'Tap a star'}</Text>
      </View>
      <InputField
        label="Tell others about it (optional)"
        value={text}
        onChangeText={setText}
        multiline
        maxLength={REVIEW_TEXT_MAX}
        showCount
        placeholder="Print quality, on time, how the shop was to deal with"
      />
      <Text style={styles.faint}>Your name and photo show with your review.</Text>
      {error ? <ErrorBanner message={error} /> : null}
      <PrimaryButton label={review ? 'Save changes' : 'Post review'} onPress={save} loading={saving} disabled={!rating} />
    </BottomSheet>
  );
}

/** On a delivered order: "Rate your order" until it's reviewed, then the review, changeable for 30 days after delivery. */
export function RateOrderCard({ order }: { order: Order }) {
  const token = useAuthToken();
  const { data, setData } = useAsyncResource(() => ReviewService.mine(token, order.id), order.id);
  const [writing, setWriting] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = order.reviewUntil !== null;

  if (data === undefined) return null;
  const review = data;

  const remove = async () => {
    setRemoving(true);
    try {
      await ReviewService.remove(token, order.id);
      Feedback.success();
      setData(null);
    } catch (err) {
      Feedback.error();
      setError(err instanceof Error ? err.message : 'Could not delete. Try again.');
    } finally {
      setRemoving(false);
      setDeleting(false);
    }
  };

  const sheet =
    writing !== null ? (
      <WriteSheet
        order={order}
        review={review}
        start={writing}
        visible
        onClose={() => setWriting(null)}
        onSaved={(next) => {
          setWriting(null);
          setData(next);
        }}
      />
    ) : null;

  if (!review) {
    if (!open) return null;
    return (
      <View style={styles.ask}>
        <Text style={styles.strong}>Rate your order</Text>
        <Text style={styles.muted}>{`How was ${order.shop.name}? It helps other customers choose.`}</Text>
        <StarPicker value={0} onChange={setWriting} />
        {sheet}
      </View>
    );
  }

  if (review.status === 'removed') {
    return (
      <>
        <Text style={styles.section}>Your review</Text>
        <View style={styles.removed}>
          <Text style={styles.strong}>Ruxstar removed your review</Text>
          {review.removedReason ? <Text style={styles.muted}>{review.removedReason}</Text> : null}
        </View>
      </>
    );
  }

  return (
    <>
      <Text style={styles.section}>Your review</Text>
      <ReviewItem review={review}>
        {open ? (
          <View style={styles.actions}>
            <TextLink label="Edit" onPress={() => setWriting(review.rating)} />
            <TextLink label="Delete" muted onPress={() => setDeleting(true)} />
            <Text style={[styles.faint, styles.flex]}>{`Until ${formatDateTime(order.reviewUntil!)}`}</Text>
          </View>
        ) : null}
      </ReviewItem>
      {error ? <ErrorBanner message={error} /> : null}
      {sheet}
      <ConfirmSheet
        visible={deleting}
        title="Delete your review?"
        message={open ? 'You can write a new one until reviews close for this order.' : 'Reviews are closed for this order.'}
        confirmLabel="Delete review"
        loading={removing}
        onConfirm={remove}
        onCancel={() => setDeleting(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, textAlign: 'right' },
  strong: { ...Typography.bodyStrong, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted },
  faint: { ...Typography.caption, fontSize: 12, color: Brand.textFaint },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four, marginBottom: Spacing.one },
  ask: {
    gap: Spacing.two,
    padding: Spacing.three,
    marginTop: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.primarySoft,
  },
  removed: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surfaceAlt },
  pick: { alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.two },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
