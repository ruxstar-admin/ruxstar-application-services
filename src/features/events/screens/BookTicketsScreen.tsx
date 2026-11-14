import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Stepper } from '@/components/ui/Stepper';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { EventsService } from '@/services/events-service';
import { useAuthStore } from '@/stores/auth-store';
import type { EventDetail } from '@/types/events';
import { PersonCard } from '../components/PersonCard';
import { StepBar } from '../components/StepBar';
import { ticketReturn } from '../lib/checkout';
import { countOf, orderPrice, peopleFor, personErrors, playersFor, refundText, toHolders, whenLine, type PersonDraft, type Selection } from '../lib/events';
import { errorText } from '../lib/messages';

const STEPS = ['Tickets', 'Who’s coming', 'Pay'] as const;

function Booking({ event, waitlistId }: { event: EventDetail; waitlistId?: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const myName = useAuthStore((s) => s.name);
  const myMobile = useAuthStore((s) => s.mobile);
  const me = { name: myName, mobile: myMobile };
  const offer = waitlistId ? event.myWaits.find((w) => w.id === waitlistId && w.status === 'offered') : undefined;
  const team = event.teamSize;
  const tierOrder = event.tiers.map((t) => t.id);

  const [step, setStep] = useState(0);
  const [selection, setSelection] = useState<Selection>(() => (offer ? { [offer.tierId]: team ? 1 : offer.quantity } : {}));
  const [teamTier, setTeamTier] = useState(offer?.tierId ?? event.tiers.find((t) => !t.soldOut)?.id ?? '');
  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState(team?.min ?? 1);
  const [people, setPeople] = useState<PersonDraft[]>([]);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(newIdempotencyKey());

  const picked = team ? { [teamTier]: 1 } : selection;
  const count = team ? players : countOf(selection);
  const price = orderPrice(picked, event.tiers, event.platformFee, !!team);
  const free = price.total === 0;
  const errors = useMemo(() => people.map((p) => personErrors(p, event.questions)), [people, event.questions]);
  const phoneTwice = useMemo(() => {
    const seen = new Map<string, number>();
    people.forEach((p, i) => {
      const phone = p.phone.replace(/\D/g, '').slice(-10);
      if (phone.length === 10 && !seen.has(phone)) seen.set(phone, i);
    });
    return seen.size < people.filter((p) => p.phone.replace(/\D/g, '').length >= 10).length;
  }, [people]);

  const setQty = (tierId: string, n: number) => setSelection((s) => ({ ...s, [tierId]: n }));
  const others = (tierId: string) => countOf(selection) - (selection[tierId] ?? 0);

  const toPeople = () => {
    setPeople((prev) => (team ? playersFor(players, teamTier, prev, me) : peopleFor(selection, tierOrder, prev, me)));
    setShown(false);
    setStep(1);
  };

  const toPay = () => {
    setShown(true);
    if (errors.some((e) => Object.keys(e).length)) {
      Feedback.error();
      return;
    }
    setStep(2);
  };

  const place = async () => {
    setBusy(true);
    setFailure(null);
    try {
      const { order, checkoutUrl } = await EventsService.book(
        token,
        event.id,
        {
          tickets: toHolders(people, event.questions),
          ...(team ? { team: { tierId: teamTier, name: teamName.trim() } } : {}),
          ...(offer ? { waitlistId: offer.id } : {}),
          returnTo: ticketReturn(),
        },
        { idempotencyKey: attempt.current },
      );
      Feedback.success();
      router.replace({ pathname: '/(customer)/events/ticket/[id]', params: { id: order.id, ...(checkoutUrl ? { pay: '1' } : { fresh: '1' }) } });
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
      attempt.current = newIdempotencyKey();
    } finally {
      setBusy(false);
    }
  };

  const canNext = team ? !!teamTier && teamName.trim().length >= 2 : count > 0;
  const footer =
    step === 0 ? (
      <PrimaryButton label={count ? `Continue · ${count} ${count === 1 ? 'ticket' : 'tickets'}` : 'Choose tickets'} disabled={!canNext} onPress={toPeople} />
    ) : step === 1 ? (
      <PrimaryButton label="Continue" onPress={toPay} />
    ) : (
      <PrimaryButton label={free ? 'Get my free tickets' : `Pay ${money(price.total)}`} loading={busy} onPress={place} />
    );

  return (
    <ScreenContainer title={event.title} footer={footer}>
      <StepBar steps={STEPS} at={step} />
      {step > 0 ? <Back onPress={() => setStep(step - 1)} /> : null}

      {step === 0 && team ? (
        <>
          <Text style={styles.lead}>{`Book for your team. You pay once, and each of the ${team.min === team.max ? team.min : `${team.min} to ${team.max}`} players gets their own QR code.`}</Text>
          {event.tiers.length > 1 && !offer ? (
            <View style={styles.bleed}>
              <ChoiceChips options={event.tiers.filter((t) => !t.soldOut).map((t) => ({ key: t.id, label: `${t.name} · ${money(t.price)}` }))} value={teamTier} onChange={setTeamTier} />
            </View>
          ) : null}
          <InputField label="Team name" value={teamName} onChangeText={setTeamName} maxLength={60} autoCapitalize="words" placeholder="e.g. Madhapur Strikers" />
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Players</Text>
              <Text style={styles.small}>{team.min === team.max ? `Exactly ${team.min}` : `${team.min} to ${team.max}`}</Text>
            </View>
            <Stepper value={players} min={team.min} max={team.max} onChange={setPlayers} label="players" />
          </View>
        </>
      ) : null}

      {step === 0 && !team ? (
        <>
          <Text style={styles.lead}>{offer ? 'These are held for you from the waitlist.' : `Up to ${event.maxPerOrder} tickets in one booking. Each person gets their own QR code.`}</Text>
          {event.tiers.map((t) => {
            const held = offer?.tierId === t.id ? offer.quantity : 0;
            const max = offer ? held : Math.min(t.left, event.maxPerOrder - others(t.id));
            const off = offer ? offer.tierId !== t.id : t.soldOut;
            return (
              <View key={t.id} style={[styles.row, off && styles.off]}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{t.name}</Text>
                  <Text style={styles.small}>{t.price === 0 ? 'Free' : money(t.price)}</Text>
                  {!offer && !t.soldOut && t.left <= 20 ? <Text style={styles.few}>{`Only ${t.left} left`}</Text> : null}
                  {!offer && t.soldOut ? <Text style={styles.sold}>Sold out</Text> : null}
                </View>
                {off ? null : <Stepper value={selection[t.id] ?? 0} min={offer ? held : 0} max={Math.max(0, max)} onChange={(n) => setQty(t.id, n)} label={`${t.name} tickets`} />}
              </View>
            );
          })}
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Text style={styles.lead}>Add each person’s name as on an ID. The gate checks it against the ticket.</Text>
          {people.map((p, i) => (
            <PersonCard
              key={p.key}
              person={p}
              heading={team ? `Player ${i + 1}${i === 0 ? ' · captain' : ''}` : `Ticket ${i + 1} · ${event.tiers.find((t) => t.id === p.tierId)?.name ?? ''}`}
              questions={event.questions}
              errors={shown ? errors[i]! : {}}
              onChange={(next) => setPeople((all) => all.map((x) => (x.key === next.key ? next : x)))}
            />
          ))}
          {phoneTwice ? <Text style={styles.small}>The same number is on more than one ticket. That’s fine if one person keeps them all.</Text> : null}
        </>
      ) : null}

      {step === 2 ? (
        <>
          <View style={styles.summary}>
            <Text style={styles.rowTitle}>{event.title}</Text>
            <Text style={styles.small}>{whenLine(event.startsAt, event.endsAt)}</Text>
            <View style={styles.divider} />
            {team ? (
              <Line label={`${teamName.trim()} · ${players} players`} amount={price.items} />
            ) : (
              event.tiers
                .filter((t) => selection[t.id])
                .map((t) => <Line key={t.id} label={`${selection[t.id]} × ${t.name}`} amount={t.price * selection[t.id]!} />)
            )}
            {price.fee ? <Line label="Platform fee" amount={price.fee} /> : null}
            <View style={styles.divider} />
            <Line label="Total" amount={price.total} strong />
          </View>
          <View style={styles.people}>
            {people.map((p) => (
              <Text key={p.key} style={styles.small}>{`• ${p.name.trim()}`}</Text>
            ))}
          </View>
          <View style={styles.refund}>
            <Ionicons name="shield-checkmark-outline" size={18} color={event.refunds.policy === 'none' ? Brand.warning : Brand.success} />
            <Text style={styles.refundText}>{refundText(event.refunds, free)}</Text>
          </View>
          {free ? null : <Text style={styles.small}>You’ll pay on Cashfree’s secure page. Your tickets are held for 20 minutes while you pay.</Text>}
        </>
      ) : null}

      {failure ? <ErrorBanner message={failure} /> : null}
    </ScreenContainer>
  );
}

function Back({ onPress }: { onPress: () => void }) {
  return (
    <Text accessibilityRole="button" onPress={onPress} style={styles.back}>
      ‹ Back a step
    </Text>
  );
}

function Line({ label, amount, strong }: { label: string; amount: number; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={strong ? styles.rowTitle : styles.lineLabel}>{label}</Text>
      <Text style={strong ? styles.rowTitle : styles.lineAmount}>{amount === 0 ? 'Free' : money(amount)}</Text>
    </View>
  );
}

/** Buying tickets: how many of each, a card per person, then pay. Free tickets are confirmed straight away. */
export function BookTicketsScreen() {
  const token = useAuthToken();
  const { id, waitlistId } = useLocalSearchParams<{ id: string; waitlistId?: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => EventsService.get(token, id), id);
  return data ? (
    <Booking event={data} waitlistId={waitlistId} />
  ) : (
    <ScreenContainer title="Tickets">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={4}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -Spacing.three },
  lead: { ...Typography.body, fontSize: 15, color: Brand.textMuted, marginBottom: Spacing.one },
  back: { ...Typography.caption, fontSize: 14, color: Brand.primarySoft, paddingVertical: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  off: { opacity: 0.5 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  few: { ...Typography.caption, color: Brand.warning },
  sold: { ...Typography.caption, color: Brand.error },
  summary: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Brand.border, marginVertical: Spacing.one },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  lineLabel: { ...Typography.body, fontSize: 15, color: Brand.textMuted, flex: 1 },
  lineAmount: { ...Typography.body, fontSize: 15, color: Brand.text },
  people: { gap: 2, paddingHorizontal: Spacing.one },
  refund: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start', padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  refundText: { ...Typography.caption, fontSize: 14, color: Brand.text, flex: 1 },
});
