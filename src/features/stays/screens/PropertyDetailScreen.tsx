import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { DayPicker } from '@/components/ui/DayTimePicker';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Stepper } from '@/components/ui/Stepper';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { PaymentSheet } from '@/features/payments/components/PaymentSheet';
import { usePaidAction } from '@/features/payments/hooks/use-paid-action';
import { stayTotal } from '@/features/stays/lib/availability';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { addDays, nightsBetween } from '@/lib/dates';
import { formatRupees } from '@/lib/money';
import { StaysService } from '@/services/stays-service';
import { FACILITIES, type PropertyDetail, type RoomAvailability } from '@/types/stays';

const FACILITY_LABEL = Object.fromEntries(FACILITIES.map((f) => [f.key, f.label]));

function RoomCard({ item, selected, nights, onSelect }: { item: RoomAvailability; selected: boolean; nights: number; onSelect: () => void }) {
  const soldOut = item.free === 0;
  return (
    <View style={[styles.room, selected && styles.roomSelected]}>
      <View style={styles.roomTop}>
        <Text style={styles.roomName}>{item.room.name}</Text>
        <Badge label={soldOut ? 'No beds free' : `${item.free} beds free`} tone={soldOut ? 'error' : 'success'} />
      </View>
      <Text style={styles.meta}>{`${formatRupees(item.room.ratePerNight)} per bed per night${nights ? ` · ${formatRupees(item.room.ratePerNight * nights)} for ${nights} night${nights > 1 ? 's' : ''}` : ''}`}</Text>
      {!soldOut ? <PrimaryButton label={selected ? 'Selected' : 'Choose this room'} variant={selected ? 'primary' : 'outline'} onPress={onSelect} /> : null}
    </View>
  );
}

function PropertyView({ id, initialFrom, initialTo }: { id: string; initialFrom?: string; initialTo?: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [beds, setBeds] = useState(1);

  const { data, loading, error, reload } = useAsyncResource<PropertyDetail>(() => StaysService.property(token, id, from, to), `${from}|${to}`);
  const nights = from && to ? nightsBetween(from, to) : 0;
  const chosen = data?.rooms.find((r) => r.room.id === roomId);
  const total = chosen ? stayTotal(chosen.room.ratePerNight, beds, nights) : 0;

  const book = usePaidAction((paymentRef) => StaysService.book(token, { roomId: roomId ?? '', from: from ?? '', to: to ?? '', beds, paymentRef: paymentRef ?? '' }));

  const changeDates = (nextFrom: string | undefined, nextTo: string | undefined) => {
    setFrom(nextFrom);
    setTo(nextTo);
    setRoomId(null);
    setBeds(1);
  };

  return (
    <ScreenContainer
      title={data?.property.name ?? 'Stay'}
      footer={chosen && nights > 0 ? <PrimaryButton label={`Pay ${formatRupees(total)} & book`} onPress={book.openSheet} /> : undefined}
    >
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {data ? (
          <>
            <Text style={styles.meta}>{`${data.property.area} · ${data.property.address} · ★ ${data.property.rating || 'New'}`}</Text>
            <View style={styles.facilities}>
              {data.property.facilities.map((f) => (
                <Badge key={f} label={FACILITY_LABEL[f]} tone="neutral" />
              ))}
            </View>

            <Text style={styles.section}>Dates</Text>
            <Text style={styles.label}>Check-in</Text>
            <DayPicker value={from} onChange={(day) => changeDates(day, to && to > day ? to : undefined)} />
            <Text style={styles.label}>Check-out</Text>
            <DayPicker value={to} onChange={(day) => changeDates(from, day)} from={from ? addDays(from, 1) : undefined} />

            <Text style={styles.section}>Rooms</Text>
            {data.rooms.map((item) => (
              <RoomCard
                key={item.room.id}
                item={item}
                nights={nights}
                selected={item.room.id === roomId}
                onSelect={() => {
                  setRoomId(item.room.id);
                  setBeds(1);
                }}
              />
            ))}
            {!nights ? <Text style={styles.meta}>Pick check-in and check-out to see which beds are free.</Text> : null}

            {chosen ? (
              <View style={styles.bedsRow}>
                <Text style={styles.bedsLabel}>Beds</Text>
                <Stepper label="beds" value={beds} min={1} max={Math.max(1, chosen.free)} onChange={setBeds} />
              </View>
            ) : null}
          </>
        ) : null}
      </AsyncBoundary>

      {book.failed ? <ErrorBanner message="Your payment went through, but we could not confirm the booking. Tap retry — you will not be charged again." onRetry={book.retry} /> : null}

      <PaymentSheet
        visible={book.paying}
        onClose={book.closeSheet}
        lines={chosen ? [{ label: `${chosen.room.name} · ${beds} bed${beds > 1 ? 's' : ''} × ${nights} night${nights > 1 ? 's' : ''}`, amount: total }] : []}
        purpose="stay-booking"
        module="pg"
        onPaid={book.onPaid}
        onDone={() => {
          book.closeSheet();
          if (book.result) router.replace({ pathname: '/(customer)/stays/booking/[id]', params: { id: book.result.id } });
        }}
        finishing={book.busy}
      />
    </ScreenContainer>
  );
}

/** A property: facilities, date pickers, rooms with the beds free for those nights, and booking. */
export function PropertyDetailScreen() {
  const { id, from, to } = useLocalSearchParams<{ id: string; from?: string; to?: string }>();
  return <PropertyView id={id} initialFrom={from} initialTo={to} />;
}

const styles = StyleSheet.create({
  meta: { ...Typography.caption, color: Brand.textMuted },
  facilities: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four },
  label: { ...Typography.caption, color: Brand.textMuted, marginTop: Spacing.two },
  room: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: 'transparent', marginBottom: Spacing.two },
  roomSelected: { borderColor: Brand.primary },
  roomTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roomName: { ...Typography.bodyStrong, color: Brand.text, flex: 1 },
  bedsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 56 },
  bedsLabel: { ...Typography.body, color: Brand.text },
});
