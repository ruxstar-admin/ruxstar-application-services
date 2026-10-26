import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { PriceSummary } from '@/components/ui/PriceSummary';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { CancelOrder } from '@/features/money/components/CancelOrder';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatDay } from '@/lib/dates';
import { StaysService } from '@/services/stays-service';
import type { Booking } from '@/types/stays';

function BookingView({ booking, onChanged }: { booking: Booking; onChanged: () => void }) {
  const dayIso = (key: string) => new Date(`${key}T00:00:00`).toISOString();
  return (
    <>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text style={styles.title}>{booking.propertyName}</Text>
          <Text style={styles.meta}>{booking.area}</Text>
        </View>
        <Badge label={booking.status === 'confirmed' ? 'Confirmed' : 'Cancelled'} tone={booking.status === 'confirmed' ? 'success' : 'error'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.row}>{`${formatDay(dayIso(booking.from))} → ${formatDay(dayIso(booking.to))} · ${booking.nights} night${booking.nights > 1 ? 's' : ''}`}</Text>
        <Text style={styles.meta}>{`${booking.roomName} · ${booking.beds} bed${booking.beds > 1 ? 's' : ''}`}</Text>
        <Text style={styles.meta}>Booking ID {booking.id.toUpperCase()}</Text>
      </View>

      <Text style={styles.section}>Payment</Text>
      <View style={styles.card}>
        <PriceSummary lines={[{ label: `${booking.beds} bed${booking.beds > 1 ? 's' : ''} × ${booking.nights} night${booking.nights > 1 ? 's' : ''}`, amount: booking.total }]} />
      </View>

      {booking.status === 'confirmed' ? (
        <View style={styles.cancel}>
          <CancelOrder refId={booking.id} label="Cancel booking" onCancelled={onChanged} />
        </View>
      ) : null}
    </>
  );
}

export function BookingScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => StaysService.booking(token, id));

  return (
    <ScreenContainer title="Your stay">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={3}>
        {data ? <BookingView booking={data} onChanged={reload} /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  title: { ...Typography.title, color: Brand.text },
  meta: { ...Typography.caption, color: Brand.textMuted },
  row: { ...Typography.bodyStrong, color: Brand.text },
  card: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, marginTop: Spacing.three },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four },
  cancel: { marginTop: Spacing.four },
});
