import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Typography } from '@/constants/theme';
import { Card, Notice } from '@/features/coaching/components/Parts';
import { errorText } from '@/features/events/lib/messages';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { StaysDeskService } from '@/services/stays-service';
import type { RoomView } from '@/types/stays';
import { NoDeskAccess, useDeskProperty, useListing } from '../components/DeskAccess';
import { RoomPriceFields } from '../components/RoomPriceFields';
import { priceErrors, rupees, toPrices } from '../lib/forms';
import { ROOM_KIND_LABEL, plural } from '../lib/stays';

function RoomPrices({ room }: { room: RoomView }) {
  const token = useAuthToken();
  const [saved, setSaved] = useState({ month: rupees(room.prices.month), night: rupees(room.prices.night) });
  const [draft, setDraft] = useState(saved);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const errors = priceErrors(draft);
  const changed = draft.month.trim() !== saved.month || draft.night.trim() !== saved.night;

  const save = async () => {
    setShown(true);
    if (Object.keys(errors).length) {
      Feedback.error();
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      await StaysDeskService.prices(token, room.id, toPrices(draft));
      Feedback.success();
      const next = { month: draft.month.trim(), night: draft.night.trim() };
      setSaved(next);
      setDraft(next);
      setShown(false);
    } catch (e) {
      Feedback.error();
      setFailure(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Text style={styles.strong}>{room.name}</Text>
      <Text style={styles.muted}>{`${ROOM_KIND_LABEL[room.kind]} · ${plural(room.beds, 'bed')}`}</Text>
      <RoomPriceFields kind={room.kind} month={draft.month} night={draft.night} errors={shown ? errors : {}} onChange={(c) => setDraft((d) => ({ ...d, ...c }))} />
      {failure ? <ErrorBanner message={failure} /> : null}
      <PrimaryButton label={changed ? 'Save prices' : 'Saved'} variant="outline" disabled={!changed} loading={busy} onPress={save} />
    </Card>
  );
}

function Prices({ propertyId }: { propertyId: string }) {
  const listing = useListing(propertyId);
  if (!listing.data) {
    return (
      <AsyncBoundary loading={listing.loading} error={listing.error} hasData={false} onRetry={listing.reload} skeletonRows={3}>
        {null}
      </AsyncBoundary>
    );
  }
  return listing.data.rooms.length ? (
    <>
      <Notice text="New prices apply to reservations made from now. Reservations already made keep what they paid." />
      {listing.data.rooms.map((r) => (
        <RoomPrices key={r.id} room={r} />
      ))}
    </>
  ) : (
    <EmptyState icon="bed-outline" title="No rooms yet" message="Rooms the owner adds show up here." />
  );
}

/** Each room's price a month and a night, for a warden allowed to edit the listing. */
export function DeskPricesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const desk = useDeskProperty(id, 'stays.listing');
  if (!desk.property) return <NoDeskAccess title="Prices" {...desk} />;
  return (
    <ScreenContainer title="Prices">
      <Prices propertyId={id} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  strong: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
});
