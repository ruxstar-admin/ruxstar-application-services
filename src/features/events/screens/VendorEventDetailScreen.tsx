import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { EventsService } from '@/services/events-service';

type Outcome = { tone: 'success' | 'error'; text: string };

const failureText = (err: unknown) => {
  if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.';
  if (err.kind === 'not_found') return 'No ticket with that code.';
  if (err.kind === 'conflict') return 'That ticket was already checked in.';
  if (err.kind === 'forbidden') return 'That ticket is not valid.';
  return 'Something went wrong. Please try again.';
};

/** Registrations for one event and a code box to check people in at the door. */
export function VendorEventDetailScreen() {
  const token = useAuthToken();
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => EventsService.registrations(token, id));
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const checkIn = async () => {
    setChecking(true);
    setOutcome(null);
    try {
      const ticket = await EventsService.checkIn(token, code);
      Feedback.success();
      setOutcome({ tone: 'success', text: `${ticket.holder} checked in.` });
      setCode('');
      reload();
    } catch (err) {
      Feedback.error();
      setOutcome({ tone: 'error', text: failureText(err) });
    } finally {
      setChecking(false);
    }
  };

  const attended = data?.filter((t) => t.status === 'checked_in').length ?? 0;
  const going = data?.filter((t) => t.status !== 'waitlisted') ?? [];
  const waitlist = data?.filter((t) => t.status === 'waitlisted') ?? [];

  return (
    <ScreenContainer title={title ?? 'Event'}>
      <Text style={styles.section}>Check in</Text>
      <InputField
        label="Ticket code"
        value={code}
        onChangeText={(value) => {
          setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
          setOutcome(null);
        }}
        autoCapitalize="characters"
        placeholder="RX1234"
        onSubmitEditing={code.length >= 4 ? checkIn : undefined}
      />
      <PrimaryButton label="Check in" onPress={checkIn} disabled={code.length < 4} loading={checking} />
      {outcome ? <Text style={[styles.outcome, outcome.tone === 'success' ? styles.ok : styles.bad]}>{outcome.text}</Text> : null}

      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload}>
        <Text style={styles.section}>{`Registered · ${going.length} (${attended} checked in)`}</Text>
        {going.map((ticket) => (
          <View key={ticket.id}>
            <ListRow
              title={ticket.holder}
              subtitle={`Code ${ticket.code}`}
              right={<Badge label={ticket.status === 'checked_in' ? 'Checked in' : 'Valid'} tone={ticket.status === 'checked_in' ? 'accent' : 'success'} />}
            />
          </View>
        ))}
        {going.length === 0 ? <EmptyState icon="people-outline" title="No registrations yet" /> : null}
        {waitlist.length > 0 ? <Text style={styles.section}>{`Waitlist · ${waitlist.length}`}</Text> : null}
        {waitlist.map((ticket) => (
          <View key={ticket.id}>
            <ListRow title={ticket.holder} subtitle={`Position #${ticket.waitlistPosition}`} />
          </View>
        ))}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four },
  outcome: { ...Typography.body },
  ok: { color: Brand.success },
  bad: { color: Brand.error },
});
