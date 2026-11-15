import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DateStrip, Legend, VendorBoard } from '@/components/booking';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ReasonSheet } from '@/components/ui/ReasonSheet';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Notice, Section } from '@/features/coaching/components/Parts';
import { errorText } from '@/features/events/lib/messages';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { newIdempotencyKey } from '@/lib/api-client';
import { boardKey, type BoardColumn, type BoardRow } from '@/lib/booking/board';
import { istDayKey } from '@/lib/booking/days';
import { Feedback } from '@/lib/haptics';
import { TurfDeskService } from '@/services/turf-service';
import type { BoardCourt, BoardSlot, DeskGround } from '@/types/turf';
import { boardLegend, boardModel, totalsText } from '../lib/board';
import { arrivalChoices, BOOKING_STATUS, deskCan, slotWhen } from '../lib/turf';

/** Days the board looks ahead, like the booking page. */
const BOARD_DAYS = 31;

type Icon = keyof typeof Ionicons.glyphMap;

function Row({ icon, title, subtitle, onPress }: { icon: Icon; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={22} color={Brand.primarySoft} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.small}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />
    </Pressable>
  );
}

interface Picked {
  court: BoardCourt;
  slot: BoardSlot;
  /** When the sheet opened, for which arrival marks are allowed. */
  at: number;
}

