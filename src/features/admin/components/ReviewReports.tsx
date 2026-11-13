import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { Stars } from '@/features/reviews/components/Stars';
import { REPORT_REASONS, starsLabel } from '@/features/reviews/lib/review';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { ReviewReportService } from '@/services/review-service';
import type { ReportStatus } from '@/types/admin';
import type { ReviewCase } from '@/types/review';
import { useCan } from '../access';
import { Card, Fact, Facts, Note, ReasonSheet, Row, consoleStyles, errorText } from './parts';
import { shortDate } from '../labels';

const reasonText = (c: ReviewCase) =>
  REPORT_REASONS.filter((r) => c.reasons[r.key] > 0)
    .map((r) => `${r.label} ${c.reasons[r.key]}`)
    .join(', ');

function ReviewDetail({ c, onDone }: { c: ReviewCase; onDone: (done: ReviewCase, message: string) => void }) {
  const token = useAuthToken();
  const canAct = useCan('reports.act');
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState<'keep' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const keys = useRef({ keep: newIdempotencyKey(), remove: newIdempotencyKey() });
  const review = c.review;

  const act = async (kind: 'keep' | 'remove', reason = '') => {
    setBusy(kind);
    setError(null);
    try {
      const done =
        kind === 'keep' ? await ReviewReportService.keep(token, c.reviewId, { idempotencyKey: keys.current.keep }) : await ReviewReportService.remove(token, c.reviewId, reason, { idempotencyKey: keys.current.remove });
      Feedback.success();
      setRemoving(false);
      onDone(done, kind === 'keep' ? 'Review kept up.' : 'Review removed. The customer was told why.');
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.detail}>
      <Facts>
        <Fact label="Reports" value={String(c.reports)} />
        <Fact label="Last reported" value={shortDate(c.lastAt)} />
        {review ? <Fact label="Shop" value={review.shop.name} /> : null}
        {review ? <Fact label="Order" value={`#${review.orderNo}`} /> : null}
      </Facts>
      {review ? (
        <>
          <Stars value={review.rating} />
          {review.text ? <Text style={consoleStyles.body}>{review.text}</Text> : <Note>Stars only, no text.</Note>}
          {review.reply ? <Text style={consoleStyles.body}>{`Shop's reply: ${review.reply.text}`}</Text> : null}
          {review.status === 'removed' && review.removal ? (
            <Note tone="danger">
              Removed {timeAgo(review.removal.at)}: {review.removal.reason}
            </Note>
          ) : null}
        </>
      ) : (
        <Note>The customer deleted this review.</Note>
      )}
      {c.notes.map((note, i) => (
        <Text key={i} style={consoleStyles.body}>
          “{note}”
        </Text>
      ))}
      {error ? <ErrorBanner message={error} /> : null}

      {c.status === 'open' && canAct ? (
        <>
          {review?.status === 'live' ? <PrimaryButton label="Remove review" onPress={() => setRemoving(true)} disabled={!!busy} /> : null}
          <PrimaryButton label="Keep it up" variant="outline" onPress={() => act('keep')} loading={busy === 'keep'} disabled={!!busy} />
        </>
      ) : null}

      <ReasonSheet
        visible={removing}
        title="Remove review"
        prompt="Why is it coming down? The customer will see this. The shop sees it in its activity."
        placeholder="For example: reviews can't advertise other services."
        confirmLabel="Remove review"
        loading={busy === 'remove'}
        onConfirm={(reason) => act('remove', reason)}
        onCancel={() => setRemoving(false)}
      />
    </View>
  );
}

/** Reported shop reviews, one row per review. */
export function ReviewReportsQueue({ status }: { status: ReportStatus }) {
  const token = useAuthToken();
  const list = usePaginated((cursor) => ReviewReportService.list(token, status, cursor));
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (list.loading) {
    return (
      <View style={consoleStyles.skeletons}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={68} radius={14} />
        ))}
      </View>
    );
  }
  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load reports" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }

  return (
    <FlatList
      data={list.items}
      keyExtractor={(c) => c.reviewId}
      contentContainerStyle={consoleStyles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={done ? <Note>{done}</Note> : null}
      ListEmptyComponent={
        <EmptyState icon="star-outline" title={status === 'open' ? 'No reported reviews' : 'Nothing closed yet'} message={status === 'open' ? 'Shop reviews people report show up here.' : undefined} />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={consoleStyles.footer} /> : null}
      renderItem={({ item: c }) => {
        const review = c.review;
        const when = status === 'open' ? c.lastAt : (c.closedAt ?? c.lastAt);
        const expanded = open === c.reviewId;
        return (
          <Card>
            <Row
              name={review?.author?.name ?? '?'}
              avatarUrl={review?.author?.avatarUrl ?? undefined}
              title={review ? `${starsLabel(review.rating)} for ${review.shop.name}` : 'Deleted review'}
              subtitle={`${review?.text ? `${review.text.slice(0, 60)} · ` : ''}${reasonText(c) || `${c.reports} reports`} · ${timeAgo(when)}`}
              right={
                c.outcome ? (
                  <Badge label={c.outcome === 'removed' ? 'Removed' : 'Kept'} tone={c.outcome === 'removed' ? 'error' : 'success'} />
                ) : (
                  <Badge label={c.reports === 1 ? '1 report' : `${c.reports} reports`} tone="warning" />
                )
              }
              onPress={() => setOpen(expanded ? null : c.reviewId)}
            />
            {expanded ? (
              <ReviewDetail
                c={c}
                onDone={(closed, message) => {
                  setOpen(null);
                  setDone(message);
                  list.setItems((items) => items.filter((x) => x.reviewId !== closed.reviewId));
                }}
              />
            ) : null}
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  detail: { gap: Spacing.three, paddingTop: Spacing.two },
});
