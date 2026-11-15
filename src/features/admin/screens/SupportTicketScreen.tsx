import { useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
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
import type { QueueStatus, StaffTicketDetail, SupportAgent, TicketPatch } from '@/types/support';
import { useCan } from '../access';
import { OptionList } from '../components/filters';
import { Note, Row, consoleStyles, errorText } from '../components/parts';
import { KYC_LABEL, shortDate } from '../labels';

const STATUSES = [
  { key: 'open', label: 'Open' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'resolved', label: 'Resolved' },
] as const satisfies readonly { key: QueueStatus; label: string }[];

/** The conversation shows this many of the latest messages until it is opened in full. */
const LATEST = 3;

type Mode = 'reply' | 'note';
type Panel = 'menu' | 'assign' | 'priority' | 'topic' | 'resolve' | 'reopen';

const PANEL_TITLE: Record<Panel, string> = {
  menu: 'Ticket',
  assign: 'Assigned to',
  priority: 'Priority',
  topic: 'Topic',
  resolve: 'Resolve this ticket?',
  reopen: 'Reopen verification?',
};

/** A titled part of the ticket, with a line above it. */
function Block({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.block}>
      <View style={styles.blockHead}>
        <Text style={styles.blockTitle} accessibilityRole="header">
          {title}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

/** One fact in the two-column grid; with `onPress` it opens a picker to change it. */
function Info({ label, value, warn, onPress }: { label: string; value: string; warn?: boolean; onPress?: () => void }) {
  const body = (
    <>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoLine}>
        <Text style={[styles.infoValue, warn && styles.warn]} numberOfLines={2}>
          {value}
        </Text>
        {onPress ? <Ionicons name="chevron-down" size={14} color={Brand.textMuted} /> : null}
      </View>
    </>
  );
  if (!onPress) return <View style={styles.info}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint="Opens the choices"
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.info, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

function ModePill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={() => {
        if (active) return;
        Feedback.select();
        onPress();
      }}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

/** Pinned under the ticket: a reply the customer sees, or a note only the team sees. */
function Composer({ t, mode, onMode, onSent }: { t: StaffTicketDetail; mode: Mode; onMode: (mode: Mode) => void; onSent: (next: StaffTicketDetail) => void }) {
  const token = useAuthToken();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());
  const ready = !!text.trim() && !busy;

  const send = async (resolve: boolean) => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
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
      setBusy(false);
    }
  };

  return (
    <View style={styles.composer}>
      <View style={styles.modes} accessibilityRole="tablist">
        <ModePill label="Reply" active={mode === 'reply'} onPress={() => onMode('reply')} />
        <ModePill label="Note for the team" active={mode === 'note'} onPress={() => onMode('note')} />
        <View style={styles.flex} />
        {mode === 'reply' && ready ? <TextLink muted label="Send and resolve" onPress={() => send(true)} /> : null}
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, mode === 'note' && styles.inputNote]}
          value={text}
          onChangeText={setText}
          placeholder={mode === 'reply' ? `Write to ${t.requester.name || 'them'}` : 'Only the Ruxstar team sees notes'}
          placeholderTextColor={Brand.textFaint}
          multiline
          maxLength={TEXT_MAX}
          editable={!busy}
          accessibilityLabel={mode === 'reply' ? 'Reply' : 'Note'}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={mode === 'reply' ? 'Send reply' : 'Add note'}
          onPress={() => send(false)}
          disabled={!ready}
          hitSlop={8}
          style={[styles.send, !ready && styles.sendOff]}
        >
          <Ionicons name={mode === 'reply' ? 'arrow-up' : 'checkmark'} size={20} color={Brand.onAction} />
        </Pressable>
      </View>
    </View>
  );
}

