import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { SelectField } from '@/components/ui/SelectField';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { DELIVERY_STATUS_LABEL } from '@/features/pod/lib/order';
import { MessageBubble } from '@/features/support/components/parts';
import { CATEGORIES, CATEGORY_LABEL, DESK_STATUS, PRIORITIES, PRIORITY, TEXT_MAX } from '@/features/support/lib/support';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { formatDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { AdminService } from '@/services/admin-service';
import { SupportDeskService } from '@/services/support-service';
import { useAuthStore } from '@/stores/auth-store';
import type { QueueStatus, StaffTicketDetail, SupportPriority, TicketPatch } from '@/types/support';
import { useCan } from '../access';
import { Card, Fact, Facts, Note, consoleStyles, errorText } from '../components/parts';
import { KYC_LABEL, shortDate } from '../labels';

const STATUSES = [
  { key: 'open', label: 'Open' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'resolved', label: 'Resolved' },
] as const satisfies readonly { key: QueueStatus; label: string }[];

const MODES = [
  { key: 'reply', label: 'Reply' },
  { key: 'note', label: 'Note for the team' },
] as const;

const NOBODY = 'Nobody';

/** Status, priority, topic and who has it. Each change saves at once. */
function Manage({ t, onChanged }: { t: StaffTicketDetail; onChanged: (next: StaffTicketDetail) => void }) {
  const token = useAuthToken();
  const me = useAuthStore((s) => s.userId);
  const agents = useAsyncResource(() => SupportDeskService.agents(token));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (patch: TicketPatch) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      onChanged(await SupportDeskService.update(token, t.id, patch, newIdempotencyKey()));
      Feedback.success();
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const options = [NOBODY, ...(agents.data ?? []).map((a) => `${a.name} (${a.title})`)];
  const assigned = t.assignee ? ((agents.data ?? []).find((a) => a.id === t.assignee!.id) ?? null) : null;

  return (
    <Card>
      {error ? <ErrorBanner message={error} /> : null}
      <Text style={styles.label}>Status</Text>
      <SegmentedTabs options={STATUSES} value={t.status === 'closed' ? 'resolved' : t.status} onChange={(status) => status !== t.status && save({ status })} />
      <Text style={styles.label}>Priority</Text>
      <ChoiceChips options={PRIORITIES} value={t.priority} onChange={(priority: SupportPriority) => priority !== t.priority && save({ priority })} secondary />
      <SelectField
        label="Assigned to"
        value={t.assignee ? (assigned ? `${assigned.name} (${assigned.title})` : t.assignee.name) : NOBODY}
        options={options}
        onChange={(label) => {
          const agent = (agents.data ?? []).find((a) => `${a.name} (${a.title})` === label);
          const next = agent?.id ?? null;
          if (next !== (t.assignee?.id ?? null)) save({ assigneeId: next });
        }}
        disabled={busy || !agents.data}
      />
      {me && t.assignee?.id !== me ? <TextLink label="Assign to me" onPress={() => save({ assigneeId: me })} /> : null}
      <SelectField
        label="Topic"
        value={CATEGORY_LABEL[t.category]}
        options={CATEGORIES.map((c) => c.label)}
        onChange={(label) => {
          const category = CATEGORIES.find((c) => c.label === label)?.key;
          if (category && category !== t.category) save({ category });
        }}
        disabled={busy}
      />
    </Card>
  );
}

/** A reply the customer sees, or a note only the team sees. */
function Composer({ t, onSent }: { t: StaffTicketDetail; onSent: (next: StaffTicketDetail) => void }) {
  const token = useAuthToken();
  const [mode, setMode] = useState<'reply' | 'note'>('reply');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'send' | 'resolve' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());

  const send = async (resolve: boolean) => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(resolve ? 'resolve' : 'send');
    setError(null);
    try {
      const next = await SupportDeskService.reply(token, t.id, { text: body, internal: mode === 'note', ...(resolve ? { status: 'resolved' as const } : {}) }, key.current);
      key.current = newIdempotencyKey();
      setText('');
      Feedback.success();
      onSent(next);
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.composer}>
      <SegmentedTabs options={MODES} value={mode} onChange={setMode} />
      {error ? <ErrorBanner message={error} /> : null}
      <InputField
        value={text}
        onChangeText={setText}
        multiline
        maxLength={TEXT_MAX}
        placeholder={mode === 'reply' ? `Write to ${t.requester.name || 'them'}. They are told at once.` : 'Only the Ruxstar team sees notes.'}
        accessibilityLabel={mode === 'reply' ? 'Reply' : 'Note'}
      />
      {mode === 'reply' ? (
        <>
          <PrimaryButton label="Send reply" onPress={() => send(false)} loading={busy === 'send'} disabled={!text.trim() || !!busy} />
          <PrimaryButton label="Send and resolve" variant="outline" onPress={() => send(true)} loading={busy === 'resolve'} disabled={!text.trim() || !!busy} />
        </>
      ) : (
        <PrimaryButton label="Add note" onPress={() => send(false)} loading={busy === 'send'} disabled={!text.trim() || !!busy} />
      )}
    </View>
  );
}

