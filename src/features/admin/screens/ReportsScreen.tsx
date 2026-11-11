import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { AdminService } from '@/services/admin-service';
import type { ReportCase, ReportReason, ReportStatus } from '@/types/admin';
import { useCan } from '../access';
import { Card, ConsoleScreen, Fact, Facts, Note, ReasonSheet, Row, consoleStyles, errorText } from '../components/parts';
import { REASON_LABEL, shortDate } from '../labels';

const TABS = [
  { key: 'open', label: 'To review' },
  { key: 'closed', label: 'Closed' },
] as const satisfies readonly { key: ReportStatus; label: string }[];

const reasonText = (c: ReportCase) =>
  (Object.keys(REASON_LABEL) as ReportReason[])
    .filter((k) => c.reasons[k] > 0)
    .map((k) => `${REASON_LABEL[k]} ${c.reasons[k]}`)
    .join(', ');

function ReportDetail({ c, onDone }: { c: ReportCase; onDone: (done: ReportCase, message: string) => void }) {
  const router = useRouter();
  const token = useAuthToken();
  const canAct = useCan('reports.act');
  const canSeePeople = useCan('users.view');
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState<'keep' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const keys = useRef({ keep: newIdempotencyKey(), remove: newIdempotencyKey() });
  const post = c.post;

  const act = async (kind: 'keep' | 'remove', reason = '') => {
    setBusy(kind);
    setError(null);
    try {
      const done = kind === 'keep' ? await AdminService.keepPost(token, c.postId, keys.current.keep) : await AdminService.removePost(token, c.postId, reason, keys.current.remove);
      Feedback.success();
      setRemoving(false);
      onDone(done, kind === 'keep' ? 'Post kept up.' : 'Post removed. The author was told why.');
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
        {post ? <Fact label="Posted" value={shortDate(post.createdAt)} /> : null}
        {post?.author ? <Fact label="Author account" value={post.author.status === 'active' ? 'Active' : post.author.status === 'locked' ? 'On hold' : 'Deleted'} warn={post.author.status !== 'active'} /> : null}
      </Facts>

      {post ? (
        <>
          {post.text ? <Text style={consoleStyles.body}>{post.text}</Text> : null}
          {post.media.length > 0 ? (
            <View style={styles.thumbs}>
              {post.media.map((m) => (
                <Image key={m.url} source={{ uri: m.url }} style={styles.thumb} accessibilityIgnoresInvertColors />
              ))}
            </View>
          ) : null}
          {post.status === 'removed' && post.removal ? (
            <Note tone="danger">
              Removed {timeAgo(post.removal.at)}: {post.removal.reason}
            </Note>
          ) : null}
          {post.status === 'deleted' ? <Note>The author deleted this post.</Note> : null}
        </>
      ) : (
        <Note>This post no longer exists.</Note>
      )}

      {post?.author && canSeePeople ? (
        <TextLink label={`Open @${post.author.username}'s account`} onPress={() => router.push({ pathname: '/(admin)/account/[id]', params: { id: post.author!.id } })} />
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}

      {c.status === 'open' && canAct ? (
        <>
          {post?.status === 'live' ? <PrimaryButton label="Remove post" onPress={() => setRemoving(true)} disabled={!!busy} /> : null}
          <PrimaryButton label="Keep it up" variant="outline" onPress={() => act('keep')} loading={busy === 'keep'} disabled={!!busy} />
        </>
      ) : null}

      <ReasonSheet
        visible={removing}
        title="Remove post"
        prompt="Why is it coming down? The author will see this."
        placeholder="For example: this listing sells counterfeit goods."
        confirmLabel="Remove post"
        loading={busy === 'remove'}
        onConfirm={(reason) => act('remove', reason)}
        onCancel={() => setRemoving(false)}
      />
    </View>
  );
}

function Queue({ status }: { status: ReportStatus }) {
  const token = useAuthToken();
  const list = usePaginated((cursor) => AdminService.reports(token, status, cursor));
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
      keyExtractor={(c) => c.postId}
      contentContainerStyle={consoleStyles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={done ? <Note>{done}</Note> : null}
      ListEmptyComponent={<EmptyState icon="flag-outline" title={status === 'open' ? 'No reported posts' : 'Nothing closed yet'} message={status === 'open' ? 'Posts people report show up here.' : undefined} />}
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={consoleStyles.footer} /> : null}
      renderItem={({ item: c }) => {
        const author = c.post?.author;
        const when = status === 'open' ? c.lastAt : (c.closedAt ?? c.lastAt);
        const expanded = open === c.postId;
        return (
          <Card>
            <Row
              name={author?.name ?? '?'}
              avatarUrl={author?.avatarUrl}
              title={c.post?.text.trim() || (c.post?.media.length ? 'Photo post' : 'Post')}
              subtitle={`${author ? `@${author.username} · ` : ''}${reasonText(c) || `${c.reports} reports`} · ${timeAgo(when)}`}
              right={
                c.outcome ? (
                  <Badge label={c.outcome === 'removed' ? 'Removed' : 'Kept'} tone={c.outcome === 'removed' ? 'error' : 'success'} />
                ) : (
                  <Badge label={c.reports === 1 ? '1 report' : `${c.reports} reports`} tone="warning" />
                )
              }
              onPress={() => setOpen(expanded ? null : c.postId)}
            />
            {expanded ? (
              <ReportDetail
                c={c}
                onDone={(closed, message) => {
                  setOpen(null);
                  setDone(message);
                  list.setItems((items) => items.filter((x) => x.postId !== closed.postId));
                }}
              />
            ) : null}
          </Card>
        );
      }}
    />
  );
}

export function ReportsScreen() {
  const [status, setStatus] = useState<ReportStatus>('open');
  return (
    <ConsoleScreen title="Reported posts">
      <View style={styles.tabs}>
        <SegmentedTabs options={TABS} value={status} onChange={setStatus} />
      </View>
      <Queue key={status} status={status} />
    </ConsoleScreen>
  );
}

const styles = StyleSheet.create({
  tabs: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  detail: { gap: Spacing.three, paddingTop: Spacing.two },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  thumb: { width: 88, height: 88, borderRadius: Radius.sm, backgroundColor: Brand.surfaceAlt },
});
