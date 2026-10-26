import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Stepper } from '@/components/ui/Stepper';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { digitsOnly } from '@/features/kyc/lib/validators';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { formatRupees } from '@/lib/money';
import { StaysService } from '@/services/stays-service';
import { FACILITIES, type FacilityKey, type PropertyDetail, type Room } from '@/types/stays';

const MAX_BEDS = 200;

function AddRoomForm({ onSave, busy }: { onSave: (room: { name: string; sharing: number; beds: number; ratePerNight: number }) => void; busy: boolean }) {
  const [name, setName] = useState('');
  const [sharing, setSharing] = useState('2');
  const [beds, setBeds] = useState('');
  const [rate, setRate] = useState('');
  const valid = name.trim() && Number(sharing) > 0 && Number(beds) > 0 && Number(rate) > 0;

  return (
    <>
      <InputField label="Room name" value={name} onChangeText={setName} placeholder="e.g. Single room" />
      <InputField label="Beds per room" value={sharing} onChangeText={(v) => setSharing(digitsOnly(v, 1))} keyboardType="number-pad" />
      <InputField label="Total beds you offer" value={beds} onChangeText={(v) => setBeds(digitsOnly(v, 3))} keyboardType="number-pad" />
      <InputField label="Rate per bed per night (₹)" value={rate} onChangeText={(v) => setRate(digitsOnly(v, 5))} keyboardType="number-pad" />
      <PrimaryButton label="Add room" disabled={!valid} loading={busy} onPress={() => onSave({ name: name.trim(), sharing: Number(sharing), beds: Number(beds), ratePerNight: Number(rate) })} />
    </>
  );
}

function Manager({ detail, onChanged }: { detail: PropertyDetail; onChanged: () => void }) {
  const token = useAuthToken();
  const [facilities, setFacilities] = useState<FacilityKey[]>(detail.property.facilities);
  const [rooms, setRooms] = useState<Room[]>(detail.rooms.map((r) => r.room));
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggleFacility = async (key: FacilityKey, on: boolean) => {
    const previous = facilities;
    const next = on ? [...facilities, key] : facilities.filter((f) => f !== key);
    setFacilities(next);
    try {
      await StaysService.setFacilities(token, detail.property.id, next);
    } catch {
      Feedback.error();
      setFacilities(previous);
    }
  };

  const changeBeds = async (room: Room, beds: number) => {
    const previous = rooms;
    setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, beds } : r)));
    try {
      await StaysService.saveRoom(token, detail.property.id, { ...room, beds });
    } catch {
      Feedback.error();
      setRooms(previous);
    }
  };

  const addRoom = async (input: { name: string; sharing: number; beds: number; ratePerNight: number }) => {
    setBusy(true);
    try {
      await StaysService.saveRoom(token, detail.property.id, input);
      Feedback.success();
      setAdding(false);
      onChanged();
    } catch {
      Feedback.error();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer title={detail.property.name} footer={<PrimaryButton label="Add a room type" variant="outline" onPress={() => setAdding(true)} />}>
      <Text style={styles.meta}>{`${detail.property.area} · ${detail.property.address}`}</Text>

      <Text style={styles.section}>Rooms and beds</Text>
      {rooms.map((room) => (
        <View key={room.id} style={styles.room}>
          <View style={styles.flex}>
            <Text style={styles.roomName}>{room.name}</Text>
            <Text style={styles.meta}>{`${formatRupees(room.ratePerNight)} per bed per night`}</Text>
          </View>
          <Stepper label={`${room.name} beds`} value={room.beds} min={1} max={MAX_BEDS} onChange={(beds) => changeBeds(room, beds)} />
        </View>
      ))}

      <Text style={styles.section}>Facilities</Text>
      {FACILITIES.map((f) => (
        <ToggleRow key={f.key} title={f.label} value={facilities.includes(f.key)} onValueChange={(on) => toggleFacility(f.key, on)} />
      ))}

      <BottomSheet visible={adding} onClose={() => setAdding(false)} title="Add a room type">
        <AddRoomForm onSave={addRoom} busy={busy} />
      </BottomSheet>
    </ScreenContainer>
  );
}

export function ManagePropertyScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => StaysService.property(token, id));

  // Keyed by room count so adding a room re-initialises the editor from the server.
  return data ? (
    <Manager key={data.rooms.length} detail={data} onChanged={reload} />
  ) : (
    <ScreenContainer title="Property">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={4}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  meta: { ...Typography.caption, color: Brand.textMuted },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four },
  room: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, marginBottom: Spacing.two },
  roomName: { ...Typography.bodyStrong, color: Brand.text },
});
