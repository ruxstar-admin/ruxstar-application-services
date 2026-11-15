import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookingBar, DateStrip, RefundLine } from '@/components/booking';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Stepper } from '@/components/ui/Stepper';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Card, Divider, Notice, PickCard, PriceLine, Section } from '@/features/coaching/components/Parts';
import { CheckoutCoupons } from '@/features/coupons/components/CheckoutCoupons';
import { couponState } from '@/features/coupons/lib/coupons';
import { errorText } from '@/features/events/lib/messages';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { IdempotentAttempt } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { istDayKey } from '@/lib/booking/days';
import { Feedback } from '@/lib/haptics';
import { KycService } from '@/services/kyc-service';
import { StaysService } from '@/services/stays-service';
import type { KycCaseStatus } from '@/types/kyc';
import type { PropertyDetail, StayOffers, StayUnit, StaysRules } from '@/types/stays';
import { BedDots } from '../components/BedDots';
import { staysReturn } from '../lib/checkout';
import { canTakeWhole, clampUnits, freeBeds, maxUnits, spotFree, spotTotal, stayPickOf, stayPrice, unitsOf, type Spot } from '../lib/reserve';
import { depositLine, dayShort, perText, plural, pricesText } from '../lib/stays';

const UNIT_LABEL: Record<StayUnit, string> = { month: 'By the month', night: 'By the night' };

/** Reserving needs approved base KYC; this says what's left and sends them to verify, then checks again on the way back. */
function KycGate({ status, onVerify }: { status: KycCaseStatus; onVerify: () => void }) {
  const text =
    status === 'submitted'
      ? 'Your ID check is with Ruxstar. You can reserve as soon as it’s approved; it usually takes a few minutes.'
      : status === 'locked'
        ? 'Your ID check is locked after too many tries. Contact Ruxstar support to reopen it.'
        : status === 'rejected'
          ? 'Your ID check needs another look. Fix it, then come back to reserve.'
          : 'PG and hostel owners need tenants with a verified ID. Verify once with Aadhaar, PAN and a selfie, then come back here.';
  return (
    <Card>
      <Text style={styles.strong}>Verify your ID to reserve</Text>
      <Text style={styles.small}>{text}</Text>
      {status === 'submitted' || status === 'locked' ? null : <PrimaryButton label={status === 'rejected' ? 'Fix my ID check' : 'Verify my ID'} onPress={onVerify} />}
    </Card>
  );
}

