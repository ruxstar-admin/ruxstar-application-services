import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DateStrip, Legend, VendorBoard } from '@/components/booking';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Notice, Section } from '@/features/coaching/components/Parts';
import { errorText } from '@/features/events/lib/messages';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { newIdempotencyKey } from '@/lib/api-client';
import { boardKey, type BoardColumn, type BoardRow } from '@/lib/booking/board';
import { istDayKey } from '@/lib/booking/days';
import { addDays } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { StaysDeskService } from '@/services/stays-service';
import type { BedBoard, BoardReservation, DeskProperty } from '@/types/stays';
import { NoDeskAccess, useDeskProperty } from '../components/DeskAccess';
import { bedLegend, bedMapModel, bedTotalsText, type BedAt } from '../lib/board';
import { BED_STATE, STAY_STATUS, dayShort, deskCan } from '../lib/stays';

/** Days shown side by side; more gets too narrow to read a name. */
const MAP_DAYS = 7;
/** How far ahead the start day can go. */
const START_DAYS = 60;

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

const stayDates = (r: BoardReservation) => (r.until ? `${dayShort(r.moveIn)} to ${dayShort(r.until)}` : `From ${dayShort(r.moveIn)}, monthly`);

function BedSheet({ property, picked, onClose, onDone }: { property: DeskProperty; picked: BedAt | null; onClose: () => void; onDone: () => void }) {
  const router = useRouter();
  const token = useAuthToken();
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [last, setLast] = useState<BedAt | null>(picked);
  if (picked && picked !== last) {
    setLast(picked);
    setFailure(null);
  }
  const shown = picked ?? last;

  const run = async (name: string, action: () => Promise<unknown>) => {
    setBusy(name);
    setFailure(null);
    try {
      await action();
      Feedback.success();
      onDone();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  if (!shown) return null;
  const { room, bed, date } = shown;
  const r = bed.reservation;
  const open = (id: string) => {
    onClose();
    router.push({ pathname: '/(customer)/stays-desk/order/[id]', params: { id } });
  };
  const canBeds = deskCan(property, 'stays.beds');
  const where = `${room.name}${room.beds.length > 1 ? ` · Bed ${bed.label}` : ''} · ${dayShort(date)}`;
  const title = r ? r.tenantName : BED_STATE[bed.state];

  return (
    <BottomSheet visible={!!picked} onClose={onClose} title={title}>
      <Text style={styles.text}>{where}</Text>
      {r ? (
        <>
          <View style={styles.line}>
            <Text style={styles.small}>{`Reservation #${r.orderNo} · ${stayDates(r)}`}</Text>
            <Badge label={bed.state === 'held' ? 'Paying now' : STAY_STATUS[r.status].label} tone={bed.state === 'held' ? 'warning' : STAY_STATUS[r.status].tone} />
          </View>
          {bed.state === 'held' ? <Text style={styles.small}>They’re paying now. The bed frees up if they don’t pay in time.</Text> : null}
          {bed.state !== 'held' ? <PrimaryButton label="See the reservation" variant="outline" onPress={() => open(r.id)} /> : null}
        </>
      ) : (
        <>
          {bed.state === 'closed' ? <Text style={styles.small}>Marked full, so tenants can’t reserve it. Reservations already made stand.</Text> : null}
          {room.status === 'paused' ? <Text style={styles.small}>The whole room is marked full.</Text> : null}
          {bed.next ? (
            <View style={styles.line}>
              <Text style={styles.small}>{`Next: ${bed.next.tenantName}, ${stayDates(bed.next)}`}</Text>
              <TextLink label="Open" onPress={() => open(bed.next!.id)} />
            </View>
          ) : bed.state === 'free' ? (
            <Text style={styles.small}>No reservation to come for this bed.</Text>
          ) : null}
        </>
      )}
      {canBeds ? (
        <View style={styles.actions}>
          <PrimaryButton
            label={bed.status === 'open' ? 'Mark this bed full' : 'Mark this bed free'}
            variant="outline"
            loading={busy === 'bed'}
            onPress={() => run('bed', () => StaysDeskService.bedStatus(token, bed.id, bed.status === 'open' ? 'closed' : 'open', { idempotencyKey: newIdempotencyKey() }))}
          />
          <TextLink
            label={room.status === 'paused' ? `Open ${room.name} for reservations` : `Mark all of ${room.name} full`}
            onPress={() => run('room', () => StaysDeskService.roomStatus(token, room.id, room.status === 'paused' ? 'live' : 'paused', { idempotencyKey: newIdempotencyKey() }))}
          />
          <Text style={styles.small}>A full bed or room stays full on every day until you mark it free.</Text>
        </View>
      ) : null}
      {failure ? <ErrorBanner message={failure} /> : null}
    </BottomSheet>
  );
}

function WeekMap({ property }: { property: DeskProperty }) {
  const token = useAuthToken();
  const [start, setStart] = useState(() => istDayKey(Date.now()));
  const [picked, setPicked] = useState<BedAt | null>(null);
  const key = `${property.id}|${start}`;
  const { data, error, reload } = useAsyncResource<{ key: string; days: BedBoard[] }>(
    () =>
      Promise.all(Array.from({ length: MAP_DAYS }, (_, i) => StaysDeskService.board(token, property.id, addDays(start, i)))).then((days) => ({ key, days })),
    key,
  );
  useRefetchOnFocus(useCallback(() => reload(), [reload]));
  const days = data?.key === key ? data.days : null;
  const model = days ? bedMapModel(days) : null;
  const first = days?.[0];

  const press = (row: BoardRow, column: BoardColumn) => {
    const hit = model?.at[boardKey(row.key, column.key)];
    if (!hit) return;
    Feedback.select();
    setPicked(hit);
  };

  return (
    <>
      <Text style={styles.small}>Pick the first day. The map shows a week from it; tap a bed to see who’s there or mark it full.</Text>
      <View style={styles.bleed}>
        <DateStrip value={start} onChange={setStart} count={START_DAYS} />
      </View>
      {model && first ? (
        <>
          <View style={styles.line}>
            <Text style={styles.totals}>{`${dayShort(first.date)}: ${bedTotalsText(first.totals)}`}</Text>
            <TextLink label="Refresh" onPress={reload} />
          </View>
          {model.rows.length ? (
            <>
              <VendorBoard rows={model.rows} columns={model.columns} cells={model.cells} onCellPress={press} corner="Room" />
              <Legend items={bedLegend(model.cells)} />
            </>
          ) : (
            <EmptyState icon="bed-outline" title="No rooms yet" message="Rooms the owner adds show up here." />
          )}
        </>
      ) : error ? (
        <ErrorBanner message={errorText(error)} onRetry={reload} />
      ) : (
        <View style={styles.skeletons}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={52} radius={10} />
          ))}
        </View>
      )}
      <BedSheet
        property={property}
        picked={picked}
        onClose={() => setPicked(null)}
        onDone={() => {
          setPicked(null);
          reload();
        }}
      />
    </>
  );
}

