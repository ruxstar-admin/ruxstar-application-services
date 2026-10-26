import { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { PaymentSheet } from '@/features/payments/components/PaymentSheet';
import { usePaidAction } from '@/features/payments/hooks/use-paid-action';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatDateTime } from '@/lib/dates';
import { formatRupees } from '@/lib/money';
import { EventsService } from '@/services/events-service';
import type { EventDetail } from '@/types/events';

function Fact({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={18} color={Brand.primarySoft} />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

function EventView({ event }: { event: EventDetail }) {
  const router = useRouter();
  const token = useAuthToken();
  const seatsLeft = event.capacity - event.registered;
  const full = seatsLeft <= 0;
  const mine = event.myTicket;

  const openTicket = useCallback(
    (id: string) => router.replace({ pathname: '/(customer)/events/ticket/[id]', params: { id } }),
    [router],
  );

  const register = usePaidAction((paymentRef) => EventsService.register(token, event.id, paymentRef));
  const waitlist = usePaidAction(() => EventsService.joinWaitlist(token, event.id));

  const action = (() => {
    if (mine) {
      return {
        label: mine.status === 'waitlisted' ? `On the waitlist · #${mine.waitlistPosition}` : 'View your ticket',
        onPress: () => router.push({ pathname: '/(customer)/events/ticket/[id]', params: { id: mine.id } }),
        busy: false,
      };
    }
    if (full) return { label: 'Join the waitlist', onPress: waitlist.startFree, busy: waitlist.busy };
    if (event.price === 0) return { label: 'Register for free', onPress: register.startFree, busy: register.busy };
    return { label: `Pay ${formatRupees(event.price)} & register`, onPress: register.openSheet, busy: false };
  })();

  // Free registrations and waitlist joins open the ticket straight away; paid ones wait for "Done" on the payment sheet.
  const immediate = event.price === 0 ? register.result : null;
  const ticketId = (immediate ?? waitlist.result)?.id;
  useEffect(() => {
    if (ticketId) openTicket(ticketId);
  }, [ticketId, openTicket]);

  return (
    <ScreenContainer title="Event" footer={<PrimaryButton label={action.label} onPress={action.onPress} loading={action.busy} />}>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.organiser}>{`by ${event.organiser}`}</Text>
      <View style={styles.facts}>
        <Fact icon="calendar-outline" text={formatDateTime(event.startsAt)} />
        <Fact icon="location-outline" text={`${event.venue}, ${event.area}`} />
        <Fact icon="pricetag-outline" text={event.price === 0 ? 'Free entry' : `${formatRupees(event.price)} per person`} />
      </View>
      <View style={styles.badges}>
        <Badge label={full ? 'Sold out' : `${seatsLeft} seats left`} tone={full ? 'error' : 'success'} />
      </View>
      <Text style={styles.description}>{event.description}</Text>

      {full && !mine ? <Text style={styles.note}>When someone cancels, the first person on the waitlist gets the seat for 24 hours to claim it.</Text> : null}
      {(register.failed || waitlist.failed) && (
        <ErrorBanner
          message={register.failed && register.paid ? 'Your payment went through, but we could not issue the ticket. Tap retry — you will not be charged again.' : 'Something went wrong. Please try again.'}
          onRetry={register.failed ? register.retry : waitlist.retry}
        />
      )}

      <PaymentSheet
        visible={register.paying}
        onClose={register.closeSheet}
        lines={[{ label: `Ticket · ${event.title}`, amount: event.price }]}
        purpose="event-ticket"
        module="events"
        onPaid={register.onPaid}
        onDone={() => register.result && openTicket(register.result.id)}
        finishing={register.busy}
      />
    </ScreenContainer>
  );
}

export function EventDetailScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => EventsService.get(token, id));

  return data ? (
    <EventView event={data} />
  ) : (
    <ScreenContainer title="Event">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={4}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...Typography.title, color: Brand.text },
  organiser: { ...Typography.caption, color: Brand.textMuted },
  facts: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, marginTop: Spacing.three },
  fact: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  factText: { ...Typography.body, color: Brand.text, flex: 1 },
  badges: { flexDirection: 'row', marginTop: Spacing.three },
  description: { ...Typography.body, color: Brand.textMuted, marginTop: Spacing.three },
  note: { ...Typography.caption, color: Brand.textMuted, marginTop: Spacing.two },
});
