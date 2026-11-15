import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { dayText, timeText, whenLine } from '@/features/events/lib/events';
import { errorText } from '@/features/events/lib/messages';
import { OrderInvoices } from '@/features/invoices/components/OrderInvoices';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { CoachingService } from '@/services/coaching-service';
import type { CoachingOrder } from '@/types/coaching';
import { ClassRow } from '../components/ClassRow';
import { JoinButton } from '../components/JoinButton';
import { Card, Notice, Section } from '../components/Parts';
import { useNow } from '../hooks/use-now';
import { attendanceLine, cancelText, certificateLine, certificateProgress, changeText, changedClasses, nextClass } from '../lib/classes';
import { coachingReturn, openCoachingCheckout } from '../lib/checkout';
import { ORDER_STATUS } from '../lib/coaching';

/** Classes shown before "Show all". */
const FIRST_CLASSES = 6;

function OrderView({ order, reload, openPay, fresh }: { order: CoachingOrder; reload: () => void; openPay: boolean; fresh: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const now = useNow();
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [allClasses, setAllClasses] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const opened = useRef(false);
  const status = ORDER_STATUS[order.status];
  const unpaid = order.status === 'awaiting_payment';
  const confirmed = order.status === 'confirmed';
  const demo = order.kind === 'demo';

  const pay = useCallback(async () => {
    setPaying(true);
    setFailure(null);
    try {
      const { checkoutUrl } = await CoachingService.pay(token, order.id, coachingReturn());
      await openCoachingCheckout(checkoutUrl);
    } catch (err) {
      setFailure(errorText(err));
    } finally {
      setPaying(false);
      reload();
    }
  }, [token, order.id, reload]);

  useEffect(() => {
    if (openPay && unpaid && !opened.current) {
      opened.current = true;
      void pay();
    }
  }, [openPay, unpaid, pay]);

  const cancel = async () => {
    setBusy(true);
    try {
      await CoachingService.cancel(token, order.id, { idempotencyKey: newIdempotencyKey() });
      Feedback.success();
      reload();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setBusy(false);
      setCancelling(false);
    }
  };

  const openCertificate = async () => {
    setOpening(true);
    setFailure(null);
    try {
      const fresh = await CoachingService.order(token, order.id);
      if (fresh.certificate) await WebBrowser.openBrowserAsync(fresh.certificate.pdfUrl);
    } catch (err) {
      setFailure(errorText(err));
    } finally {
      setOpening(false);
    }
  };

  const next = confirmed ? nextClass(order.classes, now) : null;
  const changed = confirmed ? changedClasses(order.classes, now) : [];
  const progress = certificateProgress(order, now);
  const classes = allClasses ? order.classes : order.classes.slice(0, FIRST_CLASSES);
  const venue = [order.course.venueName, order.course.address, order.course.city].filter(Boolean).join(', ');
  const footer = unpaid ? <PrimaryButton label={`Pay ${money(order.price.total)}`} loading={paying} onPress={pay} /> : null;

  return (
    <ScreenContainer title={demo ? 'Demo class' : 'Enrolment'} footer={footer}>
      {fresh && confirmed ? (
        <View style={styles.yay}>
          <Ionicons name="checkmark-circle" size={22} color={Brand.success} />
          <Text style={styles.yayText}>{demo ? `Demo booked for ${order.student.name}.` : `${order.student.name} is enrolled. See you in class!`}</Text>
        </View>
      ) : null}

      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title} accessibilityRole="link" onPress={() => router.push({ pathname: '/(customer)/coaching/[id]', params: { id: order.course.id } })}>
            {order.course.title}
          </Text>
          <Text style={styles.muted}>{`For ${order.student.name}`}</Text>
          <Text style={styles.muted}>{`${order.batch.name} · ${order.batch.schedule}`}</Text>
          <Text style={styles.muted}>{order.course.mode === 'online' ? `Online · ${order.business.name}` : venue || order.business.name}</Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>

      {unpaid && order.payBy ? <Notice tone="warning" text={`Pay by ${timeText(order.payBy)} or the seat goes back.`} /> : null}
      {order.course.removed ? <Notice tone="error" text="Ruxstar took this course down. Classes that hadn’t started are cancelled." /> : null}
      {order.batch.cancelled ? <Notice tone="error" text={`The institute cancelled this batch.${order.batch.cancelReason ? ` ${order.batch.cancelReason}` : ''} Everything you paid is refunded.`} /> : null}
      {order.status === 'cancelled' && order.reason && !order.batch.cancelled ? <Notice text={order.reason} /> : null}
      {order.refund ? (
        <Notice
          tone="success"
          text={
            order.refund.status === 'done'
              ? `${money(order.refund.amount)} refunded to how you paid. Banks take up to 7 days to show it.`
              : `Refunding ${money(order.refund.amount)}…`
          }
        />
      ) : null}
      {changed.map((c) => (
        <Notice key={c.id} tone={c.status === 'cancelled' ? 'error' : 'warning'} text={`${whenLine(c.startsAt, c.endsAt)}: ${changeText(c)}`} />
      ))}

      {next ? (
        <Card>
          <Text style={styles.label}>{demo ? 'Your demo class' : 'Next class'}</Text>
          <Text style={styles.strong}>{whenLine(next.startsAt, next.endsAt)}</Text>
          {order.course.mode === 'offline' && venue ? (
            <TextLink label="Open in maps" onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`)} />
          ) : null}
          <JoinButton orderId={order.id} cls={next} mode={order.course.mode} now={now} />
        </Card>
      ) : null}

      {confirmed && !demo ? (
        <Card>
          <Text style={styles.label}>Attendance</Text>
          <Text style={styles.strong}>{attendanceLine(order)}</Text>
          {order.certificate ? (
            <>
              <Text style={styles.muted}>{`Certificate issued ${dayText(order.certificate.issuedAt)} · code ${order.certificate.code}`}</Text>
              <PrimaryButton label="Open certificate" variant="outline" loading={opening} onPress={openCertificate} />
            </>
          ) : (
            <Text style={styles.muted}>{certificateLine(progress, order.attendance.needed)}</Text>
          )}
        </Card>
      ) : null}

      {confirmed ? (
        <View style={styles.links}>
          {!demo ? <ListRow icon="folder-open-outline" title="Notes and files" subtitle="What the institute shared for this batch" onPress={() => router.push({ pathname: '/(customer)/coaching/materials/[id]', params: { id: order.id } })} /> : null}
          <ListRow icon="megaphone-outline" title="Messages from the institute" onPress={() => router.push({ pathname: '/(customer)/coaching/messages/[id]', params: { id: order.id } })} />
        </View>
      ) : null}

      {order.classes.length ? (
        <>
          <Section title={demo ? 'Class' : `Classes · ${order.classes.filter((c) => c.status !== 'cancelled').length}`} />
          <View style={styles.classes}>
            {classes.map((c, i) => (
              <ClassRow key={c.id} cls={c} index={i + 1} />
            ))}
          </View>
          {order.classes.length > FIRST_CLASSES ? (
            <TextLink label={allClasses ? 'Show fewer' : `Show all ${order.classes.length} classes`} onPress={() => setAllClasses((v) => !v)} />
          ) : null}
        </>
      ) : null}

      <View style={styles.summary}>
        <Text style={styles.label}>{`${demo ? 'Demo' : 'Enrolment'} #${order.orderNo}`}</Text>
        <Text style={styles.value}>
          {order.price.total
            ? `${money(order.price.total)}${unpaid ? ' to pay' : ''}${order.price.platformFee ? `, including a ${money(order.price.platformFee)} platform fee` : ''}`
            : 'Free'}
        </Text>
        {order.price.discount ? <Text style={styles.label}>{`${money(order.price.discount)} off${order.coupon ? ` with ${order.coupon.code}` : ''}`}</Text> : null}
        <Text style={styles.label}>{`By ${order.business.name}`}</Text>
      </View>
      <OrderInvoices refs={order.invoices} />

      {order.status !== 'cancelled' ? <Text style={styles.muted}>{cancelText(order)}</Text> : null}
      {order.canCancel ? <TextLink muted label={unpaid ? 'Cancel' : order.price.total ? 'Cancel and get a refund' : 'Cancel'} onPress={() => setCancelling(true)} /> : null}
      {failure ? <ErrorBanner message={failure} onRetry={reload} /> : null}

      <ConfirmSheet
        visible={cancelling}
        title={demo ? 'Cancel the demo class?' : 'Cancel this enrolment?'}
        message={
          unpaid
            ? 'The seat goes to someone else.'
            : order.price.total
              ? `${order.student.name}’s seat is given up and ${money(order.price.total)} goes back to how you paid.`
              : `${order.student.name}’s seat is given up.`
        }
        confirmLabel={demo ? 'Cancel demo' : 'Cancel enrolment'}
        loading={busy}
        onConfirm={cancel}
        onCancel={() => setCancelling(false)}
      />
    </ScreenContainer>
  );
}

/** One enrolment or demo: the next class and join button, changes, attendance, the certificate, notes, and cancelling while it's refundable. */
export function CoachingOrderScreen() {
  const token = useAuthToken();
  const { id, pay, fresh } = useLocalSearchParams<{ id: string; pay?: string; fresh?: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => CoachingService.order(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));
  return data ? (
    <OrderView order={data} reload={reload} openPay={pay === '1'} fresh={fresh === '1' || pay === '1'} />
  ) : (
    <ScreenContainer title="Enrolment">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={4}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  yay: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center', padding: Spacing.three, borderRadius: Radius.md, backgroundColor: 'rgba(52,199,89,0.12)' },
  yayText: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text, flex: 1 },
  head: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  headText: { flex: 1, gap: 2 },
  title: { ...Typography.heading, color: Brand.text },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  strong: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  label: { ...Typography.caption, color: Brand.textMuted },
  links: { paddingHorizontal: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, overflow: 'hidden' },
  classes: { gap: Spacing.one },
  summary: { gap: 4, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border },
  value: { ...Typography.body, fontSize: 15, color: Brand.text },
});
