import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextLink } from '@/components/ui/TextLink';
import { ROLES } from '@/constants/roles';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { RuxstarCard } from '@/features/kyc/components/RuxstarCard';
import { toUploadJpeg } from '@/features/profile/lib/profile-photo';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { KycService } from '@/services/kyc-service';
import { useAuthStore } from '@/stores/auth-store';
import type { BaseCase, KycCaseStatus, KycOverview, KycStepStatus, RuxstarCard as Card } from '@/types/kyc';

const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const EDITABLE: KycCaseStatus[] = ['not_started', 'in_progress', 'rejected'];
/** The API keeps selfies inside 1080 px, so sending more is wasted upload time. */
const SELFIE_SIDE = 1080;

const STEP_BADGE: Record<KycStepStatus, { label: string; tone: 'warning' | 'success' | 'error' } | null> = {
  not_started: null,
  pending: { label: 'Waiting', tone: 'warning' },
  verified: { label: 'Done', tone: 'success' },
  failed: { label: 'Try again', tone: 'error' },
};

const messageOf = (err: unknown) =>
  err instanceof ApiError
    ? err.kind === 'network'
      ? 'No internet connection. Check your network and try again.'
      : err.kind === 'timeout'
        ? 'This is taking longer than usual. Please try again.'
        : err.message
    : 'Something went wrong. Please try again.';

function Step({ n, title, status, active, children }: { n: number; title: string; status: KycStepStatus; active: boolean; children: React.ReactNode }) {
  const badge = STEP_BADGE[status];
  const done = status === 'verified';
  return (
    <View style={styles.step}>
      <View style={[styles.mark, active && styles.markActive, done && styles.markDone]}>
        {done ? <Ionicons name="checkmark" size={16} color={Brand.bg} /> : <Text style={[styles.markText, active && styles.markTextActive]}>{n}</Text>}
      </View>
      <View style={styles.stepBody}>
        <View style={styles.stepHead}>
          <Text style={styles.stepTitle}>{title}</Text>
          {badge ? <Badge label={badge.label} tone={badge.tone} /> : null}
        </View>
        {children}
      </View>
    </View>
  );
}

function CaseNote({ c, what }: { c: BaseCase; what: string }) {
  if (c.status === 'submitted') {
    return (
      <View style={styles.note}>
        <Ionicons name="time-outline" size={20} color={Brand.warning} />
        <Text style={styles.noteText}>Your {what} is with the Ruxstar team. We will let you know when it is reviewed, usually within a day.</Text>
      </View>
    );
  }
  if (c.status === 'rejected') {
    return (
      <View style={styles.note}>
        <Ionicons name="alert-circle-outline" size={20} color={Brand.error} />
        <Text style={styles.noteText}>
          <Text style={styles.strong}>Needs a change: </Text>
          {c.rejectionReason ?? 'Check your details and send again.'}
          {c.rejectionsLeft === 1 ? ' One more rejection puts this on hold.' : ''}
        </Text>
      </View>
    );
  }
  if (c.status === 'locked') {
    return (
      <View style={styles.note}>
        <Ionicons name="alert-circle-outline" size={20} color={Brand.error} />
        <Text style={styles.noteText}>Verification is on hold after several rejections. Contact Ruxstar support to continue.</Text>
      </View>
    );
  }
  return null;
}

/**
 * Identity verification. DigiLocker opens in the browser; coming back to the app checks it. The
 * selfie comes from the front camera only, since it is checked for liveness. Approval also opens
 * the vendor portal.
 */
