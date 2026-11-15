import { useMemo, useRef, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { KeyedSelectField } from '@/components/ui/KeyedSelectField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { StepBar } from '@/components/ui/StepBar';
import { TextLink } from '@/components/ui/TextLink';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { keepIdempotencyKey, newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { EventsService, VendorEventsService } from '@/services/events-service';
import type { EventKind, EventRules, VendorEvent } from '@/types/events';
import {
  DRAFT_STEPS,
  HALF_HOURS,
  KINDS,
  KIND_LABEL,
  dayLabel,
  draftErrors,
  draftOf,
  emptyDraft,
  istDays,
  toEventInput,
  type EventDraft,
  type QuestionDraft,
  type TierDraft,
} from '../lib/events';
import { errorText } from '../lib/messages';

/** How far ahead an event can be put on sale from the form. */
const DAYS_AHEAD = 365;
const KIND_CHIPS = KINDS.map((k) => ({ key: k, label: KIND_LABEL[k] }));
const REFUND_CHIPS = [
  { key: 'standard', label: 'Refunds allowed' },
  { key: 'none', label: 'No refunds' },
] as const;

const dayOrTime = (value: string) => (value.includes('-') ? dayLabel(value) : value);
const Pick = (props: Omit<ComponentProps<typeof KeyedSelectField>, 'fallback'>) => <KeyedSelectField {...props} fallback={dayOrTime} />;

function Form({ rules, event, businessId }: { rules: EventRules; event?: VendorEvent; businessId?: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const editing = !!event;
  const [draft, setDraft] = useState<EventDraft>(() => (event ? draftOf(event) : emptyDraft()));
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(newIdempotencyKey());
  const [openedAt] = useState(Date.now);
  const days = useMemo(() => istDays(DAYS_AHEAD, openedAt), [openedAt]);
  const endDays = useMemo(() => days.filter((d) => !draft.startDay || d.key >= draft.startDay), [days, draft.startDay]);

  const stepKey = DRAFT_STEPS[step]!.key;
  const errors = draftErrors(draft, stepKey, rules, openedAt, event?.startsAt);
  const err = (field: string) => (shown ? errors[field] : undefined);
  const sold = draft.tiers.some((t) => t.taken > 0);
  const last = step === DRAFT_STEPS.length - 1;

  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setTier = (i: number, patch: Partial<TierDraft>) => setDraft((d) => ({ ...d, tiers: d.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));
  const setQuestion = (i: number, patch: Partial<QuestionDraft>) =>
    setDraft((d) => ({ ...d, questions: d.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) }));
  const setKind = (kind: EventKind) => setDraft((d) => ({ ...d, kind, team: kind === 'sports' ? d.team : false }));
  const setStart = (startDay: string) => setDraft((d) => ({ ...d, startDay, endDay: !d.endDay || d.endDay < startDay ? startDay : d.endDay }));

  const save = async () => {
    setBusy(true);
    setFailure(null);
    try {
      const body = toEventInput(draft);
      if (event) {
        await VendorEventsService.update(token, event.id, body);
        Feedback.success();
        router.back();
      } else {
        const created = await VendorEventsService.create(token, businessId!, body, { idempotencyKey: attempt.current });
        Feedback.success();
        router.replace({ pathname: '/(vendor)/events/[id]', params: { id: created.id, fresh: '1' } });
      }
    } catch (e) {
      Feedback.error();
      setFailure(errorText(e));
      if (!keepIdempotencyKey(e)) attempt.current = newIdempotencyKey();
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    setShown(true);
    if (Object.keys(errors).length) {
      Feedback.error();
      return;
    }
    setShown(false);
    if (last) void save();
    else setStep(step + 1);
  };

  const footer = <PrimaryButton label={last ? (editing ? 'Save changes' : 'Save as draft') : 'Continue'} loading={busy} onPress={next} />;

  return (
    <ScreenContainer title={editing ? 'Edit event' : 'New event'} footer={footer}>
      <StepBar steps={DRAFT_STEPS.map((s) => s.label)} at={step} />
      {step > 0 ? <TextLink label="‹ Back a step" onPress={() => setStep(step - 1)} /> : null}

      {stepKey === 'basics' ? (
        <>
          <Text style={styles.label}>What kind of event?</Text>
          <View style={styles.bleed}>
            <ChoiceChips options={KIND_CHIPS} value={draft.kind} onChange={setKind} />
          </View>
          <InputField label="Event name" value={draft.title} onChangeText={(v) => set('title', v)} maxLength={100} placeholder="e.g. Sunburn Nights" error={err('title')} />
          <InputField
            label="About it (optional)"
            value={draft.description}
            onChangeText={(v) => set('description', v)}
            multiline
            maxLength={2000}
            showCount
            placeholder="Who’s performing, what to bring, age limits, parking…"
          />
        </>
      ) : null}

      {stepKey === 'when' ? (
        <>
          <View style={styles.pair}>
            <View style={styles.half}>
              <Pick label="Starts on" value={draft.startDay} options={days} onChange={setStart} error={err('startDay')} />
            </View>
            <View style={styles.half}>
              <Pick label="At" value={draft.startTime} options={HALF_HOURS} onChange={(v) => set('startTime', v)} />
            </View>
          </View>
          <View style={styles.pair}>
            <View style={styles.half}>
              <Pick label="Ends on" value={draft.endDay} options={endDays} onChange={(v) => set('endDay', v)} error={err('endDay')} />
            </View>
            <View style={styles.half}>
              <Pick label="At" value={draft.endTime} options={HALF_HOURS} onChange={(v) => set('endTime', v)} error={err('endTime')} />
            </View>
          </View>
          <Text style={styles.hint}>Times are India time. Tickets stop selling when it starts.</Text>
          <ToggleRow title="It’s online" subtitle="People join with a link instead of coming to a venue" icon="videocam-outline" value={draft.online} onValueChange={(v) => set('online', v)} />
          {draft.online ? (
            <InputField
              label="Meeting link"
              value={draft.link}
              onChangeText={(v) => set('link', v)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              hint="Only people with a ticket see it."
              error={err('link')}
            />
          ) : (
            <>
              <InputField label="Venue" value={draft.venueName} onChangeText={(v) => set('venueName', v)} maxLength={100} placeholder="e.g. Shilpakala Vedika" error={err('venueName')} />
              <InputField label="Address" value={draft.address} onChangeText={(v) => set('address', v)} maxLength={200} placeholder="Street, area" error={err('address')} />
              <InputField label="City" value={draft.city} onChangeText={(v) => set('city', v)} maxLength={60} autoCapitalize="words" error={err('city')} />
            </>
          )}
        </>
      ) : null}

      {stepKey === 'tickets' ? (
        <>
          {draft.kind === 'sports' ? (
            <ToggleRow
              title="Teams enter together"
              subtitle={sold ? 'Can’t change once tickets are sold' : 'The captain books and pays once; every player gets a QR code'}
              icon="people-outline"
              value={draft.team}
              onValueChange={(v) => !sold && set('team', v)}
            />
          ) : null}
          {draft.team ? (
            <View style={styles.pair}>
              <View style={styles.half}>
                <InputField label="Fewest players" value={draft.teamMin} onChangeText={(v) => set('teamMin', v)} keyboardType="number-pad" maxLength={2} error={err('teamMin')} />
              </View>
              <View style={styles.half}>
                <InputField label="Most players" value={draft.teamMax} onChangeText={(v) => set('teamMax', v)} keyboardType="number-pad" maxLength={2} error={err('teamMax')} />
              </View>
            </View>
          ) : null}

          {draft.tiers.map((t, i) => (
            <View key={t.id ?? `new${i}`} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{`Ticket type ${i + 1}`}</Text>
                {draft.tiers.length > 1 && t.taken === 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ticket type ${i + 1}`}
                    hitSlop={8}
                    onPress={() => setDraft((d) => ({ ...d, tiers: d.tiers.filter((_, j) => j !== i) }))}
                  >
                    <Ionicons name="trash-outline" size={20} color={Brand.textMuted} />
                  </Pressable>
                ) : null}
              </View>
              <InputField label="Name" value={t.name} onChangeText={(v) => setTier(i, { name: v })} maxLength={40} placeholder="General, VIP, Early bird" error={err(`tier${i}.name`)} />
              <View style={styles.pair}>
                <View style={styles.half}>
                  <InputField
                    label={draft.team ? 'Price per team (₹)' : 'Price (₹)'}
                    value={t.price}
                    onChangeText={(v) => setTier(i, { price: v })}
                    keyboardType="decimal-pad"
                    placeholder="0 for free"
                    error={err(`tier${i}.price`)}
                  />
                </View>
                <View style={styles.half}>
                  <InputField
                    label={draft.team ? 'Teams' : 'Tickets'}
                    value={t.capacity}
                    onChangeText={(v) => setTier(i, { capacity: v })}
                    keyboardType="number-pad"
                    maxLength={6}
                    hint={t.taken ? `${t.taken} booked` : undefined}
                    error={err(`tier${i}.capacity`)}
                  />
                </View>
              </View>
            </View>
          ))}
          {errors.tiers && shown ? <Text style={styles.error}>{errors.tiers}</Text> : null}
          {draft.tiers.length < rules.maxTicketTypes ? (
            <PrimaryButton
              label="Add a ticket type"
              variant="outline"
              onPress={() => setDraft((d) => ({ ...d, tiers: [...d.tiers, { name: '', price: '', capacity: '', taken: 0 }] }))}
            />
          ) : null}

          <Text style={styles.label}>Refunds</Text>
          <View style={styles.bleed}>
            <ChoiceChips options={REFUND_CHIPS} value={draft.refunds} onChange={(v) => set('refunds', v)} />
          </View>
          <Text style={styles.hint}>
            {draft.refunds === 'standard'
              ? `People can cancel for a full refund until ${rules.refundHours} hours before it starts.`
              : 'People can’t cancel. If you cancel the event, everyone still gets a full refund.'}
            {rules.platformFee ? ` Customers pay a ${money(rules.platformFee)} platform fee on paid tickets.` : ''}
          </Text>
        </>
      ) : null}

      {stepKey === 'extras' ? (
        <>
          <Text style={styles.lead}>Every ticket already asks for the person’s name and mobile. Add anything else you need from each person.</Text>
          {draft.questions.map((q, i) => (
            <View key={q.id ?? `q${i}`} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{`Question ${i + 1}`}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove question ${i + 1}`}
                  hitSlop={8}
                  onPress={() => setDraft((d) => ({ ...d, questions: d.questions.filter((_, j) => j !== i) }))}
                >
                  <Ionicons name="trash-outline" size={20} color={Brand.textMuted} />
                </Pressable>
              </View>
              <InputField value={q.label} onChangeText={(v) => setQuestion(i, { label: v })} maxLength={80} placeholder="e.g. T-shirt size" error={err(`question${i}`)} />
              <ToggleRow title="Must answer" value={q.required} onValueChange={(v) => setQuestion(i, { required: v })} />
            </View>
          ))}
          {draft.questions.length < rules.maxQuestions ? (
            <PrimaryButton
              label={draft.questions.length ? 'Add another question' : 'Add a question'}
              variant="outline"
              onPress={() => setDraft((d) => ({ ...d, questions: [...d.questions, { label: '', required: true }] }))}
            />
          ) : (
            <Text style={styles.hint}>{rules.maxQuestions ? `Up to ${rules.maxQuestions} questions.` : 'Extra questions are turned off on Ruxstar for now.'}</Text>
          )}
          {editing ? null : <Text style={styles.hint}>It’s saved as a draft. Add a poster and publish it from the next screen.</Text>}
        </>
      ) : null}

      {failure ? <ErrorBanner message={failure} /> : null}
    </ScreenContainer>
  );
}

/** Making an event for `businessId` or changing `eventId`, a step at a time. A new event is saved as a draft. */
export function EventFormScreen({ businessId, eventId: id }: { businessId?: string; eventId?: string }) {
  const token = useAuthToken();
  const rules = useAsyncResource(() => EventsService.rules(token), 'rules');
  const event = useAsyncResource(() => (id ? VendorEventsService.get(token, id) : Promise.resolve(null)), id ?? 'new');
  const ready = rules.data && (!id || event.data);
  return ready ? (
    <Form rules={rules.data!} event={event.data ?? undefined} businessId={businessId} />
  ) : (
    <ScreenContainer title={id ? 'Edit event' : 'New event'}>
      <AsyncBoundary
        loading={rules.loading || event.loading}
        error={rules.error ?? event.error}
        hasData={false}
        onRetry={() => {
          rules.reload();
          event.reload();
        }}
        skeletonRows={4}
      >
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -Spacing.three },
  label: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  lead: { ...Typography.body, fontSize: 15, color: Brand.textMuted },
  hint: { ...Typography.caption, color: Brand.textMuted },
  error: { ...Typography.caption, color: Brand.error },
  pair: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
});
