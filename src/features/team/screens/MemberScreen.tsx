import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { formatDay } from '@/lib/dates';
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Notice({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.notice}>
      <Ionicons name={icon} size={18} color={Brand.warning} />
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

function Action({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={Brand.primarySoft} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
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
      <View style={styles.hero}>
        <Avatar name={member.person.name} uri={member.person.avatar ?? undefined} size={88} />
        <View style={styles.heroText}>
          <Text style={styles.name} numberOfLines={2}>
            {member.person.name}
          </Text>
          {member.person.username ? <Text style={styles.muted}>@{member.person.username}</Text> : null}
        </View>
        <Badge label={status.label} tone={status.tone} />
        <View style={styles.stats}>
          <Stat label={invited ? 'Invited' : 'Joined'} value={formatDay(invited || !member.joinedAt ? member.invitedAt : member.joinedAt)} />
          <View style={styles.statDivider} />
          <Stat label="Can do" value={`${permissions.length} of ${team.permissions.length}`} />
          <View style={styles.statDivider} />
          <Stat label="Pay" value={agreed ?? 'Not set'} />
        </View>
      </View>
      {member.status === 'waiting' ? (
        <Notice icon="hourglass-outline" text="They joined, but nothing works for them until their identity verification is approved." />
      ) : invited && member.expiresAt ? (
        <Notice icon="mail-outline" text={`${inviteEnds(member.expiresAt)}. You can change what they'll be able to do before they accept.`} />
      ) : null}
      <View style={styles.actions}>
        <Action
          icon="chatbubble-outline"
          label="Message"
          onPress={() =>
            router.push({
              pathname: '/(customer)/chat/with/[userId]',
              params: { userId: member.person.id, title: member.person.name, username: member.person.username ?? '', avatar: member.person.avatar ?? '' },
            })
          }
        />
        {member.person.username ? (
          <Action icon="person-outline" label="Profile" onPress={() => router.push({ pathname: '/(customer)/user/[id]', params: { id: member.person.id } })} />
        ) : null}
        {invited ? null : (
          <Action
            icon="time-outline"
            label="Activity"
            onPress={() =>
              router.push({ pathname: '/(vendor)/businesses/[id]/activity', params: { id: businessId, by: member.person.id, name: member.person.name } })
            }
          />
        )}
      </View>

      <Text style={styles.section}>What they can do</Text>
      <PermissionPicker catalog={team.permissions} value={permissions} onChange={setPermissions} />
      {permissions.length === 0 ? <Text style={styles.warn}>Pick at least one, or remove them from the team.</Text> : null}
      {invited ? (
        <PayFields value={pay} onChange={setPay} />
      ) : (
        <>
          <Text style={styles.section}>Pay</Text>
          <View style={styles.card}>
            <Text style={styles.payValue}>{agreed ?? 'None was set with the invite.'}</Text>
            {member.pay?.note ? <Text style={styles.muted}>{member.pay.note}</Text> : null}
            <Text style={styles.hint}>This is what they accepted, so it can&apos;t change here.</Text>
          </View>
        </>
      )}
      <View style={styles.remove}>
        <PrimaryButton label={invited ? 'Cancel this invite' : 'Remove from the team'} variant="outline" onPress={() => setConfirming(true)} disabled={!!busy} />
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
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.xl,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    overflow: 'hidden',
  },
  heroText: { alignItems: 'center', gap: 2 },
  name: { ...Typography.title, color: Brand.text, textAlign: 'center' },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  stats: { flexDirection: 'row', alignSelf: 'stretch', marginTop: Spacing.two, borderTopWidth: 1, borderTopColor: Brand.border },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: Spacing.three, paddingHorizontal: Spacing.one },
  statValue: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  statLabel: { ...Typography.caption, fontSize: 12, color: Brand.textMuted },
  statDivider: { width: 1, backgroundColor: Brand.border },
  notice: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  noticeText: { ...Typography.caption, fontSize: 14, color: Brand.text, flex: 1 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  actionLabel: { ...Typography.caption, fontFamily: Fonts.semibold, color: Brand.text },
  pressed: { opacity: 0.7 },
  card: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  payValue: { ...Typography.bodyStrong, color: Brand.text },
  warn: { ...Typography.caption, color: Brand.warning },
  hint: { ...Typography.caption, color: Brand.textFaint },
  section: { ...Typography.bodyStrong, color: Brand.text, marginTop: Spacing.three },
  remove: { marginTop: Spacing.four },
});
