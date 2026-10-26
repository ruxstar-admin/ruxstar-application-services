import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { InputField } from '@/components/ui/InputField';
import { ListRow } from '@/components/ui/ListRow';
import { PriceSummary, priceTotal } from '@/components/ui/PriceSummary';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { couponLabel } from '@/features/money/lib/rules';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { formatRupees } from '@/lib/money';
import { CommerceService } from '@/services/commerce-service';
import { MoneyService } from '@/services/money-service';
import type { PaymentMethod, PriceLine } from '@/types/commerce';
import type { CouponCheck } from '@/types/money';
import type { ModuleKey } from '@/types/vendor';

interface PaymentSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  lines: PriceLine[];
  /** What is being bought, sent with the payment ("pod-order", "event-ticket"…). */
  purpose: string;
  /** Module being paid for; enables the coupon field. */
  module?: ModuleKey;
  /** Policy text shown before paying (e.g. the coaching refund rules). */
  notice?: string;
  /** Called once the payment is confirmed, with the gateway reference. The sheet stays open on its success screen. */
  onPaid: (reference: string) => void;
  /** Called when the user taps Done on the success screen. */
  onDone: () => void;
  /** True while the order/booking is still being created after payment; Done waits. */
  finishing?: boolean;
}

const METHODS: readonly { key: PaymentMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'upi', label: 'UPI', icon: 'phone-portrait-outline' },
  { key: 'card', label: 'Card', icon: 'card-outline' },
  { key: 'netbanking', label: 'Net banking', icon: 'business-outline' },
];

type Phase = 'review' | 'processing' | 'failed' | 'success';

/** The one pay step for every module: review price, apply a coupon, pick a method, pay, retry on failure. Prepaid only. */
function PaymentFlow({ lines, purpose, module, notice, onPaid, onDone, finishing }: Omit<PaymentSheetProps, 'visible' | 'onClose' | 'title'>) {
  const token = useAuthToken();
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [phase, setPhase] = useState<Phase>('review');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<CouponCheck | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const total = priceTotal(lines);
  const itemTotal = priceTotal(lines.filter((line) => line.kind !== 'delivery'));
  const payable = total - (coupon?.discount ?? 0);
  const shownLines = coupon ? [...lines, { label: `${coupon.code} · ${couponLabel(coupon)}`, amount: -coupon.discount }] : lines;
  const locked = sessionId !== null;

  const applyCoupon = async () => {
    setApplying(true);
    setCouponError(null);
    try {
      setCoupon(await MoneyService.validateCoupon(token, couponInput, itemTotal, module));
      Feedback.success();
    } catch (err) {
      Feedback.error();
      setCouponError(err instanceof ApiError && err.kind === 'conflict' ? 'That coupon does not apply to this purchase.' : 'That coupon is not valid.');
    } finally {
      setApplying(false);
    }
  };

  const pay = async () => {
    setPhase('processing');
    setMessage(null);
    try {
      const id = sessionId ?? (await CommerceService.startPayment(token, { amount: total, itemTotal, purpose, module, couponCode: coupon?.code })).sessionId;
      setSessionId(id);
      const result = await CommerceService.confirmPayment(token, id, method);
      if (result.status === 'paid') {
        Feedback.success();
        setPhase('success');
        onPaid(result.reference ?? '');
      } else {
        Feedback.error();
        setPhase('failed');
        setMessage('The payment was declined. Try again or pick another method.');
      }
    } catch (err) {
      Feedback.error();
      setPhase('failed');
      setMessage(err instanceof ApiError && err.kind === 'network' ? 'No internet connection. Check your network and try again.' : 'Could not complete the payment. Please try again.');
    }
  };

  if (phase === 'success') {
    return (
      <>
        <View style={styles.doneIcon}>
          <Ionicons name="checkmark" size={28} color={Brand.text} />
        </View>
        <Text style={styles.doneTitle}>Payment successful</Text>
        <Text style={styles.note}>{`${formatRupees(payable)} paid to Ruxstar. It is held safely until your order is complete.`}</Text>
        <PrimaryButton label="Done" onPress={onDone} loading={finishing} />
      </>
    );
  }

  const busy = phase === 'processing';

  return (
    <>
      <PriceSummary lines={shownLines} />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {module && !locked ? (
        coupon ? (
          <View style={styles.couponRow}>
            <Text style={styles.couponApplied}>{`${coupon.code} applied`}</Text>
            <TextLink muted label="Remove" onPress={() => { setCoupon(null); setCouponInput(''); }} />
          </View>
        ) : couponOpen ? (
          <View style={styles.couponBox}>
            <InputField label="Coupon code" value={couponInput} onChangeText={(v) => { setCouponInput(v.toUpperCase().replace(/[^A-Z0-9]/g, '')); setCouponError(null); }} autoCapitalize="characters" placeholder="e.g. WELCOME50" error={couponError ?? undefined} />
            <PrimaryButton label="Apply" variant="outline" onPress={applyCoupon} disabled={couponInput.length < 4} loading={applying} />
          </View>
        ) : (
          <TextLink label="Have a coupon?" onPress={() => setCouponOpen(true)} />
        )
      ) : null}

      <Text style={styles.section}>Pay with</Text>
      {METHODS.map((m) => (
        <ListRow
          key={m.key}
          icon={m.icon}
          title={m.label}
          onPress={busy ? undefined : () => setMethod(m.key)}
          right={<Ionicons name={method === m.key ? 'radio-button-on' : 'radio-button-off'} size={22} color={method === m.key ? Brand.primary : Brand.textFaint} />}
        />
      ))}

      {message ? <Text style={styles.error}>{message}</Text> : null}
      <PrimaryButton label={phase === 'failed' ? `Try again · ${formatRupees(payable)}` : `Pay ${formatRupees(payable)}`} onPress={pay} loading={busy} />
    </>
  );
}

export function PaymentSheet({ visible, onClose, title = 'Checkout', ...flow }: PaymentSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <PaymentFlow {...flow} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.two },
  notice: { ...Typography.caption, color: Brand.warning, backgroundColor: 'rgba(255,176,32,0.1)', padding: Spacing.three, borderRadius: Radius.md },
  error: { ...Typography.caption, color: Brand.error },
  note: { ...Typography.body, color: Brand.textMuted },
  couponBox: { gap: Spacing.two },
  couponRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  couponApplied: { ...Typography.bodyStrong, color: Brand.success },
  doneIcon: { width: 56, height: 56, borderRadius: Radius.pill, backgroundColor: Brand.success, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { ...Typography.heading, color: Brand.text },
});
