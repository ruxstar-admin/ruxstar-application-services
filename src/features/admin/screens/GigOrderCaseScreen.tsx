import { useCallback, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { StatusTimeline } from '@/components/ui/StatusTimeline';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { FileList, useFileOpener } from '@/features/gigs/components/OrderParts';
import { orderStatus, orderTimeline, packageLine } from '@/features/gigs/lib/gigs';
import { OrderInvoices } from '@/features/invoices/components/OrderInvoices';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { IdempotentAttempt } from '@/lib/api-client';
import { formatDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { ConsoleGigsService } from '@/services/gigs-service';
import type { DecideInput } from '@/types/gigs';
import { useCan } from '../access';
import { DecideGigSheet } from '../components/DecideGigSheet';
import { Card, Fact, Facts, Note, Section, consoleStyles, errorText } from '../components/parts';

const OUTCOME = { full: 'Full refund', part: 'Part refund', none: 'No refund' } as const;

/** One freelance order for the Ruxstar team: the brief, each delivery, the money, and deciding a reported problem. */
export function GigOrderCaseScreen({ id }: { id: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const canManage = useCan('orders.manage');
  const canAudit = useCan('audit.view');
  const { data: order, loading, error, reload, setData } = useAsyncResource(() => ConsoleGigsService.order(token, id), id);
  const [deciding, setDeciding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const key = useRef(new IdempotentAttempt());
  const files = useFileOpener(
    useCallback(async () => {
      const next = await ConsoleGigsService.order(token, id);
      setData(next);
      return next;
    }, [token, id, setData]),
  );

  const decide = async (body: DecideInput) => {
    setBusy(true);
    setFailure(null);
    try {
      setData(await ConsoleGigsService.decide(token, id, body, key.current.keyFor(body)));
      key.current.settle();
      Feedback.success();
      setDeciding(false);
    } catch (err) {
      Feedback.error();
      key.current.settle(err);
      setFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const open = order?.dispute && !order.dispute.decision && order.status === 'disputed';
  const refunded = order?.refunds.reduce((s, r) => s + r.amount, 0) ?? 0;

  return (
    <ScreenContainer title="Freelance order">
      <AsyncBoundary loading={loading} error={error} hasData={!!order} onRetry={reload} skeletonRows={5}>
        {order ? (
          <>
            <View style={styles.head}>
              <View style={styles.flex}>
                <Text style={styles.name}>{`#${order.orderNo} · ${order.title}`}</Text>
                <Text style={consoleStyles.muted}>{`${order.freelancer.name} → ${order.customer.name}`}</Text>
                <Text style={consoleStyles.muted}>{packageLine(order)}</Text>
              </View>
              <Badge {...orderStatus(order)} />
            </View>
            {order.cancellation ? <Note tone="danger">{`Cancelled by ${order.cancellation.by} ${formatDateTime(order.cancellation.at)}: ${order.cancellation.reason}`}</Note> : null}

            {order.dispute ? (
              <Card>
                <Text style={consoleStyles.body}>{`Problem reported ${formatDateTime(order.dispute.openedAt)}`}</Text>
                <Text style={consoleStyles.body} selectable>
                  {order.dispute.reason}
                </Text>
                {order.dispute.decision ? (
                  <Text style={consoleStyles.muted}>
                    {`${OUTCOME[order.dispute.decision.outcome]}${order.dispute.decision.amount ? ` of ${money(order.dispute.decision.amount)}` : ''} · ${formatDateTime(order.dispute.decision.at)}: ${order.dispute.decision.note}`}
                  </Text>
                ) : null}
                <TextLink label="Open the help ticket" onPress={() => router.push({ pathname: '/(admin)/support/[id]', params: { id: order.dispute!.ticketId } })} />
                {canManage && open ? <PrimaryButton label="Decide" onPress={() => setDeciding(true)} disabled={busy} /> : null}
              </Card>
            ) : null}

            <Section>Progress</Section>
            <StatusTimeline steps={orderTimeline(order)} />

            {order.answers.length || order.note || order.files.length ? (
              <>
                <Section>Brief</Section>
                <Card>
                  {order.answers.map((a) => (
                    <View key={a.question} style={styles.line}>
                      <Text style={consoleStyles.muted}>{a.question}</Text>
                      <Text style={consoleStyles.body} selectable>
                        {a.answer}
                      </Text>
                    </View>
                  ))}
                  {order.note ? <Text style={consoleStyles.body} selectable>{`Note: ${order.note}`}</Text> : null}
                  {order.files.length ? <FileList files={order.files} opening={files.opening} onOpen={files.open} /> : null}
                </Card>
              </>
            ) : null}

            {order.deliveries.length ? <Section>Deliveries</Section> : null}
            {order.deliveries.map((d, i) => (
              <Card key={d.id}>
                <Text style={consoleStyles.body}>{`Delivery ${i + 1} · ${formatDateTime(d.at)}`}</Text>
                <Text style={consoleStyles.body} selectable>
                  {d.message}
                </Text>
                {d.links.map((l) => (
                  <TextLink key={l} label={`${l.replace(/^https?:\/\//, '')} ›`} onPress={() => void Linking.openURL(l)} />
                ))}
                {d.files.length ? <FileList files={d.files} opening={files.opening} onOpen={files.open} /> : null}
                {d.answer ? <Text style={consoleStyles.muted}>{`Customer: ${d.answer.kind}${d.answer.note ? ` · ${d.answer.note}` : ''} · ${formatDateTime(d.answer.at)}`}</Text> : null}
              </Card>
            ))}

            <Card>
              <Facts>
                <Fact label="Customer paid" value={money(order.price.total)} />
                <Fact label={order.quoteId ? 'Offer' : 'Package'} value={money(order.price.items)} />
                <Fact label="Discount" value={order.price.discount ? `${money(order.price.discount)}${order.coupon ? ` · ${order.coupon.code}` : ''}` : 'None'} />
                <Fact label="Platform fee" value={money(order.price.platformFee)} />
                <Fact label="Freelancer’s share" value={order.share === null ? 'Not shown' : money(order.share)} />
                <Fact label="Refunded" value={money(refunded)} warn={refunded > 0} />
                <Fact label="Revisions" value={`${order.revisions.used} of ${order.revisions.included} used`} />
                {order.dueAt ? <Fact label="Due" value={formatDateTime(order.dueAt)} warn={order.late} /> : null}
                {order.completedAt ? <Fact label="Completed" value={formatDateTime(order.completedAt)} /> : null}
                <Fact label="Files" value={order.filesDeleted ? 'Deleted' : 'Kept'} />
                <Fact label="Order id" value={order.id} />
              </Facts>
            </Card>
            <OrderInvoices refs={order.invoices} audience="staff" />

            {files.problem ? <ErrorBanner message={files.problem} /> : null}
            {failure && !deciding ? <ErrorBanner message={failure} /> : null}
            <View style={styles.links}>
              <TextLink label="Open the freelancer" onPress={() => router.push({ pathname: '/(admin)/freelancer/[id]', params: { id: order.freelancer.businessId } })} />
              {order.gigId ? <TextLink label="Open the gig" onPress={() => router.push({ pathname: '/(admin)/gig-listing/[id]', params: { id: order.gigId! } })} /> : null}
              <TextLink label="Open the customer" onPress={() => router.push({ pathname: '/(admin)/account/[id]', params: { id: order.customer.id } })} />
              {canAudit ? <TextLink label="History for this order" onPress={() => router.push({ pathname: '/(admin)/audit', params: { target: order.id } })} /> : null}
            </View>

            {open ? <DecideGigSheet order={order} visible={deciding} busy={busy} failure={failure} onConfirm={(body) => void decide(body)} onCancel={() => setDeciding(false)} /> : null}
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  name: { ...Typography.heading, color: Brand.text },
  line: { gap: 2, paddingVertical: Spacing.one },
  links: { gap: Spacing.three, alignItems: 'flex-start', marginTop: Spacing.two },
});
