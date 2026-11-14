import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
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
import type { Contact } from '@/types/chat';
import type { Team, TeamMember, TeamPermission } from '@/types/team';
import { PermissionPicker } from '../components/PermissionPicker';
import { PayFields, payDraft, payDraftOk, payOfDraft, type PayDraft } from '../components/PayFields';
import { PersonSearch } from '../components/PersonSearch';
import { MEMBER_STATUS, inviteEnds, payLine } from '../lib/team';

const errorText = (err: unknown) =>
  err instanceof ApiError && err.status > 0 && err.kind !== 'server' ? err.message : 'Could not reach Ruxstar. Check your connection and try again.';
const retryable = (err: unknown) => err instanceof ApiError && (err.kind === 'network' || err.kind === 'timeout');

function Invite({ businessId, team }: { businessId: string; team: Team }) {
  const router = useRouter();
  const token = useAuthToken();
  const [person, setPerson] = useState<Contact | null>(null);
  const [permissions, setPermissions] = useState<TeamPermission[]>([]);
  const [pay, setPay] = useState<PayDraft>(() => payDraft(null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; pay?: string; banner?: string } | null>(null);
  const key = useRef(newIdempotencyKey());
  const taken = useMemo(() => new Set(team.members.map((m) => m.person.id)), [team.members]);
  const ready = !!person && permissions.length > 0 && payDraftOk(pay);

  const send = async () => {
    if (!person) return;
    setBusy(true);
    setError(null);
    try {
      await TeamService.invite(token, businessId, person.username, permissions, payOfDraft(pay), key.current);
      Feedback.success();
      router.back();
    } catch (err) {
      Feedback.error();
      if (!retryable(err)) key.current = newIdempotencyKey();
      const onField = err instanceof ApiError && err.detailFor('username');
      const onPay = err instanceof ApiError && err.detailFor('pay');
      setError(onField ? { field: err.message } : onPay ? { pay: err.message } : { banner: errorText(err) });
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
      <PersonSearch
        picked={person}
        onPick={(next) => {
          setPerson(next);
          if (error?.field) setError(null);
        }}
        taken={taken}
        error={error?.field}
      />
      <Text style={styles.section}>What they can do</Text>
      <PermissionPicker catalog={team.permissions} value={permissions} onChange={setPermissions} />
      <PayFields value={pay} onChange={setPay} error={error?.pay} />
    </ScreenContainer>
  );
}

function Member({ businessId, team, member }: { businessId: string; team: Team; member: TeamMember }) {
  const router = useRouter();
  const token = useAuthToken();
  const [permissions, setPermissions] = useState(member.permissions);
  const [pay, setPay] = useState<PayDraft>(() => payDraft(member.pay));
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invited = member.status === 'invited';
  const permissionsChanged = permissions.join() !== member.permissions.join();
  const payChanged = invited && JSON.stringify(payOfDraft(pay)) !== JSON.stringify(member.pay);
  const changed = permissionsChanged || payChanged;
  const status = MEMBER_STATUS[member.status];
  const agreed = payLine(member.pay);

  const save = async () => {
    setBusy('save');
    setError(null);
    try {
      await TeamService.update(token, businessId, member.id, {
        ...(permissionsChanged ? { permissions } : {}),
        ...(payChanged ? { pay: payOfDraft(pay) } : {}),
      });
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
          <PrimaryButton
            label="Save changes"
            onPress={save}
            loading={busy === 'save'}
            disabled={!changed || permissions.length === 0 || !payDraftOk(pay) || !!busy}
          />
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
      {invited ? (
        <PayFields value={pay} onChange={setPay} />
      ) : (
        <>
          <Text style={styles.section}>Pay</Text>
          <Text style={styles.muted}>{agreed ? `${agreed}${member.pay?.note ? ` · ${member.pay.note}` : ''}` : 'None was set with the invite.'}</Text>
          <Text style={styles.hint}>This is what they accepted, so it can&apos;t change here.</Text>
        </>
      )}
      <View style={styles.remove}>
        {invited ? null : (
          <TextLink
            label="See what they did"
            onPress={() =>
              router.push({ pathname: '/(vendor)/businesses/[id]/activity', params: { id: businessId, by: member.person.id, name: member.person.name } })
            }
          />
        )}
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
  hint: { ...Typography.caption, color: Brand.textFaint },
  section: { ...Typography.bodyStrong, color: Brand.text, marginTop: Spacing.three },
  remove: { alignItems: 'flex-start', gap: Spacing.three, marginTop: Spacing.three },
});
