import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { CourtCard } from '@/features/turf/components/CourtCard';
import { PhotoStrip } from '@/features/turf/components/PhotoStrip';
import { AMENITY, GROUND_STATUS } from '@/features/turf/lib/turf';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { AdminService } from '@/services/admin-service';
import type { ConsoleGroundDetail } from '@/types/turf';
import { useCan } from '../access';
import { Card, Fact, Facts, Note, ReasonSheet, consoleStyles, errorText } from '../components/parts';
import { shortDate } from '../labels';

/** Drafts and live grounds can be taken down; one already taken down can't. */
function TakeDown({ detail, onDone }: { detail: ConsoleGroundDetail; onDone: (next: ConsoleGroundDetail, message: string) => void }) {
  const token = useAuthToken();
  const canManage = useCan('businesses.manage');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());
  const { ground, bookings } = detail;
  if (!canManage || ground.status === 'removed') return null;

  const message = bookings.upcoming
    ? `It leaves the listings for good. ${bookings.upcoming === 1 ? 'The booking' : `All ${bookings.upcoming} bookings`} with a date still to come ${bookings.upcoming === 1 ? 'is' : 'are'} cancelled and refunded in full, platform fee included. The owner and every customer see your reason. This can’t be undone.`
    : 'It leaves the listings for good. Nobody has a booking still to come. The owner sees your reason. This can’t be undone.';

  const takeDown = async (reason: string) => {
    setBusy(true);
    setError(null);
    try {
      const { ground: next, refunded } = await AdminService.takeDownGround(token, ground.id, reason, key.current);
      key.current = newIdempotencyKey();
      Feedback.success();
      setOpen(false);
      onDone(
        { ground: next, bookings: { ...bookings, upcoming: 0 } },
        refunded ? `Ground taken down. ${refunded === 1 ? '1 booking is' : `${refunded} bookings are`} being refunded, and the owner and customers have been told why.` : 'Ground taken down. The owner has been told why.',
      );
    } catch (err) {
      Feedback.error();
      setOpen(false);
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.actions}>
      {error ? <ErrorBanner message={error} /> : null}
      <PrimaryButton label="Take down" variant="outline" onPress={() => setOpen(true)} disabled={busy} />
      <ReasonSheet
        visible={open}
        title={`Take down ${ground.name}?`}
        message={message}
        prompt="Reason"
        placeholder="For example: the photos aren’t of this ground."
        confirmLabel={bookings.upcoming ? 'Take down and refund' : 'Take down'}
        loading={busy}
        onConfirm={takeDown}
        onCancel={() => setOpen(false)}
      />
    </View>
  );
}

/** One ground for the Ruxstar team: who runs it, its courts and bookings, and taking it down. */
export function GroundCaseScreen({ id }: { id: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const canAudit = useCan('audit.view');
  const { data, loading, error, reload, setData } = useAsyncResource(() => AdminService.getGround(token, id), id);
  const [done, setDone] = useState<string | null>(null);
  const ground = data?.ground;

  return (
    <ScreenContainer title="Ground">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={5}>
        {data && ground ? (
          <>
            <PhotoStrip photos={ground.photos} name={ground.name} />

            <View style={styles.head}>
              <View style={styles.flex}>
                <Text style={styles.name}>{ground.name}</Text>
                <Text style={consoleStyles.muted}>{[ground.venue.address, ground.venue.city, ground.venue.pincode].filter(Boolean).join(', ')}</Text>
              </View>
              <Badge {...GROUND_STATUS[ground.status]} />
            </View>

            {done ? <Note>{done}</Note> : null}
            {ground.removal ? <Note tone="danger">{`Taken down by Ruxstar ${timeAgo(ground.removal.at)}: ${ground.removal.reason}`}</Note> : null}

            <Card>
              <Facts>
                <Fact label="Business" value={ground.business.name} />
                <Fact label="Courts" value={String(ground.courtList.length)} />
                <Fact label="Bookings" value={`${data.bookings.total} paid · ${data.bookings.upcoming} still to come · ${data.bookings.cancelled} cancelled`} />
                <Fact label="Refunds" value={ground.refundRule} />
                <Fact label="What it has" value={ground.amenities.length ? ground.amenities.map((a) => AMENITY[a].label).join(', ') : 'Nothing listed'} />
                {ground.status === 'draft' && ground.missing.length ? <Fact label="Missing to publish" value={ground.missing.join(', ')} warn /> : null}
                <Fact label="Published" value={ground.publishedAt ? shortDate(ground.publishedAt) : 'Not yet'} />
                <Fact label="Ground id" value={ground.id} />
              </Facts>
            </Card>

            {ground.courtList.map((c) => (
              <CourtCard key={c.id} court={c} />
            ))}

            {ground.description ? (
              <Card>
                <Text style={consoleStyles.muted}>About</Text>
                <Text style={consoleStyles.body} selectable>
                  {ground.description}
                </Text>
              </Card>
            ) : null}

            <TakeDown
              detail={data}
              onDone={(next, message) => {
                setData(next);
                setDone(message);
                reload();
              }}
            />

            <View style={styles.links}>
              <TextLink label="Open the owner’s business" onPress={() => router.push({ pathname: '/(admin)/business/[id]', params: { id: ground.business.id } })} />
              {canAudit ? <TextLink label="History for this ground" onPress={() => router.push({ pathname: '/(admin)/audit', params: { target: ground.id } })} /> : null}
            </View>
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  name: { ...Typography.title, color: Brand.text },
  actions: { gap: Spacing.two, marginTop: Spacing.two },
  links: { gap: Spacing.three, alignItems: 'flex-start', marginTop: Spacing.two },
});
