import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { TeamService } from '@/services/team-service';
import type { Team, TeamMember, TeamPermission } from '@/types/team';
import { PermissionPicker } from '../components/PermissionPicker';
import { MEMBER_STATUS, cleanUsername, inviteEnds } from '../lib/team';

const errorText = (err: unknown) =>
  err instanceof ApiError && err.status > 0 && err.kind !== 'server' ? err.message : 'Could not reach Ruxstar. Check your connection and try again.';
const retryable = (err: unknown) => err instanceof ApiError && (err.kind === 'network' || err.kind === 'timeout');
const USERNAME = /^[a-z0-9_.]{3,20}$/;

function Invite({ businessId, team }: { businessId: string; team: Team }) {
  const router = useRouter();
  const token = useAuthToken();
  const [username, setUsername] = useState('');
  const [permissions, setPermissions] = useState<TeamPermission[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; banner?: string } | null>(null);
  const key = useRef(newIdempotencyKey());
  const clean = cleanUsername(username);
  const ready = USERNAME.test(clean) && permissions.length > 0;

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await TeamService.invite(token, businessId, clean, permissions, key.current);
      Feedback.success();
      router.back();
    } catch (err) {
      Feedback.error();
      if (!retryable(err)) key.current = newIdempotencyKey();
      const onField = err instanceof ApiError && err.detailFor('username');
      setError(onField ? { field: err.message } : { banner: errorText(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer
      title="Invite someone"
      footer={
        <>
          {error?.banner ? <ErrorBanner message={error.banner} /> : null}
          <PrimaryButton label="Send invite" onPress={send} loading={busy} disabled={!ready} />
        </>
      }
    >
      <InputField
        label="Their Ruxstar username"
        value={username}
        onChangeText={(v) => {
          setUsername(v);
          if (error?.field) setError(null);
        }}
        placeholder="@username"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={21}
        error={error?.field}
        hint="They get a notification and have 7 days to accept."
      />
      <Text style={styles.section}>What they can do</Text>
      <PermissionPicker catalog={team.permissions} value={permissions} onChange={setPermissions} />
    </ScreenContainer>
  );
}

function Member({ businessId, team, member }: { businessId: string; team: Team; member: TeamMember }) {
  const router = useRouter();
  const token = useAuthToken();
  const [permissions, setPermissions] = useState(member.permissions);
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invited = member.status === 'invited';
  const changed = permissions.join() !== member.permissions.join();
  const status = MEMBER_STATUS[member.status];

  const save = async () => {
    setBusy('save');
    setError(null);
    try {
      await TeamService.setPermissions(token, businessId, member.id, permissions);
      Feedback.success();
      router.back();
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('remove');
    setError(null);
    try {
      await TeamService.remove(token, businessId, member.id);
      Feedback.success();
      setConfirming(false);
      router.back();
    } catch (err) {
      Feedback.error();
      setConfirming(false);
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScreenContainer
      title={invited ? 'Invite' : 'Team member'}
      footer={
        <>
          {error ? <ErrorBanner message={error} /> : null}
          <PrimaryButton label="Save changes" onPress={save} loading={busy === 'save'} disabled={!changed || permissions.length === 0 || !!busy} />
        </>
      }
    >
      <View style={styles.head}>
        <Avatar name={member.person.name} uri={member.person.avatar ?? undefined} size={56} />
        <View style={styles.headText}>
          <Text style={styles.name}>{member.person.name}</Text>
          {member.person.username ? <Text style={styles.muted}>@{member.person.username}</Text> : null}
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>
      {member.status === 'waiting' ? (
        <Text style={styles.muted}>They joined, but nothing works for them until their identity verification is approved.</Text>
      ) : invited && member.expiresAt ? (
        <Text style={styles.muted}>{inviteEnds(member.expiresAt)}. You can change what they&apos;ll be able to do before they accept.</Text>
      ) : null}
      <Text style={styles.section}>What they can do</Text>
      <PermissionPicker catalog={team.permissions} value={permissions} onChange={setPermissions} />
      {permissions.length === 0 ? <Text style={styles.warn}>Pick at least one, or remove them from the team.</Text> : null}
      <View style={styles.remove}>
        <TextLink label={invited ? 'Cancel this invite' : 'Remove from the team'} onPress={() => setConfirming(true)} />
      </View>
      <ConfirmSheet
        visible={confirming}
        title={invited ? 'Cancel this invite?' : `Remove ${member.person.name}?`}
        message={invited ? 'They won’t be able to accept it.' : 'Their access ends at once. They’ll be told.'}
        confirmLabel={invited ? 'Cancel invite' : 'Remove'}
        loading={busy === 'remove'}
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </ScreenContainer>
  );
}

/** Invites someone (no `memberId`), or changes what one person may do and removes them. */
export function MemberScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id, memberId } = useLocalSearchParams<{ id: string; memberId?: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => TeamService.get(token, id), id);
  const member = memberId ? data?.members.find((m) => m.id === memberId) : undefined;

  if (data && !memberId) return <Invite businessId={id} team={data} />;
  if (data && member) return <Member key={member.id} businessId={id} team={data} member={member} />;
  return (
    <ScreenContainer title={memberId ? 'Team member' : 'Invite someone'}>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={5}>
        <EmptyState icon="person-remove-outline" title="Not on the team" message="They left, were removed, or their invite ran out." actionLabel="Go back" onAction={() => router.back()} />
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  headText: { flex: 1, gap: 2 },
  name: { ...Typography.title, color: Brand.text },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  warn: { ...Typography.caption, color: Brand.warning },
  section: { ...Typography.bodyStrong, color: Brand.text, marginTop: Spacing.three },
  remove: { alignItems: 'flex-start', marginTop: Spacing.three },
});
