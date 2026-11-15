import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookingBar, DateStrip, Legend, RefundLine, SlotGrid } from '@/components/booking';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Card, Divider, Notice, PriceLine, Section } from '@/features/coaching/components/Parts';
import { CheckoutCoupons } from '@/features/coupons/components/CheckoutCoupons';
import { couponState } from '@/features/coupons/lib/coupons';
import { errorText, isOffline } from '@/features/events/lib/messages';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { dayLong, istDayKey } from '@/lib/booking/days';
import { keepSelection, rangeText, selectionSummary } from '@/lib/booking/slots';
import { Feedback } from '@/lib/haptics';
import { TurfService } from '@/services/turf-service';
import type { GroundDetail, TurfOffers, TurfRules } from '@/types/turf';
import { AddOnPicker } from '../components/AddOnPicker';
import { RepeatWeekly } from '../components/RepeatWeekly';
import { turfReturn } from '../lib/checkout';
import { pickedAddOns, turfPrice, type AddOnCounts } from '../lib/price';
import { repeatDays, weekLines } from '../lib/repeat';
import { closedWeekdays, noSlotsText, refundTiers, slotLengthText, slotsOf } from '../lib/turf';

const FIRST_REPEAT_WEEKS = 4;
const LEGEND = ['free', 'peak', 'selected', 'booked', 'blocked'] as const;

