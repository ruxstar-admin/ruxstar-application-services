import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { MultiChoiceChips } from '@/components/ui/MultiChoiceChips';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { digitsOnly } from '@/features/kyc/lib/validators';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { StaysService } from '@/services/stays-service';
import { FACILITIES, type FacilityKey } from '@/types/stays';

/** Add a property with its first room type. More rooms and availability are managed afterwards. */
export function CreatePropertyScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [facilities, setFacilities] = useState<FacilityKey[]>([]);
  const [roomName, setRoomName] = useState('');
  const [sharing, setSharing] = useState('2');
  const [beds, setBeds] = useState('');
  const [rate, setRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const valid = name.trim() && area.trim() && address.trim() && roomName.trim() && Number(sharing) > 0 && Number(beds) > 0 && Number(rate) > 0;

  const save = async () => {
    setSaving(true);
    setFailed(false);
    try {
      await StaysService.create(token, {
        name,
        area,
        address,
        facilities,
        room: { name: roomName.trim(), sharing: Number(sharing), beds: Number(beds), ratePerNight: Number(rate) },
      });
      Feedback.success();
      router.back();
    } catch {
      Feedback.error();
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer title="Add property" footer={<PrimaryButton label="Publish property" onPress={save} disabled={!valid} loading={saving} />}>
      <InputField label="Property name" value={name} onChangeText={setName} maxLength={60} />
      <InputField label="Area" value={area} onChangeText={setArea} placeholder="e.g. Madhapur" />
      <InputField label="Address" value={address} onChangeText={setAddress} multiline style={styles.address} />

      <Text style={styles.label}>Facilities</Text>
      <MultiChoiceChips options={FACILITIES} value={facilities} onChange={setFacilities} />

      <Text style={styles.section}>First room type</Text>
      <InputField label="Room name" value={roomName} onChangeText={setRoomName} placeholder="e.g. Double sharing · AC" />
      <InputField label="Beds per room" value={sharing} onChangeText={(v) => setSharing(digitsOnly(v, 1))} keyboardType="number-pad" />
      <InputField label="Total beds you offer" value={beds} onChangeText={(v) => setBeds(digitsOnly(v, 3))} keyboardType="number-pad" />
      <InputField label="Rate per bed per night (₹)" value={rate} onChangeText={(v) => setRate(digitsOnly(v, 5))} keyboardType="number-pad" />

      {failed ? <ErrorBanner message="Could not publish the property. Check the details and try again." onRetry={save} /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  address: { height: 80, paddingTop: Spacing.three, textAlignVertical: 'top' },
  label: { ...Typography.caption, color: Brand.textMuted, marginTop: Spacing.three },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four },
});