/** One help ticket for the Ruxstar team: who sent it, what it is about, the conversation, and answering it. */
export function SupportTicketScreen({ id }: { id: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const canManage = useCan('support.manage');
  const canSeePeople = useCan('users.view');
  const canSeeBusinesses = useCan('businesses.view');
  const canReview = useCan('kyc.review');
  const canAudit = useCan('audit.view');
  const { data, loading, error, reload, setData } = useAsyncResource(() => SupportDeskService.get(token, id), id);
  const [reopening, setReopening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const reopenKey = useRef(newIdempotencyKey());

  const reopen = async () => {
    if (!data?.context?.kycCaseId) return;
    setBusy(true);
    setFailure(null);
    try {
      await AdminService.reopenCase(token, data.context.kycCaseId, reopenKey.current);
      reopenKey.current = newIdempotencyKey();
      Feedback.success();
      setDone('Verification reopened. They have one more try and have been told.');
      reload();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setBusy(false);
      setReopening(false);
    }
  };

  const ctx = data?.context ?? null;
  const ctxLabels: Record<string, string> | null = ctx?.type === 'verification' ? KYC_LABEL : ctx?.type === 'delivery' ? DELIVERY_STATUS_LABEL : null;
  const ctxState = ctx?.state ? (ctxLabels?.[ctx.state] ?? ctx.state) : null;

  return (
    <ScreenContainer title={data?.number ?? 'Help ticket'}>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={5}>
        {data ? (
          <>
            <View style={styles.head}>
              <View style={styles.flex}>
                <Text style={styles.subject}>{data.subject}</Text>
                <Text style={consoleStyles.muted}>{`${data.number} · opened ${shortDate(data.createdAt)}`}</Text>
              </View>
              <View style={styles.badges}>
                <Badge {...DESK_STATUS[data.status]} />
                {data.overdue ? <Badge label="Overdue" tone="error" /> : <Badge {...PRIORITY[data.priority]} />}
              </View>
            </View>

            {done ? <Note>{done}</Note> : null}
            {failure ? <ErrorBanner message={failure} /> : null}

            <Card>
              <Facts>
                <Fact
                  label="From"
                  value={`${data.requester.name}${data.requester.username ? ` (@${data.requester.username})` : ''}${data.requester.status === 'locked' ? ', on hold' : data.requester.status === 'deleted' ? ', deleted' : ''}`}
                  warn={data.requester.status !== 'active'}
                />
                <Fact label="Topic" value={CATEGORY_LABEL[data.category]} />
                <Fact label="About" value={ctx ? `${ctx.label}${ctxState ? ` (${ctxState})` : ''}` : 'Nothing linked'} />
                <Fact label="Assigned to" value={data.assignee?.name ?? 'Nobody'} warn={!data.assignee && data.status === 'open'} />
                <Fact label="Reply by" value={data.slaDueAt ? formatDateTime(data.slaDueAt) : '—'} warn={data.overdue} />
                <Fact label="Last from" value={data.lastFrom === 'staff' ? 'Ruxstar' : 'Them'} />
              </Facts>
            </Card>

            {ctx?.type === 'verification' && ctx.state === 'locked' && ctx.kycCaseId && canReview ? (
              <PrimaryButton label="Reopen verification" variant="outline" onPress={() => setReopening(true)} disabled={busy} />
            ) : null}

            <View style={styles.links}>
              {canSeePeople && data.requester.status !== 'deleted' ? (
                <TextLink label="Open their account" onPress={() => router.push({ pathname: '/(admin)/account/[id]', params: { id: data.requester.id } })} />
              ) : null}
              {ctx?.type === 'business' && canSeeBusinesses ? (
                <TextLink label="Open the business" onPress={() => router.push({ pathname: '/(admin)/business/[id]', params: { id: ctx.id } })} />
              ) : null}
              {canAudit ? <TextLink label="History for this ticket" onPress={() => router.push({ pathname: '/(admin)/audit', params: { target: data.id } })} /> : null}
            </View>

            {canManage ? <Manage t={data} onChanged={setData} /> : null}

            <Text style={styles.section}>Conversation</Text>
            <View style={styles.thread}>
              {data.messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  text={m.text}
                  photos={m.photos}
                  at={m.at}
                  mine={m.from === 'staff'}
                  author={m.author.name}
                  internal={m.internal}
                />
              ))}
            </View>

            {canManage ? <Composer t={data} onSent={setData} /> : <Text style={consoleStyles.muted}>Answering tickets is not part of your access.</Text>}
          </>
        ) : null}
      </AsyncBoundary>

      <ConfirmSheet
        visible={reopening}
        title="Reopen verification?"
        message="They get one more try to send their details. They are told in the app."
        confirmLabel="Reopen"
        loading={busy}
        onConfirm={reopen}
        onCancel={() => setReopening(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, paddingVertical: Spacing.two },
  subject: { ...Typography.heading, color: Brand.text },
  badges: { gap: Spacing.one, alignItems: 'flex-end' },
  links: { gap: Spacing.three, alignItems: 'flex-start', marginTop: Spacing.one },
  label: { ...Typography.caption, color: Brand.textMuted },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three },
  thread: { gap: Spacing.three },
  composer: { gap: Spacing.two, marginTop: Spacing.three },
});