function Booking({ ground, rules, firstCourt }: { ground: GroundDetail; rules: TurfRules; firstCourt?: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const courts = ground.courtList.filter((c) => c.status === 'live');
  const [courtId, setCourtId] = useState(() => (courts.some((c) => c.id === firstCourt) ? firstCourt! : (courts[0]?.id ?? '')));
  const [day, setDay] = useState(() => istDayKey(Date.now()));
  const [picked, setPicked] = useState<string[]>([]);
  const [counts, setCounts] = useState<AddOnCounts>({});
  const [sport, setSport] = useState('any');
  const [repeat, setRepeat] = useState(false);
  const [weeks, setWeeks] = useState(Math.min(FIRST_REPEAT_WEEKS, rules.maxRepeatWeeks));
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(newIdempotencyKey());

  const court = courts.find((c) => c.id === courtId);
  const n = repeat && rules.maxRepeatWeeks > 1 ? weeks : 1;

  const daySlots = useAsyncResource(() => TurfService.slots(token, courtId, day), `${courtId}|${day}`);
  const today = daySlots.data && daySlots.data.date === day && daySlots.data.court.id === courtId ? daySlots.data : undefined;
  const slots = slotsOf(today);
  const selected = keepSelection(slots, picked);
  const pickedSlots = slots.filter((s) => selected.includes(s.key));
  const starts = pickedSlots.map((s) => s.start);
  const summary = selectionSummary(slots, selected);
  const times = pickedSlots.length ? rangeText(pickedSlots[0]!.start, pickedSlots[pickedSlots.length - 1]!.end) : '';

  const laterDays = n > 1 ? repeatDays(day, n).slice(1) : [];
  const laterKey = `${courtId}|${laterDays.join(',')}`;
  const later = useAsyncResource(
    () => Promise.all(laterDays.map((d) => TurfService.slots(token, courtId, d))).then((list) => ({ key: laterKey, list })),
    laterKey,
  );
  const laterByDay = later.data?.key === laterKey ? Object.fromEntries(later.data.list.map((d) => [d.date, d])) : {};
  const lines = weekLines(day, n, starts, laterByDay);
  const clashes = selected.length ? lines.filter((l) => l.problem) : [];
  const checkingWeeks = selected.length > 0 && lines.some((l) => l.checking) && !later.error;

  const addOns = pickedAddOns(counts);
  const tooMany = selected.length > rules.maxSlots;
  const canPrice = selected.length > 0 && !tooMany && !clashes.length;
  const offersKey = canPrice ? `${courtId}|${selected.join(',')}|${JSON.stringify(addOns)}|${n}|${code ?? ''}` : 'none';
  const offers = useAsyncResource<{ key: string; result: TurfOffers | null }>(
    () =>
      canPrice
        ? TurfService.offers(token, courtId, { startAts: selected, addOns, weeks: n, ...(code ? { code } : {}) }).then((result) => ({ key: offersKey, result }))
        : Promise.resolve({ key: offersKey, result: null }),
    offersKey,
  );
  const offersNow = offers.data?.key === offersKey ? offers.data.result : undefined;
  const coupon = couponState(offersNow, code);
  const checkingCoupon = !!code && canPrice && offers.data?.key !== offersKey && !offers.error;
  const couponProblem = coupon.problem ?? (code && offers.error && offers.data?.key !== offersKey ? errorText(offers.error) : null);
  const price = turfPrice({ slotPrices: pickedSlots.map((s) => s.price), addOns: court?.addOns ?? [], counts, weeks: n, platformFee: ground.platformFee, discount: coupon.discount });

  const pickCourt = (next: string) => {
    setCourtId(next);
    setPicked([]);
    setCounts({});
    setSport('any');
    setFailure(null);
  };
  const pickDay = (next: string) => {
    setDay(next);
    setPicked([]);
    setFailure(null);
  };
  const applyCode = (next: string) => (next === code ? offers.reload() : setCode(next));

  const place = async () => {
    if (!court || !canPrice) return;
    setBusy(true);
    setFailure(null);
    try {
      const { booking, checkoutUrl } = await TurfService.book(
        token,
        court.id,
        {
          startAts: selected,
          ...(sport !== 'any' ? { sport } : {}),
          ...(addOns.length ? { addOns } : {}),
          ...(n > 1 ? { weeks: n } : {}),
          ...(coupon.applied ? { coupon: coupon.applied.code } : {}),
          returnTo: turfReturn(),
        },
        { idempotencyKey: attempt.current },
      );
      Feedback.success();
      router.replace({ pathname: '/(customer)/turf/booking/[id]', params: { id: booking.id, ...(checkoutUrl ? { pay: '1' } : { fresh: '1' }) } });
    } catch (err) {
      Feedback.error();
      if (err instanceof ApiError && err.code === 'COUPON_INVALID') {
        setCode(null);
        const full = turfPrice({ slotPrices: pickedSlots.map((s) => s.price), addOns: court.addOns, counts, weeks: n, platformFee: ground.platformFee });
        setFailure(`${err.message} We took the coupon off, so the total is ${money(full.total)} now.`);
      } else {
        setFailure(errorText(err));
        if (err instanceof ApiError && err.status === 409) {
          daySlots.reload();
          later.reload();
        }
      }
      // A booking that timed out may have gone through; trying again with the same key returns it instead of holding the slots twice.
      if (!isOffline(err)) attempt.current = newIdempotencyKey();
    } finally {
      setBusy(false);
    }
  };

  const weekday = dayLong(day).split(' ')[0]!;
  const barText = summary.text ? `${summary.text}${n > 1 ? ` · ${n} weeks` : ''}` : '';
  const footer = (
    <BookingBar
      summary={barText}
      total={price.total}
      onPay={place}
      payLabel={price.total ? 'Pay' : 'Book'}
      loading={busy}
      disabled={!canPrice || checkingWeeks || checkingCoupon}
    />
  );

  if (!court) {
    return (
      <ScreenContainer title={ground.name}>
        <Notice tone="warning" text="No court is taking bookings right now. Check back soon." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title={ground.name} footer={footer}>
      {courts.length > 1 ? (
        <>
          <Section title="Court" />
          <View style={styles.bleed}>
            <ChoiceChips options={courts.map((c) => ({ key: c.id, label: c.name }))} value={courtId} onChange={pickCourt} />
          </View>
        </>
      ) : null}
      <Text style={styles.small}>{`${court.name} · ${slotLengthText(court.slotMinutes)} slots`}</Text>

      <Section title="Day" />
      <View style={styles.bleed}>
        <DateStrip value={day} onChange={pickDay} count={Math.min(rules.bookAheadDays, 30) + 1} closedWeekdays={closedWeekdays(court.hours)} />
      </View>

      <Section title="Time" />
      {!today && !daySlots.error ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={76} radius={12} />
          ))}
        </View>
      ) : daySlots.error && !today ? (
        <ErrorBanner message={errorText(daySlots.error)} onRetry={daySlots.reload} />
      ) : (
        <>
          <SlotGrid slots={slots} selected={selected} onChange={setPicked} emptyText={noSlotsText(today)} />
          {slots.length ? <Legend items={LEGEND} /> : null}
        </>
      )}
      {tooMany ? <Notice tone="warning" text={`Book up to ${rules.maxSlots} slots at a time.`} /> : null}
      {selected.length ? <Text style={styles.small}>Tap slots next to each other for a longer game. Tap an end to make it shorter.</Text> : null}

      {court.sports.length > 1 ? (
        <>
          <Section title="Sport (optional)" />
          <View style={styles.bleed}>
            <ChoiceChips options={[{ key: 'any', label: 'Not saying' }, ...court.sports.map((s) => ({ key: s.key, label: s.name }))]} value={sport} onChange={setSport} secondary />
          </View>
        </>
      ) : null}

      {court.addOns.length ? (
        <>
          <Section title="Add-ons" />
          <AddOnPicker addOns={court.addOns} counts={counts} onChange={setCounts} />
        </>
      ) : null}

      {rules.maxRepeatWeeks > 1 ? (
        <RepeatWeekly on={repeat} onToggle={setRepeat} weeks={weeks} maxWeeks={rules.maxRepeatWeeks} onWeeks={setWeeks} lines={lines} weekday={weekday} times={times} />
      ) : null}
      {clashes.length ? (
        <Notice
          tone="warning"
          text={`${clashes.length === 1 ? 'One week' : `${clashes.length} weeks`} can’t be booked at ${times}. Pick another time, or fewer weeks.`}
        />
      ) : null}
      {later.error && n > 1 && selected.length ? <ErrorBanner message="Could not check the other weeks." onRetry={later.reload} /> : null}

      {canPrice ? (
        <>
          <Section title="Pay" />
          <CheckoutCoupons
            offers={offersNow?.offers ?? null}
            applied={coupon.applied}
            discount={coupon.discount}
            problem={couponProblem}
            onApply={applyCode}
            onRemove={() => setCode(null)}
          />
          <Card>
            <PriceLine label={`Slots${n > 1 ? ` × ${n} weeks` : ''}`} amount={price.slots * n} />
            {price.extras ? <PriceLine label={`Add-ons${n > 1 ? ` × ${n} weeks` : ''}`} amount={price.extras * n} /> : null}
            {price.discount && coupon.applied ? <PriceLine label={`Coupon ${coupon.applied.code}`} amount={price.discount} minus /> : null}
            {price.fee ? <PriceLine label="Platform fee" amount={price.fee} /> : null}
            <Divider />
            <PriceLine label="Total" amount={price.total} strong />
          </Card>
          <RefundLine tiers={refundTiers(ground.refunds)} what="the slot starts" />
          {n > 1 ? <Text style={styles.small}>You can cancel single weeks later; each gets its own refund.</Text> : null}
          {price.total ? <Text style={styles.small}>{`You’ll pay on Cashfree’s secure page. The slots are held for ${rules.holdMinutes} minutes while you pay.`}</Text> : null}
        </>
      ) : null}

      {failure ? <ErrorBanner message={failure} /> : null}
    </ScreenContainer>
  );
}

/** Booking slots at a ground: court, day, back-to-back slots, add-ons, repeat weekly, a coupon, then Cashfree. */
export function BookGroundScreen() {
  const token = useAuthToken();
  const { id, court } = useLocalSearchParams<{ id: string; court?: string }>();
  const ground = useAsyncResource(() => TurfService.get(token, id), id);
  const rules = useAsyncResource(() => TurfService.rules(token), 'turf-rules');

  return ground.data && rules.data ? (
    <Booking ground={ground.data} rules={rules.data} firstCourt={court} />
  ) : (
    <ScreenContainer title="Book a slot">
      <AsyncBoundary
        loading={ground.loading || rules.loading}
        error={ground.error ?? rules.error}
        hasData={false}
        onRetry={() => {
          ground.reload();
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
  bleed: { marginHorizontal: -Spacing.three },
  small: { ...Typography.caption, color: Brand.textMuted },
  skeletons: { gap: Spacing.two },
});
