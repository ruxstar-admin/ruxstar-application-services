import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { WorkService } from '@/services/team-service';
import type { PermissionInfo, WorkInvite } from '@/types/team';
import { inviteEnds, payLine, permissionsLine } from '../lib/team';

const errorText = (err: unknown) =>
  err instanceof ApiError && err.status > 0 && err.kind !== 'server' ? err.message : 'Could not reach Ruxstar. Check your connection and try again.';

/** A team invite with Accept and Decline. `onAnswered` runs after either succeeds. */
export function InviteCard({ invite, catalog, onAnswered }: { invite: WorkInvite; catalog: PermissionInfo[]; onAnswered: (accepted: boolean) => void }) {
  const token = useAuthToken();
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const answer = async (accept: boolean) => {
    setBusy(accept ? 'accept' : 'decline');
    setError(null);
    try {
      await (accept ? WorkService.accept(token, invite.id) : WorkService.decline(token, invite.id));
      Feedback.success();
      onAnswered(accept);
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Avatar name={invite.business.name} uri={invite.business.photo ?? undefined} size={44} />
        <View style={styles.text}>
          <Text style={styles.name}>{invite.business.name}</Text>
          <Text style={styles.muted}>
            {invite.owner.name} invited you{invite.business.city ? ` · ${invite.business.city}` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.pay}>
        <Text style={styles.muted}>Pay</Text>
        {invite.pay ? (
          <>
            <Text style={styles.amount}>{payLine(invite.pay)}</Text>
            {invite.pay.note ? <Text style={styles.body}>{invite.pay.note}</Text> : null}
          </>
        ) : (
          <Text style={styles.body}>Not mentioned. Ask {invite.owner.name} before you accept.</Text>
        )}
      </View>
      <Text style={styles.body}>You&apos;d be able to: {permissionsLine(catalog, invite.permissions)}</Text>
      <Text style={styles.muted}>{inviteEnds(invite.expiresAt)}</Text>
      {error ? <ErrorBanner message={error} /> : null}
      <View style={styles.actions}>
        <View style={styles.flex}>
          <PrimaryButton label="Decline" variant="outline" onPress={() => answer(false)} loading={busy === 'decline'} disabled={!!busy} />
        </View>
        <View style={styles.flex}>
          <PrimaryButton label="Accept" onPress={() => answer(true)} loading={busy === 'accept'} disabled={!!busy} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.surface },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  text: { flex: 1, gap: 2 },
  name: { ...Typography.bodyStrong, color: Brand.text },
  body: { ...Typography.body, color: Brand.text },
  pay: { gap: 2, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  amount: { ...Typography.title, fontSize: 20, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  flex: { flex: 1 },
});
