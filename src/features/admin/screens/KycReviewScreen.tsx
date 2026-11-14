import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Badge } from '@/components/ui/Badge';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { AdminService } from '@/services/admin-service';
import type { CaseStatus, ReviewCase, ReviewStatus, ReviewTrack } from '@/types/admin';
import { useCan } from '../access';
import { Card, ConsoleScreen, Fact, Facts, Note, ReasonSheet, Row, Section, consoleStyles, errorText } from '../components/parts';
import { shortDate } from '../labels';

const TRACKS = [
  { key: 'base', label: 'Identity' },
  { key: 'delivery', label: 'Delivery partners' },
] as const satisfies readonly { key: ReviewTrack; label: string }[];

const TABS = [
  { key: 'submitted', label: 'To review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'locked', label: 'On hold' },
] as const satisfies readonly { key: ReviewStatus; label: string }[];

const STATUS: Record<CaseStatus, [string, 'neutral' | 'warning' | 'success' | 'error']> = {
  not_started: ['Not started', 'neutral'],
  in_progress: ['In progress', 'neutral'],
  submitted: ['To review', 'warning'],
  approved: ['Approved', 'success'],
  rejected: ['Rejected', 'error'],
  locked: ['On hold', 'error'],
};

const MATCH: Record<string, string> = {
  DIRECT_MATCH: 'Exact',
  GOOD_PARTIAL_MATCH: 'Good partial',
  MODERATE_PARTIAL_MATCH: 'Moderate partial',
  POOR_PARTIAL_MATCH: 'Poor partial',
  NO_MATCH: 'No match',
};

const percent = (score: number | null) => (score === null ? '—' : `${Math.round(score * 100)}%`);

/** Tapping opens the full photo in the browser to zoom in. The link works for 10 minutes; pull to refresh for a new one. */
function Photo({ label, url }: { label: string; url: string | null }) {
  if (!url) return <Fact label={label} value="No photo" warn />;
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={`Open the ${label.toLowerCase()}`}
      onPress={() => Linking.openURL(url).catch(() => undefined)}
      style={({ pressed }) => [styles.photo, pressed && styles.pressed]}
    >
      <Image source={{ uri: url }} style={styles.photoImage} contentFit="cover" transition={150} />
      <Text style={styles.photoLabel}>{label}</Text>
    </Pressable>
  );
}

function DeliveryFacts({ d }: { d: NonNullable<ReviewCase['delivery']> }) {
  return (
    <>
      <Section>Licence and vehicle</Section>
      <Facts>
        <Fact label="Licence number" value={d.licenceNumber ?? '—'} />
        <Fact label="Vehicle" value={d.vehicleType ? `${d.vehicleType === 'bike' ? 'Bike' : 'Scooter'} · ${d.vehicleNumber ?? '—'}` : '—'} />
      </Facts>
      <Text style={consoleStyles.muted}>Check the licence photo matches the number, and the plate in the vehicle photo matches the vehicle number.</Text>
      <View style={styles.photos}>
        <Photo label="Licence" url={d.licencePhotoUrl} />
        <Photo label="Vehicle" url={d.vehiclePhotoUrl} />
      </View>
      <Section>Their identity</Section>
    </>
  );
}

