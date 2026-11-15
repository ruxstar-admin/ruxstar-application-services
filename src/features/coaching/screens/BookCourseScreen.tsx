import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefundLine } from '@/components/booking';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { StepBar } from '@/components/ui/StepBar';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { CheckoutCoupons } from '@/features/coupons/components/CheckoutCoupons';
import { couponState } from '@/features/coupons/lib/coupons';
import { errorText, isOffline } from '@/features/events/lib/messages';
import { whenLine } from '@/features/events/lib/events';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { CoachingService } from '@/services/coaching-service';
import { useAuthStore } from '@/stores/auth-store';
import type { Child, CourseDetail, OrderKind } from '@/types/coaching';
import type { CouponCheck } from '@/types/coupon';
import { ChildForm } from '../components/ChildForm';
import { Card, Divider, PickCard, PriceLine } from '../components/Parts';
import { coachingReturn } from '../lib/checkout';
import { MAX_CHILDREN } from '../lib/children';
import { ME, childIdOf, classesLine, feeText, openBatches, orderPrice, seatsLine, studentOptions } from '../lib/coaching';

const STEPS = { batch: ['Batch', 'Student', 'Pay'], demo: ['Demo class', 'Student', 'Pay'] } as const;

function Booking({ course, kind, batchId, kids, onChildAdded }: { course: CourseDetail; kind: OrderKind; batchId?: string; kids: Child[]; onChildAdded: (child: Child) => void }) {
  const router = useRouter();
  const token = useAuthToken();
  const myName = useAuthStore((s) => s.name);
  const batches = openBatches(course);
  const demos = course.demoClasses.filter((d) => d.seatsLeft > 0);

  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string>(() => (kind === 'batch' ? (batches.find((b) => b.id === batchId) ?? batches[0])?.id : demos[0]?.sessionId) ?? '');
  const [student, setStudent] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const attempt = useRef(newIdempotencyKey());

  const batch = kind === 'batch' ? batches.find((b) => b.id === picked) : undefined;
  const demo = kind === 'demo' ? demos.find((d) => d.sessionId === picked) : undefined;
  const fee = kind === 'batch' ? (batch?.fee ?? 0) : (course.demo?.fee ?? 0);
  const takesCoupons = kind === 'batch' && fee > 0;
  const onPayStep = step === 2 && takesCoupons;
  const offersKey = onPayStep ? `${picked}|${code ?? ''}` : 'none';
  const offers = useAsyncResource<{ key: string; result: CouponCheck | null }>(
    () => (onPayStep ? CoachingService.offers(token, picked, code ?? undefined) : Promise.resolve(null)).then((result) => ({ key: offersKey, result })),
    offersKey,
  );
  const offersNow = offers.data?.key === offersKey ? offers.data.result : undefined;
  const coupon = couponState(offersNow, code, 'Institute');
  const checking = !!code && onPayStep && offers.data?.key !== offersKey && !offers.error;
  const couponProblem = coupon.problem ?? (code && offers.error && offers.data?.key !== offersKey ? errorText(offers.error) : null);
  const price = orderPrice(fee, course.platformFee, coupon.discount);
  const free = price.total === 0;

  const applyCode = (next: string) => (next === code ? offers.reload() : setCode(next));
  const options = studentOptions(myName, kids, course, kind === 'demo' ? { kind: 'demo' } : { kind: 'batch', batchId: picked });
  const chosen = options.find((o) => o.key === student && !o.taken);
  const studentName = chosen ? (chosen.key === ME ? (myName ?? 'You') : chosen.label) : '';

  const pickChild = (child: Child) => {
    onChildAdded(child);
    setStudent(child.id);
    setAdding(false);
  };

  const place = async () => {
    if (!chosen) return;
    setBusy(true);
    setFailure(null);
    const who = { childId: childIdOf(chosen.key) };
    try {
      const { order, checkoutUrl } =
        kind === 'batch'
          ? await CoachingService.enrol(
              token,
              picked,
              { student: who, ...(coupon.applied ? { coupon: coupon.applied.code } : {}), returnTo: coachingReturn() },
              { idempotencyKey: attempt.current },
            )
          : await CoachingService.bookDemo(token, course.id, { sessionId: picked, student: who, returnTo: coachingReturn() }, { idempotencyKey: attempt.current });
      Feedback.success();
      router.replace({ pathname: '/(customer)/coaching/enrolment/[id]', params: { id: order.id, ...(checkoutUrl ? { pay: '1' } : { fresh: '1' }) } });
    } catch (err) {
      Feedback.error();
      if (err instanceof ApiError && err.code === 'COUPON_INVALID') {
        setCode(null);
        setFailure(`${err.message} We took the coupon off, so the total is ${money(orderPrice(fee, course.platformFee).total)} now.`);
      } else {
        setFailure(errorText(err));
      }
      // A place that timed out may have been taken; trying again with the same key returns it instead of holding two seats.
      if (!isOffline(err)) attempt.current = newIdempotencyKey();
    } finally {
      setBusy(false);
    }
  };

  const footer =
    step === 0 ? (
      <PrimaryButton label="Continue" disabled={!picked} onPress={() => setStep(1)} />
    ) : step === 1 ? (
      <PrimaryButton label={chosen ? `Continue for ${studentName}` : 'Choose who it’s for'} disabled={!chosen} onPress={() => setStep(2)} />
    ) : (
      <PrimaryButton
        label={free ? (kind === 'demo' ? 'Book the free demo' : 'Enrol for free') : `Pay ${money(price.total)}`}
        loading={busy}
        disabled={checking}
        onPress={place}
      />
    );

  return (
    <ScreenContainer title={course.title} footer={footer}>
      <StepBar steps={STEPS[kind]} at={step} />
      {step > 0 ? <TextLink label="‹ Back a step" onPress={() => setStep(step - 1)} /> : null}

      {step === 0 && kind === 'batch' ? (
        <>
          <Text style={styles.lead}>Pick a batch. You pay the whole course fee now.</Text>
          {batches.length ? (
            batches.map((b) => (
              <PickCard
                key={b.id}
                title={b.name}
                lines={[b.schedule, classesLine(b), seatsLine(b)]}
                right={feeText(b.fee)}
                picked={picked === b.id}
                onPress={() => setPicked(b.id)}
              />
            ))
          ) : (
            <Text style={styles.small}>No batches are taking students right now.</Text>
          )}
        </>
      ) : null}

      {step === 0 && kind === 'demo' ? (
        <>
          <Text style={styles.lead}>{`Pick a class to try. ${course.demo?.free ? 'It’s free.' : `It costs ${money(course.demo?.fee ?? 0)}.`} One demo per student for this course.`}</Text>
          {demos.length ? (
            demos.map((d) => (
              <PickCard
                key={d.sessionId}
                title={whenLine(d.startsAt, d.endsAt)}
                lines={[d.batchName, d.seatsLeft === 1 ? '1 demo seat left' : `${d.seatsLeft} demo seats left`]}
                picked={picked === d.sessionId}
                onPress={() => setPicked(d.sessionId)}
              />
            ))
          ) : (
            <Text style={styles.small}>No demo classes have seats right now.</Text>
          )}
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Text style={styles.lead}>Who is this for? Add your child once and pick them every time.</Text>
          {options.map((o) => (
            <PickCard key={o.key} title={o.label} lines={[]} note={o.taken} disabled={!!o.taken} picked={student === o.key && !o.taken} onPress={() => setStudent(o.key)} />
          ))}
          {adding ? (
            <Card>
              <Text style={styles.strong}>Add a child</Text>
              <ChildForm onSaved={pickChild} label="Add and choose" />
              <TextLink muted label="Cancel" onPress={() => setAdding(false)} />
            </Card>
          ) : kids.length < MAX_CHILDREN ? (
            <PrimaryButton label="Add a child" variant="outline" onPress={() => setAdding(true)} />
          ) : null}
        </>
      ) : null}

      {step === 2 ? (
        <>
          {takesCoupons ? (
            <CheckoutCoupons
              offers={offersNow?.offers ?? null}
              applied={coupon.applied}
              discount={coupon.discount}
              problem={couponProblem}
              onApply={applyCode}
              onRemove={() => setCode(null)}
              owner="Institute"
            />
          ) : null}
          <Card>
            <Text style={styles.strong}>{course.title}</Text>
            {batch ? <Text style={styles.small}>{`${batch.name} · ${batch.schedule}`}</Text> : null}
            {batch ? <Text style={styles.small}>{classesLine(batch)}</Text> : null}
            {demo ? <Text style={styles.small}>{`Demo class · ${whenLine(demo.startsAt, demo.endsAt)}`}</Text> : null}
            <Text style={styles.small}>{`For ${studentName}`}</Text>
            <Divider />
            <PriceLine label={kind === 'demo' ? 'Demo class' : 'Course fee'} amount={price.items} />
            {price.discount && coupon.applied ? <PriceLine label={`Coupon ${coupon.applied.code}`} amount={price.discount} minus /> : null}
            {price.fee ? <PriceLine label="Platform fee" amount={price.fee} /> : null}
            <Divider />
            <PriceLine label="Total" amount={price.total} strong />
          </Card>
          <RefundLine text={course.refundRule} refundable />
          {free ? null : <Text style={styles.small}>You’ll pay on Cashfree’s secure page. The seat is held for 20 minutes while you pay.</Text>}
        </>
      ) : null}

      {failure ? <ErrorBanner message={failure} /> : null}
    </ScreenContainer>
  );
}

