import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { ROLES } from '@/constants/roles';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { isValidDrivingLicence, isValidPlate, tidyNumber } from '@/features/kyc/lib/validators';
import { toUploadJpeg } from '@/features/profile/lib/profile-photo';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { KycService } from '@/services/kyc-service';
import { useAuthStore } from '@/stores/auth-store';
import type { DeliveryCase, DeliveryPhotoKind, KycCaseStatus, KycOverview, VehicleType } from '@/types/kyc';

const EDITABLE: KycCaseStatus[] = ['not_started', 'in_progress', 'rejected'];
/** The API keeps these inside 1600 px. */
const PHOTO_SIDE = 1600;
const VEHICLES = [
  { key: 'bike', label: 'Bike' },
  { key: 'scooter', label: 'Scooter' },
] as const;

const messageOf = (err: unknown) =>
  err instanceof ApiError
    ? err.kind === 'network'
      ? 'No internet connection. Check your network and try again.'
      : err.kind === 'timeout'
        ? 'This is taking longer than usual. Please try again.'
        : err.message
    : 'Something went wrong. Please try again.';

function Note({ icon, tone, children }: { icon: keyof typeof Ionicons.glyphMap; tone: string; children: React.ReactNode }) {
  return (
    <View style={styles.note}>
      <Ionicons name={icon} size={20} color={tone} />
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

function StatusNote({ c }: { c: DeliveryCase }) {
  if (c.status === 'submitted') {
    return <Note icon="time-outline" tone={Brand.warning}>Your details are with the Ruxstar team. We will let you know when they are checked, usually within a day.</Note>;
  }
  if (c.status === 'rejected') {
    return (
      <Note icon="alert-circle-outline" tone={Brand.error}>
        <Text style={styles.strong}>Needs a change: </Text>
        {c.rejectionReason ?? 'Check your details and send again.'}
        {c.rejectionsLeft === 1 ? ' One more rejection puts this on hold.' : ''}
      </Note>
    );
  }
  if (c.status === 'locked') {
    return <Note icon="alert-circle-outline" tone={Brand.error}>Delivery verification is on hold after several rejections. Contact Ruxstar support to continue.</Note>;
  }
  return null;
}

/**
 * Delivery partner verification: the driving licence and a bike or scooter, on top of identity. Once the Ruxstar team
 * approves it, the person delivers from the separate Ruxstar Delivery app with the same sign-in.
 */
export function DeliveryVerificationScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const addRole = useAuthStore((s) => s.addRole);
  const { data, loading, error, reload, setData } = useAsyncResource(() => KycService.getOverview(token));
  useRefetchOnFocus(reload);
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [licence, setLicence] = useState<string | null>(null);
  const [plate, setPlate] = useState<string | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);

  const c = data?.delivery;
  const approved = c?.status === 'approved';
  useEffect(() => {
    if (approved) addRole(ROLES.DELIVERY);
  }, [approved, addRole]);

  const run = useCallback(
    async (name: string, action: () => Promise<KycOverview>) => {
      setBusy(name);
      setFailure(null);
      try {
        setData(await action());
        Feedback.success();
        return true;
      } catch (err) {
        Feedback.error();
        setFailure(messageOf(err));
        reload();
        return false;
      } finally {
        setBusy(null);
      }
    },
    [reload, setData],
  );

  const licenceValue = licence ?? c?.licence.number ?? '';
  const plateValue = plate ?? c?.vehicle.number ?? '';
  const licenceError = licence !== null && licence.length > 0 && !isValidDrivingLicence(licence) ? 'Type it as on the card, like TS09 20190001234.' : undefined;
  const plateError = plate !== null && plate.length > 0 && !isValidPlate(plate) ? 'Type the number plate, like TS09AB1234.' : undefined;

  const saveLicence = async () => {
    if (!isValidDrivingLicence(licenceValue)) return;
    if (await run('licence', () => KycService.saveDelivery(token, { licenceNumber: tidyNumber(licenceValue) }))) setLicence(null);
  };
  const savePlate = async () => {
    if (!isValidPlate(plateValue)) return;
    if (await run('plate', () => KycService.saveDelivery(token, { vehicleNumber: tidyNumber(plateValue) }))) setPlate(null);
  };
  const pickType = (type: VehicleType) => void run('type', () => KycService.saveDelivery(token, { vehicleType: type }));

  const addPhoto = async (kind: DeliveryPhotoKind, from: 'camera' | 'library') => {
    if (from === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return setCameraDenied(true);
      setCameraDenied(false);
    }
    const shot =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    const asset = shot.canceled ? null : shot.assets[0];
    if (!asset) return;
    void run(kind, async () => KycService.sendDeliveryPhoto(token, kind, await toUploadJpeg(asset, PHOTO_SIDE)));
  };

  const editable = !!c && EDITABLE.includes(c.status);
  const ready = !!c && !!c.licence.number && c.licence.photo && !!c.vehicle.type && !!c.vehicle.number && c.vehicle.photo;

  return (
    <ScreenContainer title="Delivery partner">
      <Text style={styles.intro}>Deliver orders for Ruxstar shops on your bike or scooter. Add your licence and vehicle once; the Ruxstar team checks them.</Text>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {c ? (
          !c.identityVerified ? (
            <View style={styles.section}>
              <Note icon="shield-checkmark-outline" tone={Brand.primarySoft}>Verify your identity first. It takes a few minutes with DigiLocker, your PAN and a selfie.</Note>
              <PrimaryButton label="Verify identity" onPress={() => router.push('/(customer)/settings/verification')} />
            </View>
          ) : approved ? (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Ionicons name="bicycle" size={22} color={Brand.text} />
                <Text style={styles.sectionTitle}>You can deliver with Ruxstar</Text>
                <Badge label="Approved" tone="success" />
              </View>
              <Text style={styles.muted}>
                {c.vehicle.type === 'scooter' ? 'Scooter' : 'Bike'} {c.vehicle.number}
              </Text>
              <Note icon="phone-portrait-outline" tone={Brand.primarySoft}>
                Open the Ruxstar Delivery app and sign in with this same account. Go online there to get deliveries, and shops you work for can send you theirs.
              </Note>
            </View>
          ) : (
            <>
              <StatusNote c={c} />
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Ionicons name="card-outline" size={22} color={Brand.text} />
                  <Text style={styles.sectionTitle}>Driving licence</Text>
                  {c.licence.number && c.licence.photo ? <Badge label="Added" tone="success" /> : null}
                </View>
                <InputField
                  label="Licence number"
                  value={licenceValue}
                  onChangeText={(value) => setLicence(value.toUpperCase().slice(0, 24))}
                  placeholder="TS09 20190001234"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={editable}
                  returnKeyType="done"
                  onSubmitEditing={saveLicence}
                  error={licenceError}
                />
                {editable && licence !== null && licence !== c.licence.number ? (
                  <PrimaryButton label="Save licence number" loading={busy === 'licence'} disabled={!isValidDrivingLicence(licenceValue)} onPress={saveLicence} />
                ) : null}
                <PhotoRow kind="licence" label="Photo of the front of your licence" added={c.licence.photo} editable={editable} busy={busy === 'licence'} onAdd={addPhoto} />
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Ionicons name="bicycle-outline" size={22} color={Brand.text} />
                  <Text style={styles.sectionTitle}>Your vehicle</Text>
                  {c.vehicle.type && c.vehicle.number && c.vehicle.photo ? <Badge label="Added" tone="success" /> : null}
                </View>
                <View style={styles.chips}>
                  <ChoiceChips options={VEHICLES} value={(c.vehicle.type ?? '') as VehicleType} onChange={(type) => editable && pickType(type)} />
                </View>
                <InputField
                  label="Number plate"
                  value={plateValue}
                  onChangeText={(value) => setPlate(value.toUpperCase().slice(0, 16))}
                  placeholder="TS09AB1234"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={editable}
                  returnKeyType="done"
                  onSubmitEditing={savePlate}
                  error={plateError}
                />
                {editable && plate !== null && plate !== c.vehicle.number ? (
                  <PrimaryButton label="Save number plate" loading={busy === 'plate'} disabled={!isValidPlate(plateValue)} onPress={savePlate} />
                ) : null}
                <PhotoRow kind="vehicle" label="Photo of the vehicle with its number plate" added={c.vehicle.photo} editable={editable} busy={busy === 'vehicle'} onAdd={addPhoto} />
              </View>

              {cameraDenied ? (
                <View style={styles.denied}>
                  <Text style={styles.error}>Camera access is off. Allow it in Settings, or choose a photo from your gallery.</Text>
                  <TextLink label="Open Settings" onPress={() => Linking.openSettings()} />
                </View>
              ) : null}

              {editable ? (
                <View style={styles.submit}>
                  <Text style={styles.muted}>{ready ? 'All set. Send it to the Ruxstar team to check.' : 'Add the licence and vehicle with both photos to send for review.'}</Text>
                  <PrimaryButton label="Send for review" disabled={!ready} loading={busy === 'submit'} onPress={() => void run('submit', () => KycService.submitDelivery(token))} />
                </View>
              ) : null}
            </>
          )
        ) : null}
        {failure ? <ErrorBanner message={failure} /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

interface PhotoRowProps {
  kind: DeliveryPhotoKind;
  label: string;
  added: boolean;
  editable: boolean;
  busy: boolean;
  onAdd: (kind: DeliveryPhotoKind, from: 'camera' | 'library') => void;
}

function PhotoRow({ kind, label, added, editable, busy, onAdd }: PhotoRowProps) {
  return (
    <View style={styles.photo}>
      <View style={styles.photoHead}>
        <Ionicons name={added ? 'checkmark-circle' : 'camera-outline'} size={20} color={added ? Brand.success : Brand.textMuted} />
        <Text style={styles.photoLabel}>{label}</Text>
      </View>
      {editable ? (
        <>
          <PrimaryButton label={added ? 'Take a new photo' : 'Take photo'} variant={added ? 'outline' : 'primary'} loading={busy} onPress={() => onAdd(kind, 'camera')} />
          <TextLink muted label="Choose from gallery" onPress={() => onAdd(kind, 'library')} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { ...Typography.body, color: Brand.textMuted, marginBottom: Spacing.two },
  section: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, marginBottom: Spacing.three },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sectionTitle: { ...Typography.bodyStrong, fontSize: 18, color: Brand.text, flex: 1 },
  chips: { marginHorizontal: -Spacing.three },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  error: { ...Typography.caption, fontSize: 14, color: Brand.error },
  strong: { fontFamily: Typography.bodyStrong.fontFamily, color: Brand.text },
  note: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt, marginBottom: Spacing.two },
  noteText: { ...Typography.caption, fontSize: 14, color: Brand.text, flex: 1 },
  photo: { gap: Spacing.two, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.border },
  photoHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  photoLabel: { ...Typography.body, fontSize: 14, color: Brand.text, flex: 1 },
  denied: { gap: Spacing.one, marginBottom: Spacing.three },
  submit: { gap: Spacing.two, paddingTop: Spacing.two },
});
