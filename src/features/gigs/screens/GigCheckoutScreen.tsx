import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Typography } from '@/constants/theme';
import { Card, Divider, PriceLine, Section } from '@/features/coaching/components/Parts';
import { CheckoutCoupons } from '@/features/coupons/components/CheckoutCoupons';
import { couponState } from '@/features/coupons/lib/coupons';
import { errorText } from '@/features/events/lib/messages';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { IdempotentAttempt } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { GigsService } from '@/services/gigs-service';
import type { CouponCheck } from '@/types/coupon';
import type { GigDetail, GigPackage, GigsRules } from '@/types/gigs';
import { FilesField, fileIdsOf, filesReady, type HeldFile } from '../components/FilesField';
import { useGigsRules } from '../hooks/use-gigs';
import { gigsReturn } from '../lib/checkout';
import { limitsOf } from '../lib/files';
import { deliveryLine, orderPrice, pickPackage } from '../lib/gigs';

const OWNER = 'Freelancer';

function Checkout({ gig, pack, rules }: { gig: GigDetail; pack: GigPackage; rules: GigsRules }) {
  const router = useRouter();
  const token = useAuthToken();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<HeldFile[]>([]);
  const [note, setNote] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(new IdempotentAttempt());

  const offersKey = `${pack.tier}|${code ?? ''}`;
  const offers = useAsyncResource<{ key: string; result: CouponCheck }>(
    () => GigsService.offers(token, gig.id, pack.tier, code ?? undefined).then((result) => ({ key: offersKey, result })),
    offersKey,
  );
  const offersNow = offers.data?.key === offersKey ? offers.data.result : undefined;
  const coupon = couponState(offersNow, code, OWNER);
  const checking = !!code && offers.data?.key !== offersKey && !offers.error;
  const couponProblem = coupon.problem ?? (code && offers.error && offers.data?.key !== offersKey ? errorText(offers.error) : null);
  const price = orderPrice(pack.price, gig.platformFee, coupon.discount);

  const missing = gig.questions.filter((q) => q.required && !answers[q.id]?.trim());
  const sending = !filesReady(files);

  const place = async () => {
    setShown(true);
    if (missing.length || sending) {
      Feedback.error();
      setFailure(missing.length ? 'Answer the questions marked as needed.' : 'Wait for your files to finish sending, or remove the ones that failed.');
      return;
    }
    setBusy(true);
    setFailure(null);
    const body = {
      tier: pack.tier,
      answers: gig.questions.flatMap((q) => (answers[q.id]?.trim() ? [{ questionId: q.id, answer: answers[q.id]!.trim() }] : [])),
      ...(files.length ? { fileIds: fileIdsOf(files) } : {}),
      note: note.trim() || null,
      ...(coupon.applied ? { coupon: coupon.applied.code } : {}),
      returnTo: gigsReturn(),
    };
    try {
      const { order, checkoutUrl } = await GigsService.place(token, gig.id, body, { idempotencyKey: attempt.current.keyFor(body) });
      attempt.current.settle();
      Feedback.success();
      router.replace({ pathname: '/(customer)/gigs/order/[id]', params: { id: order.id, ...(checkoutUrl ? { pay: '1' } : { fresh: '1' }) } });
    } catch (err) {
      Feedback.error();
      attempt.current.settle(err);
      if (err instanceof ApiError && err.code === 'COUPON_INVALID') {
        setCode(null);
        setFailure(`${err.message} We took the coupon off, so the total is ${money(orderPrice(pack.price, gig.platformFee).total)} now.`);
      } else setFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const footer = <PrimaryButton label={`Pay ${money(price.total)}`} loading={busy} disabled={checking} onPress={place} />;

  return (
    <ScreenContainer title="Order this gig" footer={footer}>
      <Card>
        <Text style={styles.strong}>{gig.title}</Text>
        <Text style={styles.small}>{`${pack.name} · ${deliveryLine(pack)}`}</Text>
        <Text style={styles.small}>{`By ${gig.freelancer.name}`}</Text>
      </Card>
      <TextLink label="Pick another package" onPress={() => router.back()} />

      {gig.questions.length ? <Section title="The freelancer asks" /> : null}
      {gig.questions.map((q) => (
        <InputField
          key={q.id}
          label={q.required ? q.text : `${q.text} (optional)`}
          value={answers[q.id] ?? ''}
          onChangeText={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
          multiline
          maxLength={limitsOf(rules).answer}
          error={shown && q.required && !answers[q.id]?.trim() ? 'Needed' : undefined}
        />
      ))}

      <Section title="Your brief" />
      <InputField label="Note (optional)" value={note} onChangeText={setNote} multiline maxLength={1000} placeholder="What you need, the style you like, anything else" />
      <FilesField use="brief" maxMb={rules.deliveryMaxMb} files={files} setFiles={setFiles} label="Files for the freelancer (optional)" />

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
        <PriceLine label={pack.name} amount={price.items} />
        {price.discount && coupon.applied ? <PriceLine label={`Coupon ${coupon.applied.code}`} amount={price.discount} minus /> : null}
        {price.platformFee ? <PriceLine label="Platform fee" amount={price.platformFee} /> : null}
        <Divider />
        <PriceLine label="Total" amount={price.total} strong />
      </Card>
      {gig.rules ? <Text style={styles.small}>{gig.rules}</Text> : null}
      <Text style={styles.small}>You’ll pay on Cashfree’s secure page. Ruxstar holds the money until you approve the work.</Text>
      {failure ? <ErrorBanner message={failure} /> : null}
    </ScreenContainer>
  );
}

/** Ordering one package of a gig (`tier`): the freelancer's questions, a note and files for the brief, a coupon, then pay. */
export function GigCheckoutScreen() {
  const token = useAuthToken();
  const { id, tier } = useLocalSearchParams<{ id: string; tier?: string }>();
  const gig = useAsyncResource(() => GigsService.get(token, id), id);
  const rules = useGigsRules();
  const pack = gig.data ? pickPackage(gig.data.packages, tier) : undefined;

  return gig.data && pack && rules.data ? (
    <Checkout gig={gig.data} pack={pack} rules={rules.data} />
  ) : (
    <ScreenContainer title="Order this gig">
      <AsyncBoundary
        loading={gig.loading || rules.loading}
        error={gig.error ?? rules.error}
        hasData={false}
        onRetry={() => {
          gig.reload();
          rules.reload();
        }}
        skeletonRows={4}
      >
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  small: { ...Typography.caption, color: Brand.textMuted },
  strong: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
});