function SlotSheet({ ground, picked, onClose, onDone }: { ground: DeskGround; picked: Picked | null; onClose: () => void; onDone: () => void }) {
  const router = useRouter();
  const token = useAuthToken();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [last, setLast] = useState<Picked | null>(picked);
  if (picked && picked !== last) {
    setLast(picked);
    setNote('');
    setFailure(null);
  }
  const shown = picked ?? last;

  const run = async (name: string, action: () => Promise<unknown>) => {
    setBusy(name);
    setFailure(null);
    try {
      await action();
      Feedback.success();
      setCancelling(false);
      onDone();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  if (!shown) return null;
  const { slot, court } = shown;
  const booking = slot.booking;
  const when = `${court.name} · ${slotWhen(slot.startAt, slot.endAt)}`;
  const choices = booking ? arrivalChoices({ startAt: booking.startAt, endAt: booking.endAt, status: booking.status === 'confirmed' ? 'booked' : 'cancelled' }, shown.at) : null;
  const canBlock = deskCan(ground, 'turf.block');

  return (
    <>
      <BottomSheet visible={!!picked && !cancelling} onClose={onClose} title={booking ? booking.customerName : slot.state === 'blocked' ? 'Blocked' : slot.past ? 'Gone' : 'Free'}>
        <Text style={styles.text}>{when}</Text>
        {booking ? (
          <>
            <View style={styles.sheetLine}>
              <Text style={styles.small}>{`Booking #${booking.orderNo}${booking.weeks > 1 ? ` · week ${booking.n} of ${booking.weeks}` : ''}`}</Text>
              <Badge label={slot.state === 'held' ? 'Paying now' : BOOKING_STATUS[booking.status].label} tone={slot.state === 'held' ? 'warning' : BOOKING_STATUS[booking.status].tone} />
            </View>
            {slot.state === 'held' ? <Text style={styles.small}>They’re paying now. The slot frees up if they don’t pay in time.</Text> : null}
            {booking.arrival ? <Text style={styles.text}>{booking.arrival === 'arrived' ? 'Marked as arrived' : 'Marked as a no-show'}</Text> : null}
            {booking.customerPhone ? <TextLink label={`Call ${booking.customerPhone}`} onPress={() => Linking.openURL(`tel:${booking.customerPhone}`)} /> : null}
            {deskCan(ground, 'turf.arrivals') && choices && (choices.arrived || choices.noShow) ? (
              <View style={styles.pair}>
                <View style={styles.half}>
                  <PrimaryButton
                    label="Arrived"
                    variant={booking.arrival === 'arrived' ? 'primary' : 'outline'}
                    disabled={!choices.arrived || booking.arrival === 'arrived'}
                    loading={busy === 'arrived'}
                    onPress={() => run('arrived', () => TurfDeskService.arrival(token, booking.id, booking.n, 'arrived', { idempotencyKey: newIdempotencyKey() }))}
                  />
                </View>
                <View style={styles.half}>
                  <PrimaryButton
                    label="No-show"
                    variant={booking.arrival === 'no_show' ? 'primary' : 'outline'}
                    disabled={!choices.noShow || booking.arrival === 'no_show'}
                    loading={busy === 'no_show'}
                    onPress={() => run('no_show', () => TurfDeskService.arrival(token, booking.id, booking.n, 'no_show', { idempotencyKey: newIdempotencyKey() }))}
                  />
                </View>
              </View>
            ) : null}
            {booking.status === 'confirmed' ? (
              <PrimaryButton
                label="See the booking"
                variant="outline"
                onPress={() => {
                  onClose();
                  router.push({ pathname: '/(customer)/ground-desk/booking/[id]', params: { id: booking.id } });
                }}
              />
            ) : null}
            {booking.status === 'confirmed' && !slot.past && deskCan(ground, 'turf.cancel') ? (
              <TextLink muted label={booking.weeks > 1 ? 'Cancel this date, refund in full' : 'Cancel the booking, refund in full'} onPress={() => setCancelling(true)} />
            ) : null}
          </>
        ) : slot.state === 'blocked' ? (
          <>
            <Text style={styles.text}>{slot.block?.note || 'No note'}</Text>
            {slot.block?.by ? <Text style={styles.small}>{`Blocked by ${slot.block.by}`}</Text> : null}
            {canBlock && !slot.past ? (
              <PrimaryButton
                label="Unblock"
                loading={busy === 'unblock'}
                onPress={() => run('unblock', () => TurfDeskService.unblock(token, court.id, [slot.startAt], { idempotencyKey: newIdempotencyKey() }))}
              />
            ) : null}
          </>
        ) : slot.past ? (
          <Text style={styles.small}>This time has gone.</Text>
        ) : (
          <>
            <Text style={styles.small}>{`${money(slot.price)}${slot.peak ? ' · peak price' : ''}`}</Text>
            {court.status === 'paused' ? <Text style={styles.small}>The court is paused, so players can’t book it.</Text> : null}
            {canBlock ? (
              <>
                <InputField label="Note (optional)" value={note} onChangeText={setNote} maxLength={120} placeholder="Like “Maintenance” or “Booked by phone, Ravi”" />
                <PrimaryButton
                  label="Block this slot"
                  loading={busy === 'block'}
                  onPress={() => run('block', () => TurfDeskService.block(token, court.id, [slot.startAt], note.trim() || undefined, { idempotencyKey: newIdempotencyKey() }))}
                />
                <Text style={styles.small}>Nobody can book a blocked slot until you unblock it.</Text>
              </>
            ) : (
              <Text style={styles.small}>Players can book it in the app.</Text>
            )}
          </>
        )}
        {failure ? <ErrorBanner message={failure} /> : null}
      </BottomSheet>
      {booking ? (
        <ReasonSheet
          visible={cancelling && !!picked}
          title={booking.weeks > 1 ? 'Cancel this date?' : 'Cancel this booking?'}
          message={`${booking.customerName} gets back everything they paid for ${booking.weeks > 1 ? 'this date' : 'it'}, and sees your reason.`}
          prompt="Why are you cancelling?"
          placeholder="Like “Rain has flooded the pitch”"
          confirmLabel="Cancel and refund"
          loading={busy === 'cancel'}
          failure={failure}
          onConfirm={(reason) =>
            run('cancel', () => TurfDeskService.cancel(token, booking.id, { ...(booking.weeks > 1 ? { occurrences: [booking.n] } : {}), reason }, { idempotencyKey: newIdempotencyKey() }))
          }
          onCancel={() => setCancelling(false)}
        />
      ) : null}
    </>
  );
}

function Board({ ground }: { ground: DeskGround }) {
  const router = useRouter();
  const token = useAuthToken();
  const [day, setDay] = useState(() => istDayKey(Date.now()));
  const [picked, setPicked] = useState<Picked | null>(null);
  const { data, error, reload } = useAsyncResource(() => TurfDeskService.board(token, ground.id, day), `${ground.id}|${day}`);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));
  const board = data?.date === day ? data : null;
  const model = board ? boardModel(board) : null;

  const press = (row: BoardRow, column: BoardColumn) => {
    const hit = model?.slotAt[boardKey(row.key, column.key)];
    if (!hit) return;
    Feedback.select();
    setPicked({ ...hit, at: Date.now() });
  };

  return (
    <ScreenContainer title={ground.name}>
      {ground.status === 'draft' ? <Notice tone="warning" text="This ground is a draft. Players can book once it’s published." /> : null}
      <View style={styles.bleed}>
        <DateStrip value={day} onChange={setDay} count={BOARD_DAYS} />
      </View>
      {board && model ? (
        <>
          <View style={styles.sheetLine}>
            <Text style={styles.totals}>{totalsText(board.totals)}</Text>
            <TextLink label="Refresh" onPress={reload} />
          </View>
          {board.courts.length ? (
            <>
              <VendorBoard rows={model.rows} columns={model.columns} cells={model.cells} onCellPress={press} corner="Court" />
              <Legend items={boardLegend(model.cells)} />
            </>
          ) : (
            <EmptyState icon="grid-outline" title="No courts yet" message="Courts the owner adds show up here." />
          )}
        </>
      ) : error ? (
        <ErrorBanner message={errorText(error)} onRetry={reload} />
      ) : (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={52} radius={10} />
          ))}
        </View>
      )}

      <Section title="More" />
      <View style={styles.rows}>
        <Row icon="receipt-outline" title="Bookings" subtitle="Upcoming and past, with each customer" onPress={() => router.push({ pathname: '/(customer)/ground-desk/[id]/bookings', params: { id: ground.id } })} />
        {deskCan(ground, 'turf.prices')
          ? (board?.courts ?? []).map((c) => (
              <Row
                key={c.id}
                icon="pricetag-outline"
                title={`Prices: ${c.name}`}
                subtitle="Base, weekend and peak prices, and add-ons"
                onPress={() => router.push({ pathname: '/(customer)/ground-desk/prices/[id]', params: { id: c.id, ground: ground.id } })}
              />
            ))
          : null}
      </View>

      <SlotSheet
        ground={ground}
        picked={picked}
        onClose={() => setPicked(null)}
        onDone={() => {
          setPicked(null);
          reload();
        }}
      />
    </ScreenContainer>
  );
}

/** A ground's day: courts against times, tap a slot to see the booking, mark arrivals, cancel, or block it. */
export function GroundBoardScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => TurfDeskService.grounds(token), 'desk');
  const ground = data?.find((g) => g.id === id);
  if (ground) return <Board ground={ground} />;
  return (
    <ScreenContainer title="Board">
      {data ? (
        <EmptyState icon="lock-closed-outline" title="You can’t open this board" message="The ground isn’t yours, or the owner hasn’t given you ground permissions." />
      ) : (
        <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={4}>
          {null}
        </AsyncBoundary>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  bleed: { marginHorizontal: -Spacing.three },
  text: { ...Typography.body, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  totals: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text, flex: 1 },
  sheetLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pair: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  skeletons: { gap: Spacing.one },
  rows: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  rowIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,92,242,0.14)' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
});
