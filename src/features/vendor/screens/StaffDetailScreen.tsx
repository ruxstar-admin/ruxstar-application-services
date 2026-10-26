import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { CapabilityToggles } from '@/features/vendor/components/CapabilityToggles';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { VendorService } from '@/services/vendor-service';
import type { Staff } from '@/types/vendor';

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

function StaffEditor({ person }: { person: Staff }) {
  const router = useRouter();
  const token = useAuthToken();
  const [capabilities, setCapabilities] = useState(person.capabilities);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);

  const dirty = !sameSet(capabilities, person.capabilities);

  const save = async () => {
    setSaving(true);
    setFailed(false);
    try {
      await VendorService.setCapabilities(token, person.id, capabilities);
      Feedback.success();
      router.back();
    } catch {
      Feedback.error();
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const revoke = async () => {
    setRevoking(true);
    try {
      await VendorService.revoke(token, person.id);
      Feedback.success();
      router.back();
    } catch {
      Feedback.error();
      setConfirming(false);
      setFailed(true);
    } finally {
      setRevoking(false);
    }
  };

  return (
    <ScreenContainer title={person.name} footer={<PrimaryButton label="Save permissions" onPress={save} loading={saving} disabled={!dirty} />}>
      <View style={styles.head}>
        <Avatar name={person.name} size={56} />
        <View style={styles.flex}>
          <Text style={styles.sub}>@{person.username}</Text>
          {person.status === 'pending_kyc' ? <Badge label="Permissions off until KYC is approved" tone="warning" /> : null}
          {person.status === 'invited' ? <Badge label="Waiting for them to accept" tone="neutral" /> : null}
        </View>
      </View>

      <CapabilityToggles module={person.module} granted={capabilities} onChange={setCapabilities} />
      {failed ? <ErrorBanner message="That did not go through. Please try again." /> : null}

      <PrimaryButton label="Revoke access" variant="outline" onPress={() => setConfirming(true)} />

      <ConfirmSheet
        visible={confirming}
        title={`Revoke ${person.name}'s access?`}
        message="They lose access immediately and any open work returns to you. This is recorded in the audit log."
        confirmLabel="Revoke access"
        loading={revoking}
        onConfirm={revoke}
        onCancel={() => setConfirming(false)}
      />
    </ScreenContainer>
  );
}

export function StaffDetailScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => VendorService.team(token));
  const person = data?.find((s) => s.id === id);

  return person ? (
    <StaffEditor person={person} />
  ) : (
    <ScreenContainer title="Staff">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={4}>
        <Text style={styles.sub}>This person is no longer on your team.</Text>
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: Spacing.one },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  sub: { ...Typography.body, color: Brand.textMuted },
});
