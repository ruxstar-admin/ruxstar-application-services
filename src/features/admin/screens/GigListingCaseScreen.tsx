import { useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { GIG_STATUS, deliveryLine, sortedPackages } from '@/features/gigs/lib/gigs';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { ratingLine } from '@/features/reviews/lib/review';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { IdempotentAttempt } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { ConsoleGigsService } from '@/services/gigs-service';
import { useCan } from '../access';
import { Card, Fact, Facts, Note, ReasonSheet, Section, consoleStyles, errorText } from '../components/parts';
import { shortDate } from '../labels';

/** One gig for the Ruxstar team: its packages, questions and description, and taking it down. */
export function GigListingCaseScreen({ id }: { id: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const { width } = useWindowDimensions();
  const canManage = useCan('businesses.manage');
  const canOrders = useCan('orders.view');
  const canAudit = useCan('audit.view');
  const { data: gig, loading, error, reload, setData } = useAsyncResource(() => ConsoleGigsService.gig(token, id), id);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const key = useRef(new IdempotentAttempt());

  const takeDown = async (reason: string) => {
    setBusy(true);
    setFailure(null);
    try {
      setData(await ConsoleGigsService.takeDown(token, id, reason, key.current.keyFor(reason)));
      key.current.settle();
      Feedback.success();
      setOpen(false);
      setDone('Gig taken down. The freelancer has been told why. Orders already placed carry on.');
    } catch (err) {
      Feedback.error();
      key.current.settle(err);
      setOpen(false);
      setFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer title="Gig">
      <AsyncBoundary loading={loading} error={error} hasData={!!gig} onRetry={reload} skeletonRows={5}>
        {gig ? (
          <>
            <ShopCover photo={gig.photo ? { ...gig.photo, smaller: [] } : null} name={gig.title} width={width - Spacing.three * 2} style={styles.photo} />
            <View style={styles.head}>
              <View style={styles.flex}>
                <Text style={styles.name}>{gig.title}</Text>
                <Text style={consoleStyles.muted}>{`${gig.freelancer.name} · ${gig.categoryLabel}`}</Text>
              </View>
              <Badge {...GIG_STATUS[gig.status]} />
            </View>
            {done ? <Note>{done}</Note> : null}
            {gig.removal ? <Note tone="danger">{`Taken down by Ruxstar on ${shortDate(gig.removal.at)}: ${gig.removal.reason}`}</Note> : null}

            <Card>
              <Facts>
                <Fact label="Photos" value={String(gig.photos.length)} warn={!gig.photos.length} />
                <Fact label="Paid orders" value={String(gig.orders)} />
                {gig.rating ? <Fact label="Rating" value={ratingLine(gig.rating)} /> : null}
                <Fact label="Published" value={gig.publishedAt ? shortDate(gig.publishedAt) : 'Never'} />
                <Fact label="Added" value={shortDate(gig.createdAt)} />
                <Fact label="Changed" value={shortDate(gig.updatedAt)} />
                {gig.missing.length ? <Fact label="Missing" value={gig.missing.join(', ')} warn /> : null}
                <Fact label="Gig id" value={gig.id} />
              </Facts>
            </Card>

            <Section>Packages</Section>
            <Card>
              {sortedPackages(gig.packages).map((p) => (
                <View key={p.tier} style={styles.line}>
                  <Text style={consoleStyles.body}>{`${p.name} · ${money(p.price)}`}</Text>
                  <Text style={consoleStyles.muted}>{deliveryLine(p)}</Text>
                  <Text style={consoleStyles.muted} selectable>
                    {p.description}
                  </Text>
                </View>
              ))}
            </Card>

            {gig.questions.length ? (
              <>
                <Section>Questions for customers</Section>
                <Card>
                  {gig.questions.map((q) => (
                    <Text key={q.id} style={consoleStyles.body}>{`• ${q.text}${q.required ? '' : ' (optional)'}`}</Text>
                  ))}
                </Card>
              </>
            ) : null}

            <Card>
              <Text style={consoleStyles.muted}>About</Text>
              <Text style={consoleStyles.body} selectable>
                {gig.description}
              </Text>
            </Card>

            {failure ? <ErrorBanner message={failure} /> : null}
            {canManage && gig.status !== 'removed' ? <PrimaryButton label="Take down" variant="outline" onPress={() => setOpen(true)} disabled={busy} /> : null}
            <View style={styles.links}>
              <TextLink label="Open the freelancer" onPress={() => router.push({ pathname: '/(admin)/freelancer/[id]', params: { id: gig.freelancer.businessId } })} />
              {canOrders ? (
                <TextLink label="Their orders" onPress={() => router.push({ pathname: '/(admin)/gig-orders', params: { freelancer: gig.freelancer.businessId, label: gig.freelancer.name } })} />
              ) : null}
              {canAudit ? <TextLink label="History for this gig" onPress={() => router.push({ pathname: '/(admin)/audit', params: { target: gig.id } })} /> : null}
            </View>

            <ReasonSheet
              visible={open}
              title={`Take down ${gig.title}?`}
              message="It leaves the listings for good and can’t be ordered or edited. Orders already placed carry on. The freelancer sees your reason."
              prompt="Reason"
              placeholder="For example: this service isn’t allowed on Ruxstar."
              confirmLabel="Take down"
              loading={busy}
              onConfirm={takeDown}
              onCancel={() => setOpen(false)}
            />
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.lg, overflow: 'hidden' },
  flex: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  name: { ...Typography.title, color: Brand.text },
  line: { gap: 2, paddingVertical: Spacing.one },
  links: { gap: Spacing.three, alignItems: 'flex-start', marginTop: Spacing.two },
});
