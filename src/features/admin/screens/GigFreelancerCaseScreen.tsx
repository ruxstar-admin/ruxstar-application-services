import { useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { ratingLine } from '@/features/reviews/lib/review';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { ConsoleGigsService } from '@/services/gigs-service';
import type { ConsoleFreelancer } from '@/types/gigs';
import { useCan } from '../access';
import { Card, Fact, Facts, Note, ReasonSheet, Section, consoleStyles, errorText } from '../components/parts';
import { shortDate } from '../labels';
import { freelancerBadge } from './GigFreelancersScreen';

/** Putting a freelancer on hold with a reason they see, or lifting it. The same hold as their business's. */
function HoldActions({ f, onChanged }: { f: ConsoleFreelancer; onChanged: (next: ConsoleFreelancer, message: string) => void }) {
  const token = useAuthToken();
  const canManage = useCan('businesses.manage');
  const [holding, setHolding] = useState(false);
  const [busy, setBusy] = useState<'hold' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const keys = useRef({ hold: newIdempotencyKey(), restore: newIdempotencyKey() });
  if (!canManage) return null;

  const run = async (kind: 'hold' | 'restore', reason = '') => {
    setBusy(kind);
    setError(null);
    try {
      const k = keys.current[kind];
      const next = kind === 'hold' ? await ConsoleGigsService.suspend(token, f.businessId, reason, k) : await ConsoleGigsService.restore(token, f.businessId, k);
      keys.current[kind] = newIdempotencyKey();
      Feedback.success();
      setHolding(false);
      onChanged(next, kind === 'hold' ? 'Freelancer put on hold. Their gigs are hidden and they have been told why.' : 'Hold lifted. The freelancer has been told.');
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.actions}>
      {error ? <ErrorBanner message={error} /> : null}
      {f.suspended ? (
        <PrimaryButton label="Lift the hold" onPress={() => run('restore')} loading={busy === 'restore'} disabled={!!busy} />
      ) : (
        <PrimaryButton label="Put on hold" variant="outline" onPress={() => setHolding(true)} disabled={!!busy} />
      )}
      <ReasonSheet
        visible={holding}
        title="Put this freelancer on hold"
        prompt="Their gigs hide and they can't sell anything new. Orders already placed carry on. They will see this reason."
        placeholder="For example: the portfolio shows someone else's work."
        confirmLabel="Put on hold"
        loading={busy === 'hold'}
        onConfirm={(reason) => run('hold', reason)}
        onCancel={() => setHolding(false)}
      />
    </View>
  );
}

/** One freelancer for the Ruxstar team: who they are, verification, counts, portfolio, holding them, and links to their gigs and orders. */
export function GigFreelancerCaseScreen({ id }: { id: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const canOrders = useCan('orders.view');
  const canAudit = useCan('audit.view');
  const { data: f, loading, error, reload, setData } = useAsyncResource(() => ConsoleGigsService.freelancer(token, id), id);
  const [done, setDone] = useState<string | null>(null);

  return (
    <ScreenContainer title="Freelancer">
      <AsyncBoundary loading={loading} error={error} hasData={!!f} onRetry={reload} skeletonRows={5}>
        {f ? (
          <>
            <View style={styles.head}>
              <Avatar name={f.name} uri={f.avatarUrl ?? undefined} size={56} />
              <View style={styles.flex}>
                <Text style={styles.name}>{f.name}</Text>
                <Text style={consoleStyles.muted}>{f.headline}</Text>
              </View>
              <Badge {...freelancerBadge(f)} />
            </View>
            {done ? <Note>{done}</Note> : null}
            {f.suspended ? <Note tone="danger">Ruxstar has put this freelancer on hold. Their gigs are hidden.</Note> : null}

            <Card>
              <Facts>
                <Fact label="Category" value={f.categoryLabel} />
                <Fact label="City" value={f.city ?? 'Not set'} />
                <Fact label="Verified" value={f.verified ? 'Yes' : 'Not yet'} warn={!f.verified} />
                <Fact label="Gigs" value={String(f.gigs)} />
                <Fact label="Orders" value={String(f.orders)} />
                {f.rating ? <Fact label="Rating" value={ratingLine(f.rating)} /> : null}
                <Fact label="Skills" value={f.skills.length ? f.skills.join(', ') : 'None'} />
                <Fact label="Languages" value={f.languages.join(', ')} />
                <Fact label="Started" value={shortDate(f.createdAt)} />
                <Fact label="Business id" value={f.businessId} />
              </Facts>
            </Card>

            {f.bio ? (
              <Card>
                <Text style={consoleStyles.muted}>About</Text>
                <Text style={consoleStyles.body} selectable>
                  {f.bio}
                </Text>
              </Card>
            ) : null}

            {f.portfolio.links.length || f.portfolio.photos.length ? (
              <>
                <Section>Portfolio</Section>
                <Card>
                  <Text style={consoleStyles.muted}>{`${f.portfolio.photos.length} photo${f.portfolio.photos.length === 1 ? '' : 's'}`}</Text>
                  {f.portfolio.links.map((l) => (
                    <TextLink key={l.id} label={`${l.title} ›`} onPress={() => void Linking.openURL(l.url)} />
                  ))}
                </Card>
              </>
            ) : null}

            <View style={styles.links}>
              <TextLink label="Their gigs" onPress={() => router.push({ pathname: '/(admin)/gig-listings', params: { freelancer: f.businessId, label: f.name } })} />
              {canOrders ? <TextLink label="Their orders" onPress={() => router.push({ pathname: '/(admin)/gig-orders', params: { freelancer: f.businessId, label: f.name } })} /> : null}
              <TextLink label="Open the business" onPress={() => router.push({ pathname: '/(admin)/business/[id]', params: { id: f.businessId } })} />
              <TextLink label="Open the account" onPress={() => router.push({ pathname: '/(admin)/account/[id]', params: { id: f.ownerId } })} />
              {canAudit ? <TextLink label="History for this freelancer" onPress={() => router.push({ pathname: '/(admin)/audit', params: { target: f.businessId } })} /> : null}
            </View>

            <HoldActions
              f={f}
              onChanged={(next, message) => {
                setData(next);
                setDone(message);
              }}
            />
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  flex: { flex: 1, gap: 2 },
  name: { ...Typography.title, color: Brand.text },
  links: { gap: Spacing.three, alignItems: 'flex-start', marginTop: Spacing.two },
  actions: { gap: Spacing.two, marginTop: Spacing.three },
});
