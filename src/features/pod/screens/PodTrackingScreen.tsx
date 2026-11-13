import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { StatusTimeline } from '@/components/ui/StatusTimeline';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { FileRow } from '@/features/pod/components/FileRow';
import { OrderPriceList } from '@/features/pod/components/OrderPriceList';
import { ProblemCard } from '@/features/pod/components/ProblemCard';
import {
  checkoutReturn,
  choiceLine,
  dayLabel,
  isClosed,
  isFinished,
  openCheckout,
  PROBLEM_KINDS,
  PROBLEM_LABEL,
  progressOf,
  quantityLine,
  refundLine,
  STATUS_LABEL,
  STATUS_TONE,
} from '@/features/pod/lib/order';
import { toUploadJpeg } from '@/features/profile/lib/profile-photo';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { formatDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { OrderService } from '@/services/order-service';
import type { Order, PrintFile, ProblemKind } from '@/types/order';

const POLL_MS = 8000;
const PHOTO_SIDE = 1600;

function News({ order }: { order: Order }) {
  const full = order.refunds.find((r) => r.kind === 'full');
  if (order.status === 'rejected') {
    return (
      <View style={styles.news}>
        <Text style={styles.strong}>{`${order.shop.name} couldn't take this order`}</Text>
        {order.reason ? <Text style={styles.muted}>{order.reason}</Text> : null}
        {full ? <Text style={styles.muted}>{refundLine(full)}</Text> : null}
      </View>
    );
  }
  if (order.status === 'cancelled') {
    return (
      <View style={styles.news}>
        <Text style={styles.strong}>Cancelled</Text>
        {order.reason ? <Text style={styles.muted}>{order.reason}</Text> : null}
        <Text style={styles.muted}>{full ? refundLine(full) : 'Nothing was charged.'}</Text>
      </View>
    );
  }
  if (order.status === 'refunded') {
    return (
      <View style={styles.news}>
        <Text style={styles.strong}>Refunded by Ruxstar</Text>
        {order.reason ? <Text style={styles.muted}>{order.reason}</Text> : null}
        {full ? <Text style={styles.muted}>{refundLine(full)}</Text> : null}
      </View>
    );
  }
  if (order.status === 'awaiting_payment') {
    return (
      <View style={styles.news}>
        <Text style={styles.strong}>Not paid yet</Text>
        <Text style={styles.muted}>{`${order.shop.name} gets the order once you pay.`}</Text>
      </View>
    );
  }
  if (order.status === 'placed' && order.acceptBy) {
    return (
      <View style={styles.news}>
        <Text style={styles.strong}>{`Waiting for ${order.shop.name}`}</Text>
        <Text style={styles.muted}>{`If they don't accept by ${formatDateTime(order.acceptBy)}, it's cancelled and you get it all back.`}</Text>
      </View>
    );
  }
  return null;
}

/** Kind, a note, then photos one by one from the problem card. */
function ReportSheet({ order, visible, onClose, onReported }: { order: Order; visible: boolean; onClose: () => void; onReported: (order: Order) => void }) {
  const token = useAuthToken();
  const late = order.status !== 'delivered';
  const [kind, setKind] = useState<ProblemKind>(late ? 'not_received' : 'wrong_item');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const next = await OrderService.reportProblem(token, order.id, { kind, note: note.trim() }, { idempotencyKey: key.current });
      Feedback.success();
      onReported(next);
    } catch (err) {
      Feedback.error();
      setError(err instanceof Error ? err.message : 'Could not send. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Report a problem">
      <Text style={styles.muted}>{"Ruxstar looks into it and replies here. The shop isn't paid until then."}</Text>
      <ChoiceChips options={PROBLEM_KINDS.map((k) => ({ key: k, label: PROBLEM_LABEL[k] }))} value={kind} onChange={setKind} />
      <InputField label="What went wrong" value={note} onChangeText={setNote} multiline maxLength={1000} showCount placeholder="For example: the design is printed upside down" />
      <Text style={styles.faint}>You can add up to 3 photos after you send this.</Text>
      {error ? <ErrorBanner message={error} /> : null}
      <PrimaryButton label="Send to Ruxstar" onPress={send} loading={sending} disabled={note.trim().length < 3} />
    </BottomSheet>
  );
}

function OrderDetails({ order, onChanged }: { order: Order; onChanged: (order?: Order) => void }) {
  const token = useAuthToken();
  const { pay } = useLocalSearchParams<{ pay?: string }>();
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelKey = useRef(newIdempotencyKey());
  const photoKey = useRef(newIdempotencyKey());
  const autoOpened = useRef(false);

  const startPayment = useCallback(async () => {
    setPaying(true);
    setError(null);
    try {
      const { checkoutUrl } = await OrderService.pay(token, order.id, checkoutReturn());
      await openCheckout(checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment did not open. Try again.');
    } finally {
      setPaying(false);
      onChanged();
    }
  }, [token, order.id, onChanged]);

  // Straight from placing the order, the checkout opens by itself once.
  useEffect(() => {
    if (pay === '1' && order.status === 'awaiting_payment' && !autoOpened.current) {
      autoOpened.current = true;
      startPayment();
    }
  }, [pay, order.status, startPayment]);

  const cancel = async () => {
    setCancelling(true);
    try {
      const next = await OrderService.cancel(token, order.id, { idempotencyKey: cancelKey.current });
      Feedback.success();
      setConfirming(false);
      onChanged(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel. Try again.');
      setConfirming(false);
      Feedback.error();
    } finally {
      setCancelling(false);
    }
  };

  const openFile = async (file: PrintFile) => {
    try {
      const { url } = await OrderService.fileLink(token, order.id, file.id);
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the file.');
    }
  };

  const addPhoto = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return;
    setAdding(true);
    setError(null);
    try {
      const next = await OrderService.addProblemPhoto(token, order.id, await toUploadJpeg(asset, PHOTO_SIDE), photoKey.current);
      photoKey.current = newIdempotencyKey();
      onChanged(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the photo. Try again.');
    } finally {
      setAdding(false);
    }
  };

  const cancellable = order.status === 'awaiting_payment' || order.status === 'placed';
  const moving = order.status !== 'awaiting_payment' && !isClosed(order.status);
  const partials = order.refunds.filter((r) => r.kind === 'partial');
  const inHand = moving && order.status !== 'placed' && order.status !== 'delivered';

  return (
    <>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text style={styles.title}>{`Order #${order.orderNo}`}</Text>
          <Text style={styles.muted}>{order.shop.name}</Text>
        </View>
        <Badge label={STATUS_LABEL[order.status]} tone={STATUS_TONE[order.status]} />
      </View>
      {inHand && order.readyBy ? <Text style={styles.muted}>{`Ready by ${dayLabel(order.readyBy)}`}</Text> : null}

      <News order={order} />
      {error ? <ErrorBanner message={error} /> : null}

      {order.status === 'awaiting_payment' ? <PrimaryButton label={`Pay ${money(order.price.total)}`} onPress={startPayment} loading={paying} /> : null}

      {order.problem ? (
        <>
          <Text style={styles.section}>Your report</Text>
          <ProblemCard problem={order.problem} onAddPhoto={addPhoto} adding={adding} />
        </>
      ) : order.canReport ? (
        <View style={styles.report}>
          <PrimaryButton label="Report a problem" variant="outline" onPress={() => setReporting(true)} />
          <Text style={styles.faint}>
            {order.reportUntil ? `Until ${formatDateTime(order.reportUntil)}. After that, the shop is paid.` : 'It is past the date the shop promised.'}
          </Text>
        </View>
      ) : null}

      {partials.length ? (
        <>
          <Text style={styles.section}>Refunds</Text>
          <View style={styles.card}>
            {partials.map((r) => (
              <View key={r.at}>
                <Text style={styles.strong}>{r.reason ?? 'Refund'}</Text>
                <Text style={styles.muted}>{refundLine(r)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {moving ? (
        <>
          <Text style={styles.section}>Progress</Text>
          <StatusTimeline steps={progressOf(order)} />
        </>
      ) : null}

      <Text style={styles.section}>Your print</Text>
      <View style={styles.card}>
        <Text style={styles.strong}>{order.productLabel}</Text>
        <Text style={styles.muted}>{[quantityLine(order), choiceLine(order)].filter(Boolean).join(' · ')}</Text>
        {order.note ? <Text style={styles.muted}>{`Note: ${order.note}`}</Text> : null}
      </View>
      {order.files.map((file) => (
        <FileRow key={file.id} file={file} onOpen={() => openFile(file)} />
      ))}

      <Text style={styles.section}>Deliver to</Text>
      <View style={styles.card}>
        <Text style={styles.strong}>{order.address.name}</Text>
        <Text style={styles.muted}>{`${order.address.line}, ${order.address.city} ${order.address.pincode}`}</Text>
        <Text style={styles.muted}>{order.address.phone}</Text>
      </View>

      <Text style={styles.section}>Payment</Text>
      <View style={styles.card}>
        <OrderPriceList price={order.price} pricing={order.pricing} />
      </View>

      {cancellable ? (
        <View style={styles.cancel}>
          <PrimaryButton label="Cancel order" variant="outline" onPress={() => setConfirming(true)} />
        </View>
      ) : null}

      <ConfirmSheet
        visible={confirming}
        title="Cancel this order?"
        message={order.status === 'placed' ? `You get the full ${money(order.price.total)} back.` : 'Nothing has been charged.'}
        confirmLabel="Cancel order"
        loading={cancelling}
        onConfirm={cancel}
        onCancel={() => setConfirming(false)}
      />
      {order.canReport ? (
        <ReportSheet
          order={order}
          visible={reporting}
          onClose={() => setReporting(false)}
          onReported={(next) => {
            setReporting(false);
            onChanged(next);
          }}
        />
      ) : null}
    </>
  );
}

/** A customer's print order. While it is moving, it refreshes itself; opening it also checks for a payment. */
export function PodTrackingScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload, setData } = useAsyncResource(() => OrderService.get(token, id));
  const finished = data ? isFinished(data.status) : false;

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [finished, reload]);

  const changed = useCallback((next?: Order) => (next ? setData(next) : reload()), [reload, setData]);

  return (
    <ScreenContainer title="Print order">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {data ? <OrderDetails order={data} onChanged={changed} /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  title: { ...Typography.title, color: Brand.text },
  strong: { ...Typography.bodyStrong, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted },
  faint: { ...Typography.caption, fontSize: 12, color: Brand.textFaint },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four, marginBottom: Spacing.one },
  card: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  news: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surfaceAlt, marginTop: Spacing.two },
  cancel: { marginTop: Spacing.four },
  report: { gap: Spacing.one, marginTop: Spacing.three },
});
