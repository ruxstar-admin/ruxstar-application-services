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
import { RoomCard } from '@/features/stays/components/RoomCard';
import { KIND_LABEL, PROPERTY_STATUS, depositLine, foodText, forText, noticeText } from '@/features/stays/lib/stays';
import { PhotoStrip } from '@/features/turf/components/PhotoStrip';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { ConsoleStaysService } from '@/services/stays-service';
import type { ConsolePropertyDetail } from '@/types/stays';
import { useCan } from '../access';
import { Card, Fact, Facts, Note, ReasonSheet, consoleStyles, errorText } from '../components/parts';
import { shortDate } from '../labels';

/** Drafts and live properties can be taken down; one already taken down can't. */
function TakeDown({ detail, onDone }: { detail: ConsolePropertyDetail; onDone: (next: ConsolePropertyDetail, message: string) => void }) {
  const token = useAuthToken();
  const canManage = useCan('businesses.manage');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());
  const { property, reservations } = detail;
  if (!canManage || property.status === 'removed') return null;

  const message = reservations.upcoming
    ? `It leaves the listings for good. ${reservations.upcoming === 1 ? 'The reservation' : `All ${reservations.upcoming} reservations`} not moved in yet ${reservations.upcoming === 1 ? 'is' : 'are'} cancelled and refunded in full, platform fee included. Tenants already staying aren’t moved out. The owner and every tenant see your reason. This can’t be undone.`
    : 'It leaves the listings for good. Nobody is waiting to move in. The owner sees your reason. This can’t be undone.';

  const takeDown = async (reason: string) => {
    setBusy(true);
    setError(null);
    try {
      const { property: next, refunded } = await ConsoleStaysService.takeDown(token, property.id, reason, key.current);
      key.current = newIdempotencyKey();
      Feedback.success();
      setOpen(false);
      onDone(
        { property: next, reservations: { ...reservations, upcoming: 0 } },
        refunded
          ? `Property taken down. ${refunded === 1 ? '1 reservation is' : `${refunded} reservations are`} being refunded, and the owner and tenants have been told why.`
          : 'Property taken down. The owner has been told why.',
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
        title={`Take down ${property.name}?`}
        message={message}
        prompt="Reason"
        placeholder="For example: the photos aren’t of this property."
        confirmLabel={reservations.upcoming ? 'Take down and refund' : 'Take down'}
        loading={busy}
        onConfirm={takeDown}
        onCancel={() => setOpen(false)}
      />
    </View>
  );
}

/** One PG or hostel for the Ruxstar team: who runs it, its rooms and reservations, and taking it down. */
export function PropertyCaseScreen({ id }: { id: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const canAudit = useCan('audit.view');
  const canOrders = useCan('orders.view');
  const { data, loading, error, reload, setData } = useAsyncResource(() => ConsoleStaysService.property(token, id), id);
  const [done, setDone] = useState<string | null>(null);
  const property = data?.property;

  return (
    <ScreenContainer title="Property">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={5}>
        {data && property ? (
          <>
            <PhotoStrip photos={property.photos} name={property.name} />

            <View style={styles.head}>
              <View style={styles.flex}>
                <Text style={styles.name}>{property.name}</Text>
                <Text style={consoleStyles.muted}>{property.address}</Text>
              </View>
              <Badge {...PROPERTY_STATUS[property.status]} />
            </View>

            {done ? <Note>{done}</Note> : null}
            {property.removal ? <Note tone="danger">{`Taken down by Ruxstar ${timeAgo(property.removal.at)}: ${property.removal.reason}`}</Note> : null}

            <Card>
              <Facts>
                <Fact label="Business" value={property.business.name} />
                <Fact label="Kind" value={`${KIND_LABEL[property.kind]} · ${forText(property.for, property.occupants)}`} />
                <Fact label="Rooms" value={`${property.rooms.length} rooms · ${property.rooms.reduce((n, r) => n + r.beds, 0)} beds`} />
                <Fact
                  label="Reservations"
                  value={`${data.reservations.total} paid · ${data.reservations.staying} staying · ${data.reservations.upcoming} to move in · ${data.reservations.cancelled} cancelled`}
                />
                <Fact label="Objections" value={String(data.reservations.objections)} warn={data.reservations.objections > 0} />
                <Fact label="Food" value={foodText(property.food)} />
                <Fact label="Notice" value={noticeText(property.noticeDays)} />
                <Fact label="Deposit" value={depositLine(property.depositDetail)} />
                <Fact label="Refunds" value={property.refundRule} />
                <Fact label="Facilities" value={property.facilities.length ? property.facilities.map((f) => f.name).join(', ') : 'Nothing listed'} />
                {property.status === 'draft' && property.missing.length ? <Fact label="Missing to publish" value={property.missing.join(', ')} warn /> : null}
                <Fact label="Published" value={property.publishedAt ? shortDate(property.publishedAt) : 'Not yet'} />
                <Fact label="Property id" value={property.id} />
              </Facts>
            </Card>

            {property.rooms.map((r) => (
              <RoomCard key={r.id} room={r} />
            ))}

            {property.description ? (
              <Card>
                <Text style={consoleStyles.muted}>About</Text>
                <Text style={consoleStyles.body} selectable>
                  {property.description}
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
              <TextLink label="Open the owner’s business" onPress={() => router.push({ pathname: '/(admin)/business/[id]', params: { id: property.business.id } })} />
              {canOrders && data.reservations.objections ? <TextLink label="Open objections" onPress={() => router.push('/(admin)/objections')} /> : null}
              {canAudit ? <TextLink label="History for this property" onPress={() => router.push({ pathname: '/(admin)/audit', params: { target: property.id } })} /> : null}
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
