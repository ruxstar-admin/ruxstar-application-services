import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { AdminService } from '@/services/admin-service';
import { useAuthStore } from '@/stores/auth-store';
import type { AccountDetail } from '@/types/admin';
import { useAccess, useCan } from '../access';
import { AccountBadge, roleText } from '../components/AccountResults';
import { Card, Fact, Facts, Note, ReasonSheet, consoleStyles, errorText } from '../components/parts';
import { KYC_LABEL, shortDate } from '../labels';

type Busy = 'suspend' | 'unlock' | 'signOut' | null;

function Actions({ user, onChanged }: { user: AccountDetail; onChanged: (u: AccountDetail, message: string) => void }) {
  const token = useAuthToken();
  const me = useAuthStore((s) => s.userId);
  const access = useAccess();
  const canManage = useCan('users.manage');
  const [suspending, setSuspending] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const keys = useRef({ suspend: newIdempotencyKey(), unlock: newIdempotencyKey(), signOut: newIdempotencyKey() });

  const why =
    user.id === me
      ? 'This is your own account.'
      : user.roles.admin
        ? "Admins can't be changed here."
        : user.roles.ruxstarStaff && !access.admin
          ? 'Only an admin can change a Ruxstar staff account.'
          : user.status === 'deleted'
            ? 'This account was deleted.'
            : null;
  if (!canManage) return null;
  if (why) return <Text style={consoleStyles.muted}>{why}</Text>;

  const run = async (kind: Exclude<Busy, null>, reason = '') => {
    setBusy(kind);
    setError(null);
    try {
      const k = keys.current[kind];
      const done =
        kind === 'suspend'
          ? await AdminService.suspend(token, user.id, reason, k)
          : kind === 'unlock'
            ? await AdminService.unlock(token, user.id, k)
            : await AdminService.signOutEverywhere(token, user.id, k);
      keys.current[kind] = newIdempotencyKey();
      Feedback.success();
      setSuspending(false);
      setSigningOut(false);
      onChanged(done, kind === 'suspend' ? 'Account put on hold.' : kind === 'unlock' ? 'Account unlocked.' : 'Signed out of every device.');
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const locked = user.status === 'locked' || !!user.signInLockedUntil;

  return (
    <View style={styles.actions}>
      {error ? <ErrorBanner message={error} /> : null}
      {user.status === 'active' ? <PrimaryButton label="Put on hold" onPress={() => setSuspending(true)} disabled={!!busy} /> : null}
      {locked ? <PrimaryButton label="Unlock" variant="outline" onPress={() => run('unlock')} loading={busy === 'unlock'} disabled={!!busy} /> : null}
      <PrimaryButton label="Sign out everywhere" variant="outline" onPress={() => setSigningOut(true)} disabled={!!busy || user.sessions === 0} />

      <ReasonSheet
        visible={suspending}
        title="Put on hold"
        prompt="Why is this account going on hold? Keep it for the team; the person sees a general message."
        placeholder="For example: three scam reports confirmed on 10 Nov."
        confirmLabel="Put on hold"
        loading={busy === 'suspend'}
        onConfirm={(reason) => run('suspend', reason)}
        onCancel={() => setSuspending(false)}
      />
      <ConfirmSheet
        visible={signingOut}
        title="Sign out everywhere?"
        message={`${user.name || 'This person'} is signed out of ${user.sessions === 1 ? 'their device' : `all ${user.sessions} devices`} and has to sign in again.`}
        confirmLabel="Sign out everywhere"
        loading={busy === 'signOut'}
        onConfirm={() => run('signOut')}
        onCancel={() => setSigningOut(false)}
      />
    </View>
  );
}

export function AccountScreen({ id }: { id: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const isAdmin = useAccess().admin;
  const canAudit = useCan('audit.view');
  const { data: user, loading, error, reload, setData } = useAsyncResource(() => AdminService.getAccount(token, id), id);
  const [done, setDone] = useState<string | null>(null);

  return (
    <ScreenContainer title="Account">
      <AsyncBoundary loading={loading} error={error} hasData={!!user} onRetry={reload} skeletonRows={5}>
        {user ? (
          <>
            <View style={styles.head}>
              <Avatar name={user.name || user.username} uri={user.avatarUrl ?? undefined} size={64} />
              <View style={styles.flex}>
                <Text style={styles.name}>{user.name || 'No name'}</Text>
                <Text style={consoleStyles.muted}>@{user.username}</Text>
                <View style={styles.badges}>
                  <Badge label={roleText(user)} tone={user.roles.admin || user.roles.ruxstarStaff ? 'accent' : 'neutral'} />
                  <AccountBadge status={user.status} />
                </View>
              </View>
            </View>

            {done ? <Note>{done}</Note> : null}
            {user.suspension ? (
              <Note tone="danger">
                On hold {timeAgo(user.suspension.at)}
                {user.suspension.by ? ` by ${user.suspension.by.name}` : ''}: {user.suspension.reason}
              </Note>
            ) : null}
            {user.signInLockedUntil && new Date(user.signInLockedUntil) > new Date() ? (
              <Note>Too many wrong passwords. Sign-in opens again {timeAgo(user.signInLockedUntil)}.</Note>
            ) : null}

            <Card>
              <Facts>
                <Fact label="Phone" value={user.phone} />
                <Fact label="Email" value={user.email ? `${user.email}${user.emailVerified ? '' : ' (not confirmed)'}` : '—'} />
                <Fact label="City" value={user.city ?? '—'} />
                <Fact label="Member since" value={shortDate(user.createdAt)} />
                <Fact label="Ruxstar Card" value={user.card ?? '—'} />
                <Fact label="Identity check" value={KYC_LABEL[user.kyc.base] ?? user.kyc.base} />
                <Fact label="Posts" value={String(user.stats.posts)} />
                <Fact label="Signed in on" value={user.sessions === 1 ? '1 device' : `${user.sessions} devices`} />
                <Fact label="Open reports on posts" value={String(user.openReports)} warn={user.openReports > 0} />
                {user.staff ? <Fact label="Ruxstar staff" value={user.staff.title} warn={user.staff.status !== 'active'} /> : null}
                <Fact label="Account id" value={user.id} />
              </Facts>
              {user.bio ? <Text style={consoleStyles.body}>{user.bio}</Text> : null}
            </Card>

            <Actions
              user={user}
              onChanged={(u, message) => {
                setData(u);
                setDone(message);
              }}
            />

            <View style={styles.links}>
              {canAudit ? <TextLink label="History for this account" onPress={() => router.push({ pathname: '/(admin)/audit', params: { target: user.id } })} /> : null}
              {user.staff && isAdmin ? <TextLink label="Manage staff access" onPress={() => router.push('/(admin)/staff')} /> : null}
            </View>
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  name: { ...Typography.title, color: Brand.text },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  actions: { gap: Spacing.two, marginTop: Spacing.two },
  links: { gap: Spacing.three, alignItems: 'flex-start', marginTop: Spacing.two },
});