export function VerificationScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const addRole = useAuthStore((s) => s.addRole);
  const { data, loading, error, reload, setData } = useAsyncResource(() => KycService.getOverview(token));
  useRefetchOnFocus(reload);
  const [card, setCard] = useState<Card | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pan, setPan] = useState('');
  const [panError, setPanError] = useState<string | null>(null);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);

  const approved = data?.base.status === 'approved';
  const aadhaarPending = data?.base.steps.aadhaar.status === 'pending';

  useEffect(() => {
    if (!approved) return;
    KycService.getCard(token).then(setCard, () => undefined);
  }, [approved, token]);

  useEffect(() => {
    if (approved) addRole(ROLES.VENDOR);
  }, [approved, addRole]);

  /** Runs one step. A failed check still changed the case (tries, reason), so reload it either way. */
  const run = useCallback(
    async (name: string, action: () => Promise<KycOverview | void>, onError: (message: string) => void = setFailure) => {
      setBusy(name);
      setFailure(null);
      try {
        const next = await action();
        if (next) setData(next);
        Feedback.success();
      } catch (err) {
        Feedback.error();
        onError(messageOf(err));
        reload();
      } finally {
        setBusy(null);
      }
    },
    [reload, setData],
  );

  // Coming back from DigiLocker in the browser.
  const checking = useRef(false);
  const checkAadhaar = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      setData(await KycService.checkAadhaar(token));
    } catch {
      // The manual "I have finished" button stays for a retry.
    } finally {
      checking.current = false;
    }
  }, [token, setData]);

  useEffect(() => {
    if (!aadhaarPending) return;
    const sub = AppState.addEventListener('change', (state) => state === 'active' && checkAadhaar());
    return () => sub.remove();
  }, [aadhaarPending, checkAadhaar]);

  const openDigilocker = () =>
    run('aadhaar', async () => {
      const { url } = await KycService.startAadhaar(token);
      await WebBrowser.openBrowserAsync(url, { dismissButtonStyle: 'close', showTitle: true });
      return KycService.checkAadhaar(token);
    });

  const submitPan = () => {
    const value = pan.trim().toUpperCase();
    if (!PAN.test(value)) return setPanError('A PAN has 10 characters, like ABCDE1234F.');
    setPanError(null);
    void run('pan', () => KycService.checkPan(token, value), setPanError);
  };

  const takeSelfie = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return setCameraDenied(true);
    setCameraDenied(false);
    const shot = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], cameraType: ImagePicker.CameraType.front, quality: 0.9 });
    const asset = shot.canceled ? null : shot.assets[0];
    if (!asset) return;
    setFaceError(null);
    void run('face', async () => KycService.sendSelfie(token, await toUploadJpeg(asset, SELFIE_SIDE)), setFaceError);
  };

  return (
    <ScreenContainer title="Verification">
      <Text style={styles.intro}>Verify once to get your Ruxstar Card, the Verified tick and the vendor portal.</Text>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {data ? (
          <>
            <View style={[styles.section, approved && styles.bare]}>
              <View style={styles.sectionHead}>
                <Ionicons name="shield-checkmark-outline" size={22} color={Brand.text} />
                <Text style={styles.sectionTitle}>Identity</Text>
                {approved ? <Badge label="Verified" tone="success" /> : null}
              </View>

              {approved ? (
                card ? (
                  <View style={styles.cardWrap}>
                    <RuxstarCard card={card} />
                  </View>
                ) : (
                  <Skeleton height={220} radius={24} />
                )
              ) : (
                <IdentitySteps
                  base={data.base}
                  busy={busy}
                  pan={pan}
                  panError={panError}
                  faceError={faceError}
                  cameraDenied={cameraDenied}
                  onPan={(value) => {
                    setPan(value.toUpperCase().replace(/\s/g, '').slice(0, 10));
                    setPanError(null);
                  }}
                  onDigilocker={openDigilocker}
                  onCheck={() => run('check', () => KycService.checkAadhaar(token))}
                  onSubmitPan={submitPan}
                  onSelfie={takeSelfie}
                  onSubmit={() => run('submit', () => KycService.submitIdentity(token))}
                />
              )}
            </View>

            {approved ? (
              <PrimaryButton label="Open vendor portal" variant="outline" onPress={() => router.push('/(vendor)/dashboard')} />
            ) : null}

            {failure ? <ErrorBanner message={failure} /> : null}
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

interface IdentityStepsProps {
  base: BaseCase;
  busy: string | null;
  pan: string;
  panError: string | null;
  faceError: string | null;
  cameraDenied: boolean;
  onPan: (value: string) => void;
  onDigilocker: () => void;
  onCheck: () => void;
  onSubmitPan: () => void;
  onSelfie: () => void;
  onSubmit: () => void;
}

function IdentitySteps({ base, busy, pan, panError, faceError, cameraDenied, onPan, onDigilocker, onCheck, onSubmitPan, onSelfie, onSubmit }: IdentityStepsProps) {
  const editable = EDITABLE.includes(base.status);
  const { aadhaar, pan: panStep, face } = base.steps;
  const allDone = aadhaar.status === 'verified' && panStep.status === 'verified' && face.status === 'verified';

  return (
    <>
      <CaseNote c={base} what="identity verification" />

      <Step n={1} title="Aadhaar with DigiLocker" status={aadhaar.status} active={editable && aadhaar.status !== 'verified'}>
        {aadhaar.status === 'verified' ? (
          <Text style={styles.muted}>
            {aadhaar.name} · XXXX XXXX {aadhaar.last4}
          </Text>
        ) : aadhaar.status === 'pending' ? (
          <>
            <Text style={styles.muted}>Finish in DigiLocker, then come back to the app.</Text>
            {editable ? (
              <>
                <PrimaryButton label="I have finished" loading={busy === 'check'} onPress={onCheck} />
                <TextLink muted label="Start again" onPress={onDigilocker} />
              </>
            ) : null}
          </>
        ) : (
          <>
            <Text style={aadhaar.reason ? styles.error : styles.muted}>
              {aadhaar.reason ?? 'Share your Aadhaar from DigiLocker. We keep only your name and the last 4 digits.'}
            </Text>
            {editable ? <PrimaryButton label="Continue with DigiLocker" loading={busy === 'aadhaar'} onPress={onDigilocker} /> : null}
          </>
        )}
      </Step>

      <Step n={2} title="PAN" status={panStep.status} active={editable && aadhaar.status === 'verified' && panStep.status !== 'verified'}>
        {panStep.status === 'verified' ? (
          <Text style={styles.muted}>{panStep.masked} · Name matches your Aadhaar</Text>
        ) : aadhaar.status !== 'verified' ? (
          <Text style={styles.muted}>After Aadhaar. The name on your PAN must match it.</Text>
        ) : editable ? (
          <>
            <InputField
              label="PAN number"
              value={pan}
              onChangeText={onPan}
              placeholder="ABCDE1234F"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              returnKeyType="done"
              onSubmitEditing={onSubmitPan}
              error={panError ?? panStep.reason ?? undefined}
            />
            <PrimaryButton label="Check PAN" loading={busy === 'pan'} disabled={pan.length !== 10} onPress={onSubmitPan} />
          </>
        ) : null}
      </Step>

      <Step n={3} title="Live selfie" status={face.status} active={editable && panStep.status === 'verified' && face.status !== 'verified'}>
        {face.status === 'verified' ? (
          <Text style={styles.muted}>Matched to your Aadhaar photo</Text>
        ) : panStep.status !== 'verified' ? (
          <Text style={styles.muted}>After PAN. We match it to your Aadhaar photo.</Text>
        ) : editable ? (
          <>
            {faceError || face.reason ? <Text style={styles.error}>{faceError ?? face.reason}</Text> : null}
            <Text style={styles.muted}>Face the camera in good light, without glasses or a cap. Your selfie is checked and then deleted.</Text>
            {cameraDenied ? (
              <View style={styles.denied}>
                <Text style={styles.error}>Camera access is off. Allow it in Settings to take your selfie.</Text>
                <TextLink label="Open Settings" onPress={() => Linking.openSettings()} />
              </View>
            ) : null}
            <PrimaryButton label="Take selfie" loading={busy === 'face'} onPress={onSelfie} />
          </>
        ) : null}
      </Step>

      {editable ? (
        <View style={styles.submit}>
          <Text style={styles.muted}>{allDone ? 'All set. Send it to the Ruxstar team for a final check.' : 'Finish all three steps to send for review.'}</Text>
          <PrimaryButton label="Send for review" disabled={!allDone} loading={busy === 'submit'} onPress={onSubmit} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  intro: { ...Typography.body, color: Brand.textMuted, marginBottom: Spacing.two },
  section: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, marginBottom: Spacing.three },
  /** Once verified, the card stands on the page by itself. */
  bare: { padding: 0, backgroundColor: 'transparent', borderWidth: 0 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sectionTitle: { ...Typography.bodyStrong, fontSize: 18, color: Brand.text, flex: 1 },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  error: { ...Typography.caption, fontSize: 14, color: Brand.error },
  strong: { fontFamily: Typography.bodyStrong.fontFamily, color: Brand.text },
  note: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  noteText: { ...Typography.caption, fontSize: 14, color: Brand.text, flex: 1 },
  step: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.two },
  mark: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.surfaceAlt },
  markActive: { backgroundColor: Brand.action },
  markDone: { backgroundColor: Brand.success },
  markText: { ...Typography.caption, fontFamily: Typography.bodyStrong.fontFamily, color: Brand.textMuted },
  markTextActive: { color: Brand.onAction },
  stepBody: { flex: 1, gap: Spacing.two, paddingTop: 3 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepTitle: { ...Typography.bodyStrong, color: Brand.text },
  denied: { gap: Spacing.one },
  submit: { gap: Spacing.two, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.border },
  cardWrap: { gap: Spacing.three },
});