function Desk({ property }: { property: DeskProperty }) {
  const router = useRouter();
  const canSee = deskCan(property, 'stays.reservations');
  const canList = deskCan(property, 'stays.listing');
  const go = (pathname: '/(customer)/stays-desk/[id]/reservations' | '/(customer)/stays-desk/[id]/tenants' | '/(customer)/stays-desk/[id]/listing' | '/(customer)/stays-desk/[id]/prices') =>
    router.push({ pathname, params: { id: property.id } });

  return (
    <ScreenContainer title={property.name}>
      {property.status === 'draft' ? <Notice tone="warning" text="This place is a draft. Tenants can reserve once the owner publishes it." /> : null}
      {property.status === 'removed' ? <Notice tone="error" text="Ruxstar took this place down. Tenants can’t reserve it." /> : null}
      {canSee ? <WeekMap property={property} /> : <Notice tone="info" text="The owner hasn’t let you see reservations, so the bed map is hidden." />}

      <Section title="More" />
      <View style={styles.rows}>
        {canSee ? (
          <>
            <Row icon="receipt-outline" title="Reservations" subtitle="To move in, staying and past, with each tenant" onPress={() => go('/(customer)/stays-desk/[id]/reservations')} />
            <Row icon="people-outline" title="Tenants" subtitle="Who’s staying now, with their phone and notice" onPress={() => go('/(customer)/stays-desk/[id]/tenants')} />
          </>
        ) : null}
        {canList ? (
          <>
            <Row icon="pricetag-outline" title="Prices" subtitle="Each room’s price a month and a night" onPress={() => go('/(customer)/stays-desk/[id]/prices')} />
            <Row icon="create-outline" title="Edit the listing" subtitle="Details, food, facilities, house rules and deposit" onPress={() => go('/(customer)/stays-desk/[id]/listing')} />
          </>
        ) : null}
        {property.owner ? (
          <Row
            icon="construct-outline"
            title="Photos and rooms"
            subtitle="Add or change rooms and beds, photos and publishing"
            onPress={() => router.push({ pathname: '/(vendor)/properties/[id]', params: { id: property.id } })}
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

/** A property's week: every bed against the days. Tap a bed to see the reservation or mark it full or free. */
export function BedMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const desk = useDeskProperty(id);
  if (desk.property) return <Desk property={desk.property} />;
  return <NoDeskAccess title="Bed map" {...desk} />;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  bleed: { marginHorizontal: -Spacing.three },
  text: { ...Typography.body, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted, flexShrink: 1 },
  totals: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text, flex: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  actions: { gap: Spacing.two },
  skeletons: { gap: Spacing.one },
  rows: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  rowIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,92,242,0.14)' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
});
