import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { bedsText, momentText, stayText } from '@/features/stays/lib/stays';
import { money } from '@/features/vendor/lib/pod';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { ConsoleStaysService } from '@/services/stays-service';
import type { ConsoleReservation, ObjectionStatus } from '@/types/stays';
import { useCan } from '../access';
import { Card, ListFooter, consoleStyles, errorText } from '../components/parts';

const STATUSES = [
  { key: 'open', label: 'Open' },
  { key: 'released', label: 'Paid owner' },
  { key: 'refunded', label: 'Refunded' },
  { key: 'withdrawn', label: 'Withdrawn' },
] as const satisfies readonly { key: ObjectionStatus; label: string }[];

const DECISIONS = [
  { key: 'release', label: 'Pay the owner' },
  { key: 'refund', label: 'Refund the tenant' },
] as const;
type Decision = (typeof DECISIONS)[number]['key'];

const NOTE_MIN = 5;
const NOTE_MAX = 500;

function DecideSheet({ stay, onClose, onDone }: { stay: ConsoleReservation | null; onClose: () => void; onDone: (message: string) => void }) {
  const token = useAuthToken();
  const [decision, setDecision] = useState<Decision>('release');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(newIdempotencyKey);
  const [last, setLast] = useState(stay);
  if (stay && stay !== last) {
    setLast(stay);
    setDecision('release');
    setNote('');
    setError(null);
    setAttempt(newIdempotencyKey());
  }
  const shown = stay ?? last;
  if (!shown) return null;

  const decide = async () => {
    setBusy(true);
    setError(null);
    try {
      await ConsoleStaysService.decide(token, shown.id, decision, note.trim(), attempt);
      Feedback.success();
      onDone(
        decision === 'release'
          ? `Sorted: ${shown.business.name} is being paid, and both sides have your note.`
          : `Refunded: ${shown.tenant.name} gets ${money(shown.price.total)} back and the stay ends. Both sides have your note.`,
      );
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={!!stay} onClose={onClose} title="Decide the objection">
      <Text style={styles.body}>{`${shown.tenant.name} at ${shown.property.name}`}</Text>
      <Text style={consoleStyles.muted}>{shown.objection?.reason}</Text>
      <View style={styles.bleed}>
        <ChoiceChips options={DECISIONS} value={decision} onChange={setDecision} />
      </View>
      <Text style={consoleStyles.muted}>
        {decision === 'release'
          ? 'The owner is paid their share now and the stay carries on.'
          : `${shown.tenant.name} gets back all ${money(shown.price.total)}, platform fee included, and the stay ends. The owner isn’t paid.`}
      </Text>
      <InputField
        label="Note for both sides"
        value={note}
        onChangeText={setNote}
        placeholder="What you found and why you decided this way"
        multiline
        maxLength={NOTE_MAX}
        showCount
      />
      {error ? <ErrorBanner message={error} /> : null}
      <PrimaryButton label={decision === 'release' ? 'Pay the owner' : 'Refund the tenant'} loading={busy} disabled={note.trim().length < NOTE_MIN} onPress={decide} />
      <PrimaryButton label="Cancel" variant="outline" onPress={onClose} disabled={busy} />
    </BottomSheet>
  );
}

function Results({ status, onDecide }: { status: ObjectionStatus; onDecide: (r: ConsoleReservation) => void }) {
  const router = useRouter();
  const token = useAuthToken();
  const canDecide = useCan('orders.manage');
  const list = usePaginated((cursor) => ConsoleStaysService.objections(token, status, cursor));

  if (list.loading) {
    return (
      <View style={consoleStyles.skeletons}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={120} radius={14} />
        ))}
      </View>
    );
  }
  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load objections" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }

  return (
    <FlatList
      data={list.items}
      keyExtractor={(r) => r.id}
      contentContainerStyle={consoleStyles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <EmptyState icon="shield-checkmark-outline" title={status === 'open' ? 'No open objections' : 'Nothing here'} message={status === 'open' ? 'When a tenant says something’s wrong after moving in, it shows up here.' : undefined} />
      }
      ListFooterComponent={<ListFooter list={list} />}
      renderItem={({ item: r }) => (
        <Card>
          <View style={styles.head}>
            <View style={styles.flex}>
              <Text style={styles.name}>{r.property.name}</Text>
              <Text style={consoleStyles.muted}>{`#${r.orderNo} · ${r.tenant.name} · ${bedsText(r)} · ${stayText(r)}`}</Text>
            </View>
            <Badge label={money(r.price.total)} tone="neutral" />
          </View>
          {r.objection ? (
            <>
              <Text style={styles.body} selectable>
                {r.objection.reason}
              </Text>
              <Text style={consoleStyles.muted}>{`Raised ${momentText(r.objection.at)}`}</Text>
              {r.objection.note ? <Text style={consoleStyles.muted}>{`Note: ${r.objection.note}`}</Text> : null}
            </>
          ) : null}
          <View style={styles.links}>
            {status === 'open' && canDecide ? <TextLink label="Decide" onPress={() => onDecide(r)} /> : null}
            <TextLink label="Property" onPress={() => router.push({ pathname: '/(admin)/property/[id]', params: { id: r.property.id } })} />
          </View>
        </Card>
      )}
    />
  );
}

/** Tenants who said something's wrong after moving in: pay the owner, or refund the tenant and end the stay. */
export function ObjectionsScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<ObjectionStatus>('open');
  const [deciding, setDeciding] = useState<ConsoleReservation | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [round, setRound] = useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title="Objections" onBack={() => router.back()} />
      </View>
      <View style={styles.controls}>
        <SegmentedTabs options={STATUSES} value={status} onChange={setStatus} />
        {done ? <Text style={styles.done}>{done}</Text> : null}
      </View>
      <Results key={`${status}|${round}`} status={status} onDecide={setDeciding} />
      <DecideSheet
        stay={deciding}
        onClose={() => setDeciding(null)}
        onDone={(message) => {
          setDeciding(null);
          setDone(message);
          setRound((n) => n + 1);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  controls: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  bleed: { marginHorizontal: -Spacing.three },
  flex: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  name: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  body: { ...Typography.body, fontSize: 15, color: Brand.text },
  done: { ...Typography.caption, color: Brand.success },
  links: { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.two },
});