/** Enrolling in a batch, or booking a demo class: pick it, pick who it's for (you or a child), then pay the whole fee. */
export function BookCourseScreen() {
  const token = useAuthToken();
  const { id, kind, batchId } = useLocalSearchParams<{ id: string; kind?: string; batchId?: string }>();
  const course = useAsyncResource(() => CoachingService.get(token, id), id);
  const children = useAsyncResource(() => CoachingService.children(token).then((p) => p.items), 'children');
  const loading = course.loading || children.loading;
  const error = course.error ?? children.error;

  return course.data && children.data ? (
    <Booking
      course={course.data}
      kind={kind === 'demo' ? 'demo' : 'batch'}
      batchId={batchId}
      kids={children.data}
      onChildAdded={(child) => children.setData((now) => [...(now ?? []).filter((c) => c.id !== child.id), child])}
    />
  ) : (
    <ScreenContainer title={kind === 'demo' ? 'Book a demo' : 'Enrol'}>
      <AsyncBoundary
        loading={loading}
        error={error}
        hasData={false}
        onRetry={() => {
          course.reload();
          children.reload();
        }}
        skeletonRows={4}
      >
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  lead: { ...Typography.body, fontSize: 15, color: Brand.textMuted, marginBottom: Spacing.one },
  small: { ...Typography.caption, color: Brand.textMuted },
  strong: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
});