function CaseDetail({ c, onDecided }: { c: ReviewCase; onDecided: (done: ReviewCase, message: string) => void }) {
  const token = useAuthToken();
  const canReview = useCan('kyc.review');
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const keys = useRef({ approve: newIdempotencyKey(), reject: newIdempotencyKey() });
  const { identity: id } = c;

  const decide = async (kind: 'approve' | 'reject', reason = '') => {
    setBusy(kind);
    setError(null);
    try {
      const done =
        kind === 'approve' ? await AdminService.approveCase(token, c.id, keys.current.approve) : await AdminService.rejectCase(token, c.id, reason, keys.current.reject);
      Feedback.success();
      setRejecting(false);
      onDecided(done, kind === 'approve' ? 'Approved.' : done.status === 'locked' ? 'Sent back and put on hold.' : 'Sent back.');
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.detail}>
      {c.delivery ? <DeliveryFacts d={c.delivery} /> : null}
      <Facts>
        <Fact label="Phone" value={c.user.phone} />
        <Fact label="Member since" value={shortDate(c.user.memberSince)} />
        <Fact label="Name on Aadhaar" value={id.aadhaarName ?? '—'} warn={!!id.aadhaarName && id.aadhaarName.toLowerCase() !== c.user.name.toLowerCase()} />
        <Fact label="Aadhaar" value={id.aadhaarLast4 ? `XXXX ${id.aadhaarLast4}` : '—'} />
        <Fact label="PAN" value={id.panMasked ?? '—'} />
        <Fact label="Name on PAN" value={id.panName ?? '—'} />
        <Fact label="Name match" value={id.nameMatch ? (MATCH[id.nameMatch] ?? id.nameMatch) : '—'} warn={id.nameMatch !== 'DIRECT_MATCH'} />
        <Fact label="Liveness" value={percent(id.livenessScore)} warn={(id.livenessScore ?? 0) < 0.8} />
        <Fact label="Face match" value={percent(id.faceMatchScore)} warn={(id.faceMatchScore ?? 0) < 0.8} />
      </Facts>

      {c.review ? (
        <Note tone={c.review.decision === 'approved' ? 'neutral' : 'danger'}>
          {c.review.decision === 'approved' ? 'Approved' : 'Rejected'} {timeAgo(c.review.at)}
          {c.review.reason ? `: ${c.review.reason}` : ''}
        </Note>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}

      {c.status === 'submitted' && canReview ? (
        <>
          {c.rejections > 0 ? <Text style={consoleStyles.muted}>Rejected {c.rejections === 1 ? 'once' : `${c.rejections} times`} before</Text> : null}
          <PrimaryButton label="Approve" onPress={() => decide('approve')} loading={busy === 'approve'} disabled={!!busy} />
          <PrimaryButton label="Reject" variant="outline" onPress={() => setRejecting(true)} disabled={!!busy} />
        </>
      ) : null}

      <ReasonSheet
        visible={rejecting}
        title={c.rejections >= 2 ? 'Send back and put on hold' : 'Send back'}
        prompt="What should they fix? They will see this."
        placeholder={c.track === 'delivery' ? 'For example: the number plate is not readable. Retake the vehicle photo.' : 'For example: your selfie is blurry. Retake it in good light.'}
        confirmLabel={c.rejections >= 2 ? 'Send back and put on hold' : 'Send back'}
        loading={busy === 'reject'}
        onConfirm={(reason) => decide('reject', reason)}
        onCancel={() => setRejecting(false)}
      />
    </View>
  );
}

function Queue({ status, track }: { status: ReviewStatus; track: ReviewTrack }) {
  const token = useAuthToken();
  const list = usePaginated((cursor) => AdminService.reviewQueue(token, status, track, cursor));
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
    return <EmptyState icon="cloud-offline-outline" title="Could not load cases" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }

  return (
    <FlatList
      data={list.items}
      keyExtractor={(c) => c.id}
      contentContainerStyle={consoleStyles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={done ? <Note>{done}</Note> : null}
      ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" title={status === 'submitted' ? 'Nothing waiting' : 'No cases here'} message={status === 'submitted' ? (track === 'delivery' ? 'New delivery partner requests show up here.' : 'New verification requests show up here.') : undefined} />}
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={consoleStyles.footer} /> : null}
      renderItem={({ item: c }) => {
        const [label, tone] = STATUS[c.status];
        const expanded = open === c.id;
        return (
          <Card>
            <Row
              name={c.user.name}
              avatarUrl={c.user.avatarUrl}
              title={c.user.name || 'No name'}
              subtitle={`@${c.user.username}${c.submittedAt ? ` · ${timeAgo(c.submittedAt)}` : ''}`}
              right={<Badge label={label} tone={tone} />}
              onPress={() => setOpen(expanded ? null : c.id)}
            />
            {expanded ? (
              <CaseDetail
                c={c}
                onDecided={(decided, message) => {
                  setOpen(null);
                  setDone(`${decided.user.name || 'Case'}: ${message}`);
                  list.setItems((items) => (status === 'submitted' ? items.filter((x) => x.id !== decided.id) : items.map((x) => (x.id === decided.id ? decided : x))));
                }}
              />
            ) : null}
          </Card>
        );
      }}
    />
  );
}

export function KycReviewScreen() {
  const [track, setTrack] = useState<ReviewTrack>('base');
  const [status, setStatus] = useState<ReviewStatus>('submitted');
  return (
    <ConsoleScreen title="Verification">
      <View style={styles.tabs}>
        <ChoiceChips options={TRACKS} value={track} onChange={setTrack} />
        <SegmentedTabs options={TABS} value={status} onChange={setStatus} />
      </View>
      <Queue key={`${track}:${status}`} status={status} track={track} />
    </ConsoleScreen>
  );
}

const styles = StyleSheet.create({
  tabs: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, gap: Spacing.two },
  detail: { gap: Spacing.three, paddingTop: Spacing.two },
  photos: { flexDirection: 'row', gap: Spacing.two },
  photo: { flex: 1, gap: Spacing.one },
  photoImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  photoLabel: { ...Typography.caption, color: Brand.textMuted },
  pressed: { opacity: 0.7 },
});
