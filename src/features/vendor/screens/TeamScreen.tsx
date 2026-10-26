import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { MODULES } from '@/features/vendor/lib/capabilities';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { VendorService } from '@/services/vendor-service';
import type { Staff, StaffStatus } from '@/types/vendor';

const STATUS: Record<StaffStatus, { label: string; tone: 'neutral' | 'warning' | 'success' | 'accent' }> = {
  invited: { label: 'Invited', tone: 'neutral' },
  requested: { label: 'Requested', tone: 'accent' },
  pending_kyc: { label: 'Waiting for KYC', tone: 'warning' },
  active: { label: 'Active', tone: 'success' },
};

function StaffAvatarRow({ person }: { person: Staff }) {
  return (
    <View style={styles.person}>
      <Avatar name={person.name} size={44} />
      <View style={styles.flex}>
        <Text style={styles.name}>{person.name}</Text>
        <Text style={styles.sub}>
          @{person.username} · {MODULES[person.module].label}
        </Text>
      </View>
    </View>
  );
}

/** Staff for this business: join requests to answer, then everyone invited or working here. */
export function TeamScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => VendorService.team(token));
  const [busyId, setBusyId] = useState<string | null>(null);
  useRefetchOnFocus(reload);

  const respond = async (id: string, accept: boolean) => {
    setBusyId(id);
    try {
      await VendorService.respond(token, id, accept);
      Feedback.success();
      reload();
    } catch {
      Feedback.error();
    } finally {
      setBusyId(null);
    }
  };

  const requests = data?.filter((s) => s.status === 'requested') ?? [];
  const members = data?.filter((s) => s.status !== 'requested') ?? [];

  return (
    <ScreenContainer title="Team" footer={<PrimaryButton label="Invite staff" onPress={() => router.push('/(vendor)/team/invite')} />}>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload}>
        {requests.length > 0 ? (
          <>
            <Text style={styles.section}>Requests to join</Text>
            {requests.map((person) => (
              <View key={person.id} style={styles.request}>
                <StaffAvatarRow person={person} />
                <View style={styles.actions}>
                  <Chip label="Accept" disabled={busyId === person.id} onPress={() => respond(person.id, true)} />
                  <Chip label="Decline" disabled={busyId === person.id} onPress={() => respond(person.id, false)} />
                </View>
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.section}>Staff</Text>
        {members.map((person) => (
          <ListRow
            key={person.id}
            title={person.name}
            subtitle={`@${person.username} · ${MODULES[person.module].label}`}
            right={<Badge label={STATUS[person.status].label} tone={STATUS[person.status].tone} />}
            onPress={() => router.push({ pathname: '/(vendor)/team/[id]', params: { id: person.id } })}
          />
        ))}
        {members.length === 0 ? (
          <EmptyState icon="people-outline" title="No staff yet" message="Invite someone to help run this business." />
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  name: { ...Typography.body, color: Brand.text },
  sub: { ...Typography.caption, color: Brand.textMuted },
  request: { gap: Spacing.two, paddingVertical: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two },
});
