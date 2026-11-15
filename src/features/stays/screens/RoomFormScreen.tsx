import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { MultiChoiceChips } from '@/components/ui/MultiChoiceChips';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Stepper } from '@/components/ui/Stepper';
import { TextLink } from '@/components/ui/TextLink';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { errorText } from '@/features/events/lib/messages';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { keepIdempotencyKey, newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { StaysService, VendorStaysService } from '@/services/stays-service';
import type { RoomFeature, RoomKind, StaysRules, VendorProperty } from '@/types/stays';
import { RoomPriceFields } from '../components/RoomPriceFields';
import { emptyRoom, roomDraftOf, roomErrors, toRoomInput, type RoomDraft } from '../lib/forms';
import { FEATURES, FEATURE_LABEL, ROOM_KIND_LABEL } from '../lib/stays';

const KIND_CHIPS = (['shared', 'private'] as const).map((k) => ({ key: k, label: ROOM_KIND_LABEL[k] }));
const FEATURE_CHIPS = FEATURES.map((f) => ({ key: f, label: FEATURE_LABEL[f] }));

function Form({ rules, property, roomId }: { rules: StaysRules; property: VendorProperty; roomId?: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const room = roomId ? property.rooms.find((r) => r.id === roomId) : undefined;
  const [draft, setDraft] = useState<RoomDraft>(() => (room ? roomDraftOf(room) : emptyRoom(property.rooms.length + 1)));
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(newIdempotencyKey());
  const errors = roomErrors(draft, rules);
  const shownErrors = shown ? errors : {};
  const set = <K extends keyof RoomDraft>(key: K, value: RoomDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    setShown(true);
    if (Object.keys(errors).length) {
      Feedback.error();
      return;
    }
    setBusy('save');
    setFailure(null);
    try {
      const body = toRoomInput(draft);
      if (room) await VendorStaysService.updateRoom(token, room.id, body);
      else await VendorStaysService.addRoom(token, property.id, body, { idempotencyKey: attempt.current });
      Feedback.success();
      router.back();
    } catch (e) {
      Feedback.error();
      setFailure(errorText(e));
      if (!keepIdempotencyKey(e)) attempt.current = newIdempotencyKey();
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!room) return;
    setBusy('delete');
    try {
      await VendorStaysService.removeRoom(token, room.id);
      Feedback.success();
      setDeleting(false);
      router.back();
    } catch (e) {
      Feedback.error();
      setDeleting(false);
      setFailure(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const footer = <PrimaryButton label={room ? 'Save room' : 'Add room'} loading={busy === 'save'} onPress={save} />;

  return (
    <ScreenContainer title={room ? 'Edit room' : 'New room'} footer={footer}>
      <InputField label="Room name" value={draft.name} onChangeText={(v) => set('name', v)} maxLength={40} placeholder="Like “Room 101” or “Top floor triple”" error={shownErrors.name} />

      <Text style={styles.label}>Kind of room</Text>
      <View style={styles.bleed}>
        <ChoiceChips options={KIND_CHIPS} value={draft.kind} onChange={(v: RoomKind) => set('kind', v)} />
      </View>
      <Text style={styles.hint}>{draft.kind === 'shared' ? 'Tenants reserve a bed and share the room.' : 'One tenant reserves the whole room.'}</Text>

      <View style={styles.stepRow}>
        <Text style={styles.stepText}>Beds in the room</Text>
        <Stepper label="Beds in the room" value={draft.beds} min={1} max={rules.maxBeds} onChange={(v) => set('beds', v)} />
      </View>
      {shownErrors.beds ? <Text style={styles.error}>{shownErrors.beds}</Text> : null}
      {room && draft.beds < room.beds ? <Text style={styles.hint}>Beds with reservations to come can’t be taken away.</Text> : null}

      {draft.kind === 'shared' ? (
        <ToggleRow
          title="Can be reserved whole"
          subtitle={`One tenant or group can take all ${draft.beds} beds at the bed price times the beds.`}
          icon="albums-outline"
          value={draft.wholeRoom}
          onValueChange={(v) => set('wholeRoom', v)}
        />
      ) : null}

      <Text style={styles.label}>Prices</Text>
      <RoomPriceFields kind={draft.kind} month={draft.month} night={draft.night} errors={shownErrors} onChange={(changes) => setDraft((d) => ({ ...d, ...changes }))} />

      <Text style={styles.label}>What the room has</Text>
      <MultiChoiceChips options={FEATURE_CHIPS} value={draft.features} onChange={(v: RoomFeature[]) => set('features', v)} />

      <ToggleRow
        title="Mark the room full"
        subtitle="Tenants still see it but can’t reserve it. Reservations already made stay."
        icon="pause-circle-outline"
        value={draft.paused}
        onValueChange={(v) => set('paused', v)}
      />

      {failure ? <ErrorBanner message={failure} /> : null}
      {room ? <TextLink muted label="Delete this room" onPress={() => setDeleting(true)} /> : null}

      <ConfirmSheet
        visible={deleting}
        title="Delete this room?"
        message={`${draft.name || 'This room'} and its beds will be removed. A room with reservations to come can’t be deleted; mark it full instead.`}
        confirmLabel="Delete"
        loading={busy === 'delete'}
        onConfirm={remove}
        onCancel={() => setDeleting(false)}
      />
    </ScreenContainer>
  );
}

/** Adding a room to `propertyId`, or changing `roomId`: kind, beds, prices, features and whether it's full. */
export function RoomFormScreen({ propertyId, roomId }: { propertyId: string; roomId?: string }) {
  const token = useAuthToken();
  const rules = useAsyncResource(() => StaysService.rules(token), 'stays-rules');
  const property = useAsyncResource(() => VendorStaysService.get(token, propertyId), propertyId);
  const ready = rules.data && property.data;
  return ready ? (
    <Form rules={rules.data!} property={property.data!} roomId={roomId} />
  ) : (
    <ScreenContainer title={roomId ? 'Edit room' : 'New room'}>
      <AsyncBoundary
        loading={rules.loading || property.loading}
        error={rules.error ?? property.error}
        hasData={false}
        onRetry={() => {
          rules.reload();
          property.reload();
        }}
        skeletonRows={5}
      >
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -Spacing.three },
  label: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  hint: { ...Typography.caption, color: Brand.textMuted },
  error: { ...Typography.caption, color: Brand.error },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepText: { ...Typography.body, fontSize: 15, color: Brand.text, flex: 1 },
});
