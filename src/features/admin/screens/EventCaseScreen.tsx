import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { EventSales } from '@/features/events/components/EventSales';
import { EVENT_STATUS, KIND_LABEL, whenLine } from '@/features/events/lib/events';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { keepIdempotencyKey, newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { AdminService } from '@/services/admin-service';
import type { VendorEvent } from '@/types/events';
import { useCan } from '../access';
import { Card, Fact, Facts, Note, ReasonSheet, consoleStyles, errorText } from '../components/parts';
import { shortDate } from '../labels';

/** Drafts and events still to come can be taken down; cancelled and ended ones can't. */
function TakeDown({ event, onDone }: { event: VendorEvent; onDone: (next: VendorEvent, message: string) => void }) {
  const token = useAuthToken();
  const canManage = useCan('businesses.manage');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());
  if (!canManage || (event.status !== 'draft' && event.status !== 'live')) return null;

  const tickets = event.counts.tickets;
  const message =
    event.status === 'draft'
      ? 'The draft is cancelled for good and the organiser can’t publish it. They see your reason. This can’t be undone.'
      : tickets
        ? `It comes off sale for good. All ${tickets} ${tickets === 1 ? 'ticket is' : 'tickets are'} cancelled and everyone gets a full refund, platform fee included. The organiser and every ticket holder see your reason. This can’t be undone.`
        : 'It comes off sale for good. Nobody has booked yet. The organiser sees your reason. This can’t be undone.';

  const takeDown = async (reason: string) => {
    setBusy(true);
    setError(null);
    try {
      const next = await AdminService.takeDownEvent(token, event.id, reason, key.current);
      key.current = newIdempotencyKey();
      Feedback.success();
      setOpen(false);
      onDone(
        next,
        tickets
          ? 'Event taken down. Everyone who booked is being refunded in full, and they and the organiser have been told why.'
          : 'Event taken down. The organiser has been told why.',
      );
    } catch (err) {
      Feedback.error();
      if (!keepIdempotencyKey(err)) key.current = newIdempotencyKey();
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
        title={`Take down ${event.title}?`}
        message={message}
        prompt="Reason"
        placeholder="For example: this event breaks Ruxstar’s rules on ticket resale."
        confirmLabel={tickets && event.status === 'live' ? 'Take down and refund everyone' : 'Take down'}
        loading={busy}
        onConfirm={takeDown}
        onCancel={() => setOpen(false)}
      />
    </View>
  );
}

/** One event for the Ruxstar team: what's on sale, who runs it, how it's selling, and taking it down. */
export function EventCaseScreen({ id }: { id: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const canAudit = useCan('audit.view');
  const { data: event, loading, error, reload, setData } = useAsyncResource(() => AdminService.getEvent(token, id), id);
  const [done, setDone] = useState<string | null>(null);

  return (
    <ScreenContainer title="Event">
      <AsyncBoundary loading={loading} error={error} hasData={!!event} onRetry={reload} skeletonRows={5}>
        {event ? (
          <>
            <ShopCover photo={event.photo ? { ...event.photo, smaller: [] } : null} name={event.title} width={400} style={styles.poster} />

            <View style={styles.head}>
              <View style={styles.flex}>
                <Text style={styles.name}>{event.title}</Text>
                <Text style={consoleStyles.muted}>{`${KIND_LABEL[event.kind]} · ${whenLine(event.startsAt, event.endsAt)}`}</Text>
              </View>
              <Badge {...EVENT_STATUS[event.status]} />
            </View>

            {done ? <Note>{done}</Note> : null}
            {event.cancellation ? (
              <Note tone="danger">
                {`${event.cancellation.by === 'staff' ? 'Taken down by Ruxstar' : 'Cancelled by the organiser'} ${timeAgo(event.cancellation.at)}: ${event.cancellation.reason}`}
              </Note>
            ) : null}

            <EventSales event={event} shareLabel="Organiser’s share" />

            <Card>
              <Facts>
                <Fact label="Organiser" value={event.business.name} />
                <Fact label="Where" value={event.online ? 'Online' : [event.venue?.name, event.venue?.address, event.venue?.city].filter(Boolean).join(', ')} />
                {event.online && event.onlineLink ? <Fact label="Meeting link" value={event.onlineLink} /> : null}
                <Fact label="Ticket sales" value={money(event.money.sales)} />
                <Fact label="Commission" value={`${event.money.commissionBps / 100}%`} />
                <Fact label="Refunds" value={event.refunds === 'standard' ? 'Full refund until the cut-off' : 'No refunds'} />
                {event.teamSize ? <Fact label="Team entries" value={`${event.teamSize.min} to ${event.teamSize.max} players`} /> : null}
                <Fact label="Questions" value={event.questions.length ? event.questions.map((q) => q.label).join(', ') : 'None'} />
                {event.status === 'draft' && event.missing.length ? <Fact label="Missing to publish" value={event.missing.join(', ')} warn /> : null}
                <Fact label="Published" value={event.publishedAt ? shortDate(event.publishedAt) : 'Not yet'} />
                <Fact label="Created" value={shortDate(event.createdAt)} />
                <Fact label="Event id" value={event.id} />
              </Facts>
            </Card>

            {event.description ? (
              <Card>
                <Text style={consoleStyles.muted}>About</Text>
                <Text style={consoleStyles.body} selectable>
                  {event.description}
                </Text>
              </Card>
            ) : null}

            <TakeDown
              event={event}
              onDone={(next, message) => {
                setData(next);
                setDone(message);
              }}
            />

            <View style={styles.links}>
              <TextLink label="Open the organiser’s business" onPress={() => router.push({ pathname: '/(admin)/business/[id]', params: { id: event.business.id } })} />
              {canAudit ? <TextLink label="History for this event" onPress={() => router.push({ pathname: '/(admin)/audit', params: { target: event.id } })} /> : null}
            </View>
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  poster: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.lg, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  name: { ...Typography.title, color: Brand.text },
  actions: { gap: Spacing.two, marginTop: Spacing.two },
  links: { gap: Spacing.three, alignItems: 'flex-start', marginTop: Spacing.two },
});
