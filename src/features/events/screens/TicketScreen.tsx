import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { CancelOrder } from '@/features/money/components/CancelOrder';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { formatDateTime } from '@/lib/dates';
import { EventsService } from '@/services/events-service';
import type { Ticket, TicketStatus } from '@/types/events';

const STATUS: Record<TicketStatus, { label: string; tone: 'success' | 'accent' | 'warning' | 'error' }> = {
  valid: { label: 'Valid', tone: 'success' },
  checked_in: { label: 'Checked in', tone: 'accent' },
  waitlisted: { label: 'Waitlisted', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'error' },
};

function TicketCard({ ticket, onChanged }: { ticket: Ticket; onChanged: () => void }) {
  const waitlisted = ticket.status === 'waitlisted';
  return (
    <>
    <View style={styles.card}>
      <Badge label={STATUS[ticket.status].label} tone={STATUS[ticket.status].tone} />
      <Text style={styles.title}>{ticket.eventTitle}</Text>
      <Text style={styles.meta}>{formatDateTime(ticket.startsAt)}</Text>
      <Text style={styles.meta}>{ticket.venue}</Text>

      <View style={styles.divider} />

      {waitlisted ? (
        <>
          <Text style={styles.label}>Waitlist position</Text>
          <Text style={styles.code}>{`#${ticket.waitlistPosition}`}</Text>
          <Text style={styles.hint}>When a seat opens you get a notification and 24 hours to claim it, in the order you joined.</Text>
        </>
      ) : (
        <>
          <Text style={styles.label}>Ticket code</Text>
          <Text style={styles.code} accessibilityLabel={`Ticket code ${ticket.code.split('').join(' ')}`} selectable>
            {ticket.code}
          </Text>
          <Text style={styles.hint}>Show this code at the entrance. {ticket.holder}</Text>
        </>
      )}
    </View>
    {ticket.status === 'valid' ? (
      <View style={styles.cancel}>
        <CancelOrder refId={ticket.id} label="Cancel ticket" onCancelled={onChanged} />
      </View>
    ) : null}
    </>
  );
}

/** One ticket: event, time, venue and the code the organiser checks at the door (or the waitlist position). */
export function TicketScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => EventsService.ticket(token, id));
  useRefetchOnFocus(reload);

  return (
    <ScreenContainer title="Your ticket">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={3}>
        {data ? <TicketCard ticket={data} onChanged={reload} /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.four, borderRadius: Radius.xl, backgroundColor: Brand.surface, alignItems: 'flex-start' },
  title: { ...Typography.title, color: Brand.text, marginTop: Spacing.two },
  meta: { ...Typography.body, color: Brand.textMuted },
  divider: { alignSelf: 'stretch', height: StyleSheet.hairlineWidth, backgroundColor: Brand.border, marginVertical: Spacing.three },
  label: { ...Typography.overline, color: Brand.textMuted },
  code: { fontFamily: Fonts.bold, fontSize: 40, letterSpacing: 6, color: Brand.text },
  hint: { ...Typography.caption, color: Brand.textMuted },
  cancel: { marginTop: Spacing.four },
});
