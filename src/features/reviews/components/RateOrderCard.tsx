import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { StarPicker, Stars } from '@/features/reviews/components/Stars';
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
  onDelete,
}: {
  order: Order;
  review: MyReview | null;
  start: number;
  visible: boolean;
  onClose: () => void;
  onSaved: (review: MyReview) => void;
  onDelete: () => void;
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
      {review ? <PrimaryButton label="Delete review" variant="outline" onPress={onDelete} disabled={saving} /> : null}
    </BottomSheet>
  );
}

/** On a delivered order: "Rate your order" until it's reviewed, then just the stars given, changeable for 30 days after delivery. */
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
        onDelete={() => {
          setWriting(null);
          setDeleting(true);
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
      <View style={styles.done}>
        <View style={styles.doneText}>
          <Text style={styles.strong}>{`You rated it ${review.rating} ${review.rating === 1 ? 'star' : 'stars'}`}</Text>
          <Stars value={review.rating} size={16} />
          {open ? <Text style={styles.faint}>{`You can change it until ${formatDateTime(order.reviewUntil!)}`}</Text> : null}
        </View>
        {open ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change your review"
            onPress={() => {
              Feedback.tap();
              setWriting(review.rating);
            }}
            style={({ pressed }) => [styles.change, pressed && styles.pressed]}
          >
            <Ionicons name="create-outline" size={16} color={Brand.text} />
            <Text style={styles.changeText}>Change</Text>
          </Pressable>
        ) : null}
      </View>
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
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    marginTop: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  doneText: { flex: 1, gap: Spacing.one },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surfaceAlt,
  },
  changeText: { ...Typography.caption, fontFamily: Fonts.semibold, color: Brand.text },
  pressed: { opacity: 0.7 },
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
});
