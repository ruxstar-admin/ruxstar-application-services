import { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Stepper } from '@/components/ui/Stepper';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { ListingReviews } from '@/features/reviews/components/ListingReviews';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { EventsService } from '@/services/events-service';
import type { EventDetail, MyWait } from '@/types/events';
import { KIND_LABEL, dayText, placeLine, refundText, timeText, whenLine } from '../lib/events';
import { errorText } from '../lib/messages';

/** Shown as "12 left" once this few remain. */
const FEW_LEFT = 20;

function Fact({ icon, title, detail }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail?: string | null }) {
  return (
    <View style={styles.fact}>
      <View style={styles.factIcon}>
        <Ionicons name={icon} size={18} color={Brand.primarySoft} />
      </View>
      <View style={styles.factText}>
        <Text style={styles.factTitle}>{title}</Text>
        {detail ? <Text style={styles.factDetail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

function WaitCard({ wait, tierName, onBook, onLeave }: { wait: MyWait; tierName: string; onBook: () => void; onLeave: () => void }) {
  const offered = wait.status === 'offered';
  return (
    <View style={[styles.wait, offered && styles.waitOffered]}>
      <Ionicons name={offered ? 'gift-outline' : 'hourglass-outline'} size={22} color={offered ? Brand.success : Brand.warning} />
      <View style={styles.waitText}>
        <Text style={styles.waitTitle}>
          {offered ? `${wait.quantity} × ${tierName} held for you` : `You’re #${wait.position} on the waitlist for ${tierName}`}
        </Text>
        <Text style={styles.waitDetail}>
          {offered && wait.offeredUntil
            ? `Book before ${dayText(wait.offeredUntil)}, ${timeText(wait.offeredUntil)} or they go to the next person.`
            : 'We’ll tell you as soon as tickets free up. You don’t pay anything until then.'}
        </Text>
        {offered ? <PrimaryButton label="Book them now" onPress={onBook} /> : <TextLink muted label="Leave the waitlist" onPress={onLeave} />}
      </View>
    </View>
  );
}

function EventView({ event, reload }: { event: EventDetail; reload: () => void }) {
  const router = useRouter();
  const token = useAuthToken();
  const { width } = useWindowDimensions();
  const [joining, setJoining] = useState(false);
  const [tierId, setTierId] = useState(event.tiers.find((t) => t.soldOut)?.id ?? event.tiers[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState<MyWait | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const anyLeft = event.tiers.some((t) => !t.soldOut);
  const allFree = event.tiers.every((t) => t.price === 0);
  const offered = event.myWaits.find((w) => w.status === 'offered');
  const tierName = (id: string) => event.tiers.find((t) => t.id === id)?.name ?? 'tickets';
  const book = (waitlistId?: string) => router.push({ pathname: '/(customer)/events/book/[id]', params: { id: event.id, ...(waitlistId ? { waitlistId } : {}) } });

  const join = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await EventsService.joinWaitlist(token, event.id, tierId, event.team ? 1 : quantity, { idempotencyKey: newIdempotencyKey() });
      Feedback.success();
      setJoining(false);
      reload();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (!leaving) return;
    setBusy(true);
    try {
      await EventsService.leaveWaitlist(token, leaving.id);
      Feedback.success();
      reload();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setBusy(false);
      setLeaving(null);
    }
  };

  const footer = (() => {
    if (event.status !== 'live') return null;
    if (offered) return null;
    if (!event.canBuy) return <PrimaryButton label={event.whyNot ?? 'Tickets aren’t on sale'} disabled onPress={() => undefined} />;
    if (anyLeft) return <PrimaryButton label={event.myOrders.length ? 'Get more tickets' : allFree ? 'Get free tickets' : 'Get tickets'} onPress={() => book()} />;
    return <PrimaryButton label="Join the waitlist" onPress={() => setJoining(true)} />;
  })();

  return (
    <ScreenContainer title="Event" footer={footer}>
      <ShopCover photo={event.photo ? { ...event.photo, smaller: [] } : null} name={event.title} width={width} style={styles.cover} dimmed={event.status !== 'live'} />
      <View style={styles.head}>
        <Badge label={KIND_LABEL[event.kind]} tone="accent" />
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.organiser}>{`By ${event.business.name}`}</Text>
      </View>

      {event.status === 'cancelled' ? (
        <View style={styles.alert}>
          <Ionicons name="close-circle-outline" size={20} color={Brand.error} />
          <Text style={styles.alertText}>{`Cancelled. ${event.cancelReason ?? ''} Everyone who paid gets a full refund.`}</Text>
        </View>
      ) : event.status === 'ended' ? (
        <View style={styles.alert}>
          <Ionicons name="checkmark-done-outline" size={20} color={Brand.textMuted} />
          <Text style={styles.alertText}>This event is over.</Text>
        </View>
      ) : null}

      {event.myOrders.length ? (
        <View style={styles.mine}>
          {event.myOrders.map((o) => (
            <ListRow
              key={o.id}
              icon="ticket-outline"
              title={o.status === 'awaiting_payment' ? 'Finish paying for your tickets' : `Your ${o.tickets === 1 ? 'ticket' : `${o.tickets} tickets`}`}
              subtitle={`Booking #${o.orderNo}`}
              onPress={() => router.push({ pathname: '/(customer)/events/ticket/[id]', params: { id: o.id } })}
            />
          ))}
        </View>
      ) : null}

      {event.myWaits.map((w) => (
        <WaitCard key={w.id} wait={w} tierName={tierName(w.tierId)} onBook={() => book(w.id)} onLeave={() => setLeaving(w)} />
      ))}

      <View style={styles.facts}>
        <Fact icon="calendar-outline" title={whenLine(event.startsAt, event.endsAt)} />
        {event.online ? (
          <Fact icon="videocam-outline" title="Online" detail={event.onlineLink ? 'The link is on your ticket.' : 'You get the link with your ticket.'} />
        ) : (
          <Fact icon="location-outline" title={event.venue?.name ?? placeLine(event)} detail={event.venue ? `${event.venue.address}, ${event.venue.city}` : null} />
        )}
        {event.teamSize ? (
          <Fact
            icon="people-outline"
            title={`Teams of ${event.teamSize.min === event.teamSize.max ? event.teamSize.min : `${event.teamSize.min} to ${event.teamSize.max}`}`}
            detail="The captain books and pays once for the team. Every player gets their own QR code."
          />
        ) : null}
      </View>
      {event.venue && !event.online ? (
        <TextLink
          label="Open in maps"
          onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue!.name}, ${event.venue!.address}, ${event.venue!.city}`)}`)}
        />
      ) : null}

      <Text style={styles.section}>Tickets</Text>
      <View style={styles.tiers}>
        {event.tiers.map((t) => (
          <View key={t.id} style={styles.tier}>
            <View style={styles.tierText}>
              <Text style={styles.tierName}>{t.name}</Text>
              <Text style={[styles.tierLeft, t.soldOut && styles.soldOut]}>
                {t.soldOut ? 'Sold out' : t.left <= FEW_LEFT ? `Only ${t.left} left` : 'Available'}
              </Text>
            </View>
            <Text style={styles.tierPrice}>{t.price === 0 ? 'Free' : `${money(t.price)}${event.team ? ' / team' : ''}`}</Text>
          </View>
        ))}
        {!allFree && event.platformFee ? <Text style={styles.small}>{`Plus a ${money(event.platformFee)} platform fee per booking.`}</Text> : null}
      </View>

      <View style={styles.refund}>
        <Ionicons name="shield-checkmark-outline" size={18} color={event.refunds.policy === 'none' ? Brand.warning : Brand.success} />
        <Text style={styles.refundText}>{refundText(event.refunds, allFree)}</Text>
      </View>

      <ListingReviews module="events" listing={{ type: 'event', id: event.id }} business={event.business.name} rating={event.rating} />

      {event.description ? (
        <>
          <Text style={styles.section}>About</Text>
          <Text style={styles.description}>{event.description}</Text>
        </>
      ) : null}

      {failure ? <ErrorBanner message={failure} /> : null}

      <BottomSheet visible={joining} onClose={() => setJoining(false)} title="Join the waitlist">
        <View style={styles.sheet}>
          <Text style={styles.small}>
            When tickets free up, they’re offered in the order people joined. You’ll get a notification, and they’re held for you for a limited time. This page shows until when.
          </Text>
          {event.tiers.length > 1 ? (
            <ChoiceChips options={event.tiers.map((t) => ({ key: t.id, label: t.name }))} value={tierId} onChange={setTierId} />
          ) : null}
          {event.team ? null : (
            <View style={styles.qtyRow}>
              <Text style={styles.tierName}>How many</Text>
              <Stepper value={quantity} min={1} max={event.maxPerOrder} onChange={setQuantity} label="tickets" />
            </View>
          )}
          {failure ? <ErrorBanner message={failure} /> : null}
          <PrimaryButton label="Join the waitlist" loading={busy} onPress={join} />
        </View>
      </BottomSheet>

      <ConfirmSheet
        visible={!!leaving}
        title="Leave the waitlist?"
        message="You’ll lose your place in the queue."
        confirmLabel="Leave"
        loading={busy}
        onConfirm={leave}
        onCancel={() => setLeaving(null)}
      />
    </ScreenContainer>
  );
}

export function EventDetailScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => EventsService.get(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));

  return data ? (
    <EventView event={data} reload={reload} />
  ) : (
    <ScreenContainer title="Event">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={4}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.lg },
  head: { gap: Spacing.one, marginTop: Spacing.two, alignItems: 'flex-start' },
  title: { ...Typography.title, color: Brand.text },
  organiser: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  alert: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  alertText: { ...Typography.caption, fontSize: 14, color: Brand.text, flex: 1 },
  mine: { borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: 'rgba(52,199,89,0.45)', overflow: 'hidden' },
  wait: { flexDirection: 'row', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: 'rgba(255,176,32,0.45)' },
  waitOffered: { borderColor: 'rgba(52,199,89,0.6)' },
  waitText: { flex: 1, gap: Spacing.two },
  waitTitle: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  waitDetail: { ...Typography.caption, color: Brand.textMuted },
  facts: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  fact: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  factIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,92,242,0.14)' },
  factText: { flex: 1, gap: 2, paddingTop: 2 },
  factTitle: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  factDetail: { ...Typography.caption, color: Brand.textMuted },
  section: { ...Typography.overline, fontSize: 12, color: Brand.textMuted, marginTop: Spacing.three },
  tiers: { gap: Spacing.two },
  tier: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  tierText: { flex: 1, gap: 2 },
  tierName: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  tierLeft: { ...Typography.caption, color: Brand.success },
  soldOut: { color: Brand.error },
  tierPrice: { ...Typography.bodyStrong, fontSize: 15, color: Brand.primarySoft },
  small: { ...Typography.caption, color: Brand.textMuted },
  refund: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start', padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt, marginTop: Spacing.two },
  refundText: { ...Typography.caption, fontSize: 14, color: Brand.text, flex: 1 },
  description: { ...Typography.body, lineHeight: 24, color: Brand.textMuted },
  sheet: { gap: Spacing.three },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