function Reserve({ property, rules, firstRoom }: { property: PropertyDetail; rules: StaysRules; firstRoom?: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const rooms = property.rooms.filter((r) => r.status === 'live');
  const [roomId, setRoomId] = useState(() => (rooms.some((r) => r.id === firstRoom) ? firstRoom! : (rooms[0]?.id ?? '')));
  const [wantUnit, setWantUnit] = useState<StayUnit>('month');
  const [wantUnits, setWantUnits] = useState(1);
  const [day, setDay] = useState(() => istDayKey(Date.now()));
  const [spot, setSpot] = useState<Spot | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(new IdempotentAttempt());

  const kyc = useAsyncResource(() => KycService.getOverview(token), 'kyc');
  const reloadKyc = kyc.reload;
  useRefetchOnFocus(useCallback(() => reloadKyc(), [reloadKyc]));
  const kycStatus = kyc.data?.base.status;
  const verified = kycStatus === 'approved';

  const room = rooms.find((r) => r.id === roomId);
  const units = room ? unitsOf(room.prices) : [];
  const unit = units.includes(wantUnit) ? wantUnit : (units[0] ?? 'month');
  const n = clampUnits(wantUnits, unit, rules);
  const most = maxUnits(unit, rules);

  const stayKey = `${day}|${unit}|${n}`;
  const avail = useAsyncResource(() => StaysService.availability(token, property.id, stayPickOf(day, unit, n)).then((data) => ({ key: stayKey, data })), stayKey);
  const fresh = avail.data?.key === stayKey ? avail.data.data : undefined;
  const roomAvail = fresh?.rooms.find((r) => r.id === roomId);
  const privateRoom = room?.kind === 'private';
  const chosen: Spot | null = privateRoom ? { kind: 'whole' } : spot;
  const picked = spotFree(roomAvail, chosen) ? chosen : null;
  const items = roomAvail ? spotTotal(roomAvail, picked) : null;

  const canPrice = !!room && !!picked && items !== null && !!fresh?.reservable;
  const pick = stayPickOf(day, unit, n, picked);
  const offersKey = canPrice ? `${roomId}|${JSON.stringify(pick)}|${code ?? ''}` : 'none';
  const offers = useAsyncResource<{ key: string; result: StayOffers | null }>(
    () =>
      canPrice
        ? StaysService.offers(token, roomId, { ...pick, ...(code ? { code } : {}) }).then((result) => ({ key: offersKey, result }))
        : Promise.resolve({ key: offersKey, result: null }),
    offersKey,
  );
  const offersNow = offers.data?.key === offersKey ? offers.data.result : undefined;
  const coupon = couponState(offersNow, code, 'Property');
  const checkingCoupon = !!code && canPrice && offers.data?.key !== offersKey && !offers.error;
  const couponProblem = coupon.problem ?? (code && offers.error && offers.data?.key !== offersKey ? errorText(offers.error) : null);
  const price = stayPrice(items ?? 0, property.platformFee, coupon.discount);

  const reset = () => {
    setSpot(null);
    setFailure(null);
  };
  const applyCode = (next: string) => (next === code ? offers.reload() : setCode(next));
  const verify = () => router.push('/(customer)/settings/verification');

  const place = async () => {
    if (!room || !canPrice || !picked) return;
    setBusy(true);
    setFailure(null);
    const body = { ...pick, ...(coupon.applied ? { coupon: coupon.applied.code } : {}), returnTo: staysReturn() };
    try {
      const { reservation, checkoutUrl } = await StaysService.reserve(token, room.id, body, { idempotencyKey: attempt.current.keyFor([room.id, body]) });
      attempt.current.settle();
      Feedback.success();
      router.replace({ pathname: '/(customer)/stays/order/[id]', params: { id: reservation.id, ...(checkoutUrl ? { pay: '1' } : { fresh: '1' }) } });
    } catch (err) {
      Feedback.error();
      if (err instanceof ApiError && err.code === 'COUPON_INVALID') {
        setCode(null);
        setFailure(`${err.message} We took the coupon off, so the total is ${money(stayPrice(items ?? 0, property.platformFee).total)} now.`);
      } else if (err instanceof ApiError && err.code === 'KYC_REQUIRED') {
        kyc.reload();
        setFailure('Verify your ID first, then reserve.');
      } else {
        setFailure(errorText(err));
        if (err instanceof ApiError && err.status === 409) avail.reload();
      }
      // A reservation that timed out may have gone through; trying again with the same key returns it instead of holding the bed twice.
      attempt.current.settle(err);
    } finally {
      setBusy(false);
    }
  };

  if (!room) {
    return (
      <ScreenContainer title={property.name}>
        <Notice tone="warning" text="No room is taking reservations right now. Check back soon." />
      </ScreenContainer>
    );
  }

  const what = picked ? (picked.kind === 'whole' ? (privateRoom ? room.name : `${room.name}, whole room`) : `${room.name}, bed ${roomAvail?.beds.find((b) => b.id === picked.bedId)?.label ?? ''}`) : '';
  const summary = picked && canPrice ? `${what} · ${dayShort(day)} · ${plural(n, unit)}` : '';
  const footer = (
    <BookingBar
      summary={summary}
      total={price.total}
      onPay={place}
      payLabel={price.total ? 'Pay' : 'Reserve'}
      placeholder={privateRoom ? 'Pick a move-in date' : 'Pick a bed to reserve'}
      loading={busy}
      disabled={!verified || !canPrice || checkingCoupon}
    />
  );
  const free = roomAvail ? freeBeds(roomAvail) : [];

  return (
    <ScreenContainer title={property.name} footer={footer}>
      {kycStatus && !verified ? <KycGate status={kycStatus} onVerify={verify} /> : null}
      {kyc.error && !kyc.data ? <ErrorBanner message="Could not check your ID verification." onRetry={kyc.reload} /> : null}

      {rooms.length > 1 ? (
        <>
          <Section title="Room" />
          <View style={styles.bleed}>
            <ChoiceChips
              options={rooms.map((r) => ({ key: r.id, label: r.name }))}
              value={roomId}
              onChange={(next) => {
                setRoomId(next);
                reset();
              }}
            />
          </View>
        </>
      ) : null}
      <Text style={styles.small}>{`${room.name} · ${pricesText(room.prices)} ${perText(room.kind)}`}</Text>

      {units.length > 1 ? (
        <>
          <Section title="Stay" />
          <View style={styles.bleed}>
            <ChoiceChips
              options={units.map((u) => ({ key: u, label: UNIT_LABEL[u] }))}
              value={unit}
              onChange={(u) => {
                setWantUnit(u);
                setWantUnits(1);
                reset();
              }}
            />
          </View>
        </>
      ) : null}

      <Section title="Move-in day" />
      <View style={styles.bleed}>
        <DateStrip
          value={day}
          onChange={(d) => {
            setDay(d);
            reset();
          }}
          count={rules.bookAheadDays + 1}
        />
      </View>

      {unit === 'night' ? (
        <View style={styles.units}>
          <View style={styles.flex}>
            <Text style={styles.strong}>Nights</Text>
            <Text style={styles.small}>{`Check out ${dayShort(fresh?.until ?? day)}${most > 1 ? ` · up to ${plural(most, 'night')}` : ''}`}</Text>
          </View>
          <Stepper
            label="Nights"
            value={n}
            min={1}
            max={most}
            onChange={(v) => {
              setWantUnits(v);
              reset();
            }}
          />
        </View>
      ) : most > 1 ? (
        <View style={styles.units}>
          <View style={styles.flex}>
            <Text style={styles.strong}>Months to pay now</Text>
            <Text style={styles.small}>The bed stays yours after them until you give notice.</Text>
          </View>
          <Stepper
            label="Months"
            value={n}
            min={1}
            max={most}
            onChange={(v) => {
              setWantUnits(v);
              reset();
            }}
          />
        </View>
      ) : (
        <Text style={styles.small}>You pay the first month now to reserve. Later months are paid to the owner, and the bed stays yours until you give notice.</Text>
      )}

      <Section title={privateRoom ? 'Room' : 'Bed'} />
      {!fresh && !avail.error ? (
        <Skeleton height={64} radius={12} />
      ) : avail.error && !fresh ? (
        <ErrorBanner message={errorText(avail.error)} onRetry={avail.reload} />
      ) : fresh && !fresh.reservable ? (
        <Notice tone="warning" text={`This move-in day can’t be reserved. Pick a day within the next ${plural(rules.bookAheadDays, 'day')}.`} />
      ) : roomAvail ? (
        privateRoom ? (
          <Notice
            tone={roomAvail.roomTotal !== null ? 'success' : 'warning'}
            text={roomAvail.roomTotal !== null ? `${room.name} is free from ${dayShort(day)}.` : `${room.name} is taken for these dates. Try another day or room.`}
          />
        ) : (
          <>
            <BedDots beds={roomAvail.beds} picked={picked?.kind === 'bed' ? picked.bedId : null} onPick={(bedId) => setSpot({ kind: 'bed', bedId })} />
            <Text style={styles.small}>{free.length ? `${plural(free.length, 'bed')} free from ${dayShort(day)}. Tap one to pick it.` : 'Every bed is taken for these dates. Try another day or room.'}</Text>
            {canTakeWhole(room) ? (
              <PickCard
                title="The whole room"
                lines={[`All ${room.beds} beds, just for you`]}
                right={roomAvail.roomTotal !== null ? money(roomAvail.roomTotal) : undefined}
                picked={picked?.kind === 'whole'}
                disabled={roomAvail.roomTotal === null}
                note={roomAvail.roomTotal === null ? 'Some beds are taken for these dates.' : null}
                onPress={() => setSpot({ kind: 'whole' })}
              />
            ) : null}
          </>
        )
      ) : null}

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
            owner="Property"
          />
          <Card>
            <PriceLine label={unit === 'month' ? (n > 1 ? `Rent for ${plural(n, 'month')}` : 'First month’s rent') : `${plural(n, 'night')}`} amount={price.items} />
            {price.discount && coupon.applied ? <PriceLine label={`Coupon ${coupon.applied.code}`} amount={price.discount} minus /> : null}
            {price.fee ? <PriceLine label="Platform fee" amount={price.fee} /> : null}
            <Divider />
            <PriceLine label="Total" amount={price.total} strong />
          </Card>
          <Notice text={depositLine(property.depositDetail)} />
          <RefundLine text={property.refundRule} refundable />
          {price.total ? <Text style={styles.small}>{`You’ll pay on Cashfree’s secure page. The bed is held for ${rules.holdMinutes} minutes while you pay.`}</Text> : null}
        </>
      ) : null}

      {failure ? <ErrorBanner message={failure} /> : null}
    </ScreenContainer>
  );
}

/** Reserving a bed or room: room, month or night, move-in day, the bed, an ID check, a coupon, then Cashfree. */
export function ReserveScreen() {
  const token = useAuthToken();
  const { id, room } = useLocalSearchParams<{ id: string; room?: string }>();
  const property = useAsyncResource(() => StaysService.get(token, id), id);
  const rules = useAsyncResource(() => StaysService.rules(token), 'stays-rules');

  return property.data && rules.data ? (
    <Reserve property={property.data} rules={rules.data} firstRoom={room} />
  ) : (
    <ScreenContainer title="Reserve">
      <AsyncBoundary
        loading={property.loading || rules.loading}
        error={property.error ?? rules.error}
        hasData={false}
        onRetry={() => {
          property.reload();
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
  flex: { flex: 1, gap: 2 },
  units: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  strong: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
});