/** One help ticket for the Ruxstar team: who sent it, what it is about, its state, the conversation, and answering it. */
export function SupportTicketScreen({ id }: { id: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const me = useAuthStore((s) => s.userId);
  const canManage = useCan('support.manage');
  const canSeePeople = useCan('users.view');
  const canSeeBusinesses = useCan('businesses.view');
  const canReview = useCan('kyc.review');
  const canAudit = useCan('audit.view');
  const { data, loading, error, reload, setData } = useAsyncResource(() => SupportDeskService.get(token, id), id);
  const agents = useAsyncResource<SupportAgent[]>(() => (canManage ? SupportDeskService.agents(token) : Promise.resolve([])));
  const [panel, setPanel] = useState<Panel>('menu');
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('reply');
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const reopenKey = useRef(newIdempotencyKey());

  const show = (next: Panel) => {
    setPanel(next);
    setOpen(true);
  };
  const close = () => setOpen(false);

  const save = async (patch: TicketPatch) => {
    if (!data || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      setData(await SupportDeskService.update(token, data.id, patch, newIdempotencyKey()));
      Feedback.success();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setBusy(false);
      close();
    }
  };

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
      close();
    }
  };

  const ctx = data?.context ?? null;
  const ctxLabels: Record<string, string> | null = ctx?.type === 'verification' ? KYC_LABEL : ctx?.type === 'delivery' ? DELIVERY_STATUS_LABEL : null;
  const ctxState = ctx?.state ? (ctxLabels?.[ctx.state] ?? ctx.state) : null;
  const canReopen = ctx?.type === 'verification' && ctx.state === 'locked' && !!ctx.kycCaseId && canReview;
  const canOpenPerson = canSeePeople && data?.requester.status !== 'deleted';
  const openPerson = () => data && router.push({ pathname: '/(admin)/account/[id]', params: { id: data.requester.id } });
  const assignOptions = [{ key: '', label: 'Nobody' }, ...(agents.data ?? []).map((a) => ({ key: a.id, label: `${a.name} (${a.title})` }))];

  const menu = data ? (
    <View>
      {canManage && me && data.assignee?.id !== me ? <ListRow icon="person-add-outline" title="Assign to me" onPress={() => save({ assigneeId: me })} /> : null}
      {canManage ? <ListRow icon="people-outline" title="Assign to someone" subtitle={data.assignee?.name ?? 'Nobody yet'} onPress={() => setPanel('assign')} /> : null}
      {canManage ? <ListRow icon="flag-outline" title="Change priority" subtitle={PRIORITY[data.priority].label} onPress={() => setPanel('priority')} /> : null}
      {canManage ? <ListRow icon="pricetag-outline" title="Change topic" subtitle={CATEGORY_LABEL[data.category]} onPress={() => setPanel('topic')} /> : null}
      {canManage ? (
        <ListRow
          icon="create-outline"
          title="Add a note for the team"
          onPress={() => {
            setMode('note');
            close();
          }}
        />
      ) : null}
      {canOpenPerson ? (
        <ListRow
          icon="person-circle-outline"
          title="Open their account"
          onPress={() => {
            close();
            openPerson();
          }}
        />
      ) : null}
      {ctx?.type === 'business' && canSeeBusinesses ? (
        <ListRow
          icon="storefront-outline"
          title="Open the business"
          onPress={() => {
            close();
            router.push({ pathname: '/(admin)/business/[id]', params: { id: ctx.id } });
          }}
        />
      ) : null}
      {canReopen ? <ListRow icon="refresh-outline" title="Reopen verification" onPress={() => setPanel('reopen')} /> : null}
      {canAudit ? (
        <ListRow
          icon="time-outline"
          title="History for this ticket"
          onPress={() => {
            close();
            router.push({ pathname: '/(admin)/audit', params: { target: data.id } });
          }}
        />
      ) : null}
    </View>
  ) : null;

  const panelBody = (p: Panel) => {
    if (!data) return null;
    switch (p) {
      case 'menu':
        return menu;
      case 'assign':
        return agents.data ? (
          <OptionList options={assignOptions} value={data.assignee?.id ?? ''} onPick={(key) => (key === (data.assignee?.id ?? '') ? close() : save({ assigneeId: key || null }))} />
        ) : (
          <Text style={consoleStyles.muted}>{agents.error ? errorText(agents.error) : 'Loading the team…'}</Text>
        );
      case 'priority':
        return <OptionList options={PRIORITIES} value={data.priority} onPick={(priority) => (priority === data.priority ? close() : save({ priority }))} />;
      case 'topic':
        return <OptionList options={CATEGORIES} value={data.category} onPick={(category) => (category === data.category ? close() : save({ category }))} />;
      case 'resolve':
        return (
          <>
            <Text style={styles.message}>{`${data.requester.name || 'They'} will be told it is resolved. They can reply to reopen it for 7 days.`}</Text>
            <PrimaryButton label="Resolve" onPress={() => save({ status: 'resolved' })} loading={busy} />
            <PrimaryButton label="Cancel" variant="outline" onPress={close} disabled={busy} />
          </>
        );
      case 'reopen':
        return (
          <>
            <Text style={styles.message}>They get one more try to send their details. They are told in the app.</Text>
            <PrimaryButton label="Reopen" onPress={reopen} loading={busy} />
            <PrimaryButton label="Cancel" variant="outline" onPress={close} disabled={busy} />
          </>
        );
    }
  };

  const messages = data?.messages ?? [];
  const hidden = expanded ? 0 : Math.max(0, messages.length - LATEST);

  return (
    <ScreenContainer
      title={data?.number ?? 'Help ticket'}
      headerRight={
        data ? (
          <Pressable accessibilityRole="button" accessibilityLabel="More for this ticket" hitSlop={12} onPress={() => show('menu')} style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
            <Ionicons name="ellipsis-horizontal" size={22} color={Brand.text} />
          </Pressable>
        ) : null
      }
      footer={data && canManage ? <Composer t={data} mode={mode} onMode={setMode} onSent={setData} /> : null}
    >
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={5}>
        {data ? (
          <>
            <View style={styles.head}>
              <Text style={styles.subject}>{data.subject}</Text>
              <Text style={consoleStyles.muted}>{`${data.number} · Opened ${shortDate(data.createdAt)}`}</Text>
              <View style={styles.badges}>
                <Badge {...DESK_STATUS[data.status]} />
                <Badge {...PRIORITY[data.priority]} />
                {data.overdue ? <Badge label="Overdue" tone="error" /> : null}
              </View>
            </View>

            {done ? <Note>{done}</Note> : null}
            {failure ? <ErrorBanner message={failure} /> : null}

            <Block title="Customer">
              <Row
                name={data.requester.name || data.requester.username}
                title={data.requester.name || 'No name'}
                subtitle={data.requester.username ? `@${data.requester.username}` : undefined}
                right={data.requester.status === 'active' ? null : <Badge label={data.requester.status === 'locked' ? 'On hold' : 'Deleted'} tone="warning" />}
                onPress={canOpenPerson ? openPerson : undefined}
              />
            </Block>

            <Block title="Ticket information">
              <View style={styles.grid}>
                <Info label="Topic" value={CATEGORY_LABEL[data.category]} onPress={canManage ? () => show('topic') : undefined} />
                <Info label="Assigned to" value={data.assignee?.name ?? 'Nobody'} warn={!data.assignee && data.status === 'open'} onPress={canManage ? () => show('assign') : undefined} />
                <Info label="Last response" value={data.lastFrom === 'staff' ? 'Ruxstar' : data.requester.name || 'Them'} />
                <Info label="Priority" value={PRIORITY[data.priority].label} onPress={canManage ? () => show('priority') : undefined} />
                {ctx ? <Info label="About" value={`${ctx.label}${ctxState ? ` (${ctxState})` : ''}`} /> : null}
                {data.slaDueAt ? <Info label="Reply by" value={formatDateTime(data.slaDueAt)} warn={data.overdue} /> : null}
              </View>
              {canReopen ? <PrimaryButton label="Reopen verification" variant="outline" onPress={() => show('reopen')} disabled={busy} /> : null}
            </Block>

            {canManage ? (
              <Block title="Ticket status">
                <SegmentedTabs
                  options={STATUSES}
                  value={data.status === 'closed' ? 'resolved' : data.status}
                  onChange={(status) => {
                    if (busy || status === data.status) return;
                    if (status === 'resolved') show('resolve');
                    else save({ status });
                  }}
                />
              </Block>
            ) : null}

            <Block title="Conversation" right={<Text style={consoleStyles.muted}>{messages.length === 1 ? '1 message' : `${messages.length} messages`}</Text>}>
              <View style={styles.thread}>
                {messages.slice(hidden).map((m) => (
                  <MessageBubble key={m.id} text={m.text} photos={m.photos} at={m.at} mine={m.from === 'staff'} author={m.author.name} internal={m.internal} />
                ))}
              </View>
              {hidden > 0 ? <PrimaryButton label="View full conversation" variant="outline" onPress={() => setExpanded(true)} /> : null}
              {expanded && messages.length > LATEST ? (
                <View style={styles.center}>
                  <TextLink muted label="Show only the latest" onPress={() => setExpanded(false)} />
                </View>
              ) : null}
            </Block>

            {canManage ? null : <Text style={consoleStyles.muted}>Answering tickets is not part of your access.</Text>}
          </>
        ) : null}
      </AsyncBoundary>

      <BottomSheet visible={open} onClose={close} title={PANEL_TITLE[panel]}>
        {panelBody(panel)}
      </BottomSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  more: { width: 36, height: 36, borderRadius: Radius.pill, backgroundColor: Brand.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  head: { gap: Spacing.one, paddingBottom: Spacing.two },
  subject: { ...Typography.heading, color: Brand.text },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  block: { gap: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.border },
  blockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  blockTitle: { ...Typography.bodyStrong, fontSize: 18, color: Brand.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.three },
  info: { width: '50%', paddingRight: Spacing.two, gap: 2 },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  infoLabel: { ...Typography.caption, color: Brand.textMuted },
  infoValue: { ...Typography.bodyStrong, color: Brand.text, flexShrink: 1 },
  warn: { color: Brand.warning },
  thread: { gap: Spacing.three },
  center: { alignItems: 'center' },
  message: { ...Typography.body, color: Brand.textMuted },
  composer: { gap: Spacing.two },
  modes: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pill: { height: 30, paddingHorizontal: Spacing.three, borderRadius: Radius.pill, backgroundColor: Brand.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: Brand.border },
  pillText: { ...Typography.caption, color: Brand.textMuted },
  pillTextActive: { color: Brand.text, fontFamily: Typography.bodyStrong.fontFamily },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  input: {
    flex: 1,
    ...Typography.body,
    color: Brand.text,
    maxHeight: 140,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingTop: 11,
    paddingBottom: 11,
    borderRadius: Radius.lg,
    backgroundColor: Brand.surfaceAlt,
  },
  inputNote: { backgroundColor: 'rgba(255,176,32,0.10)', borderWidth: 1, borderColor: 'rgba(255,176,32,0.35)' },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: Brand.action, alignItems: 'center', justifyContent: 'center' },
  sendOff: { backgroundColor: Brand.disabled },
});
