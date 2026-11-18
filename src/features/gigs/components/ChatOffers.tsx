import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Card, Divider, PriceLine } from '@/features/coaching/components/Parts';
import { CheckoutCoupons } from '@/features/coupons/components/CheckoutCoupons';
import { couponState } from '@/features/coupons/lib/coupons';
import { errorText } from '@/features/events/lib/messages';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { IdempotentAttempt, newIdempotencyKey } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { GigDeskService, GigsService } from '@/services/gigs-service';
import type { PendingMessage } from '@/types/chat';
import type { CouponCheck } from '@/types/coupon';
import type { QuoteCard } from '@/types/gigs';
import { useGigsRules, useMyFreelancer } from '../hooks/use-gigs';
import { gigsReturn } from '../lib/checkout';
import { daysText, orderPrice, revisionsText } from '../lib/gigs';

const OWNER = 'Freelancer';

export interface OfferAsk {
  message: PendingMessage;
  action: 'pay' | 'withdraw';
}

function PaySheet({ quote, onClose }: { quote: QuoteCard; onClose: () => void }) {
  const router = useRouter();
  const token = useAuthToken();
  const rules = useGigsRules();
  const [note, setNote] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(new IdempotentAttempt());

  const offersKey = `${quote.id}|${code ?? ''}`;
  const offers = useAsyncResource<{ key: string; result: CouponCheck }>(
    () => GigsService.quoteOffers(token, quote.id, code ?? undefined).then((result) => ({ key: offersKey, result })),
    offersKey,
  );
  const offersNow = offers.data?.key === offersKey ? offers.data.result : undefined;
  const coupon = couponState(offersNow, code, OWNER);
  const checking = !!code && offers.data?.key !== offersKey && !offers.error;
  const couponProblem = coupon.problem ?? (code && offers.error && offers.data?.key !== offersKey ? errorText(offers.error) : null);
  const platformFee = rules.data?.platformFee ?? 0;
  const price = orderPrice(quote.price, platformFee, coupon.discount);

  const pay = async () => {
    setBusy(true);
    setFailure(null);
    const body = { note: note.trim() || null, ...(coupon.applied ? { coupon: coupon.applied.code } : {}), returnTo: gigsReturn() };
    try {
      const placed = await GigsService.payQuote(token, quote.id, body, { idempotencyKey: attempt.current.keyFor([body.note, body.coupon]) });
      attempt.current.settle();
      Feedback.success();
      onClose();
      router.push({ pathname: '/(customer)/gigs/order/[id]', params: { id: placed.order.id, pay: placed.checkoutUrl ? '1' : undefined, fresh: '1' } });
    } catch (err) {
      Feedback.error();
      attempt.current.settle(err);
      if (err instanceof ApiError && err.code === 'COUPON_INVALID') {
        setCode(null);
        setFailure(`${err.message} We took the coupon off, so the total is ${money(orderPrice(quote.price, platformFee).total)} now.`);
      } else setFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible onClose={onClose} title="Pay for this offer">
      <Text style={styles.strong}>{quote.title}</Text>
      <Text style={styles.muted}>{`${quote.freelancer.name} · ${daysText(quote.deliveryDays)} delivery · ${revisionsText(quote.revisions)}`}</Text>
      <InputField label="Note for the freelancer (optional)" value={note} onChangeText={setNote} maxLength={1000} placeholder="Anything they should know to start" />
      <CheckoutCoupons
        offers={offersNow?.offers ?? null}
        applied={coupon.applied}
        discount={coupon.discount}
        problem={couponProblem}
        onApply={(next) => (next === code ? offers.reload() : setCode(next))}
        onRemove={() => setCode(null)}
        owner={OWNER}
      />
      <Card>
        <PriceLine label="Offer" amount={price.items} />
        {price.discount && coupon.applied ? <PriceLine label={`Coupon ${coupon.applied.code}`} amount={price.discount} minus /> : null}
        {price.platformFee ? <PriceLine label="Platform fee" amount={price.platformFee} /> : null}
        <Divider />
        <PriceLine label="To pay" amount={price.total} strong />
      </Card>
      <Text style={styles.muted}>The work starts once you pay. You approve each delivery, or ask for changes.</Text>
      {failure ? <ErrorBanner message={failure} /> : null}
      <PrimaryButton label={rules.data ? `Pay ${money(price.total)}` : 'Go to payment'} loading={busy} disabled={checking} onPress={pay} />
    </BottomSheet>
  );
}

/**
 * Freelance offers in a 1:1 chat: "Send an offer" for a verified freelancer, paying an offer for the customer, and
 * withdrawing one for the freelancer who sent it.
 */
export function ChatOffers({
  chatId,
  peerName,
  offerable,
  ask,
  onClose,
  onChanged,
}: {
  chatId: string;
  peerName: string;
  /** A 1:1 chat you can write in. */
  offerable: boolean;
  ask: OfferAsk | null;
  onClose: () => void;
  onChanged: (messageId: string, quote: QuoteCard) => void;
}) {
  const router = useRouter();
  const token = useAuthToken();
  const me = useMyFreelancer(!offerable);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const quote = ask?.message.quote ?? null;
  const canOffer = offerable && !!me.data && me.data.verified && !me.data.suspended;

  const withdraw = async () => {
    if (!ask || !quote) return;
    setBusy(true);
    setFailure(null);
    try {
      onChanged(ask.message.id, await GigDeskService.withdrawQuote(token, quote.id, { idempotencyKey: newIdempotencyKey() }));
      Feedback.success();
      onClose();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {canOffer ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Send ${peerName} a custom offer`}
          onPress={() => {
            Feedback.tap();
            router.push({ pathname: '/(customer)/freelance/offer', params: { chat: chatId, name: peerName } });
          }}
          style={({ pressed }) => [styles.offer, pressed && styles.pressed]}
        >
          <Ionicons name="briefcase-outline" size={16} color={Brand.primarySoft} />
          <Text style={styles.offerText}>Send an offer</Text>
        </Pressable>
      ) : null}
      {ask?.action === 'pay' && quote ? <PaySheet quote={quote} onClose={onClose} /> : null}
      <ConfirmSheet
        visible={ask?.action === 'withdraw'}
        title="Withdraw this offer?"
        message={failure ?? `${peerName} can’t pay for it once it’s withdrawn. You can send a new one.`}
        confirmLabel="Withdraw"
        loading={busy}
        onConfirm={() => void withdraw()}
        onCancel={() => {
          setFailure(null);
          onClose();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  offer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    marginLeft: Spacing.three,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 32,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  offerText: { ...Typography.caption, color: Brand.text, fontFamily: Typography.bodyStrong.fontFamily },
  pressed: { opacity: 0.8 },
  strong: { ...Typography.bodyStrong, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted },
});
