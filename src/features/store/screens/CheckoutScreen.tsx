import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { BookingBar } from '@/components/booking';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Typography } from '@/constants/theme';
import { Card, Divider, Notice, PickCard, PriceLine, Section } from '@/features/coaching/components/Parts';
import { CheckoutCoupons } from '@/features/coupons/components/CheckoutCoupons';
import { couponState } from '@/features/coupons/lib/coupons';
import { errorText, isOffline } from '@/features/events/lib/messages';
import { AddressFields, addressErrors, cleanAddress, usePrefilledAddress } from '@/features/pod/components/AddressFields';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { StoreService } from '@/services/store-service';
import type { OrderAddress } from '@/types/order';
import type { QuoteBody, StoreDetail, StoreMethod, StoreQuote } from '@/types/store';
import { CartLines } from '../components/CartLines';
import { cartCount, linesOf, withQuote, type Cart } from '../lib/cart';
import { storeReturn } from '../lib/checkout';
import { areaText, deliveryFeeText } from '../lib/store';
import { useCart } from '../stores/cart-store';

/** Waits this long after the last change before pricing the cart again. */
const QUOTE_DELAY_MS = 350;

/** The last shop order's delivery address, to start the form from. */
const lastStoreAddress = (token: string): Promise<OrderAddress | null> =>
  StoreService.orders(token, 'all').then((page) => page.items.find((o) => o.address)?.address ?? null);

/** Enough of the address for the map to find it, so the fee and the distance can be worked out. */
const findable = (a: OrderAddress) => !!a.point || (/^[1-9]\d{5}$/.test(a.pincode) && a.line.trim().length >= 5);

function Checkout({ cart, store }: { cart: Cart; store: StoreDetail }) {
  const router = useRouter();
  const token = useAuthToken();
  const { setCart } = useCart();
  const { setup } = store;
  const [method, setMethod] = useState<StoreMethod>(setup.delivery ? 'delivery' : 'pickup');
  const [address, setAddress] = usePrefilledAddress(token, store.city, lastStoreAddress);
  const [note, setNote] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef<{ sig: string; key: string } | null>(null);
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  });

  const delivery = method === 'delivery';
  const lines = linesOf(cart);
  const drop = delivery && findable(address) ? { line: address.line.trim(), city: address.city.trim(), pincode: address.pincode, point: address.point ?? null } : undefined;
  const body: QuoteBody = { lines, method, ...(drop ? { address: drop } : {}), ...(code ? { code } : {}) };
  const inputKey = JSON.stringify(body);
  const [quoteKey, setQuoteKey] = useState(inputKey);
  useEffect(() => {
    const t = setTimeout(() => setQuoteKey(inputKey), QUOTE_DELAY_MS);
    return () => clearTimeout(t);
  }, [inputKey]);

  const priced = useAsyncResource<{ key: string; quote: StoreQuote }>(
    () =>
      StoreService.quote(token, store.id, JSON.parse(quoteKey) as QuoteBody).then((quote) => {
        setCart(withQuote(cartRef.current, quote));
        return { key: quoteKey, quote };
      }),
    quoteKey,
  );
  const current = priced.data?.key === inputKey && !priced.loading ? priced.data.quote : null;
  const last = priced.data?.quote ?? null;
  const quoteError = !priced.loading && quoteKey === inputKey && priced.error ? errorText(priced.error) : null;
  const coupon = couponState(current, code, 'Shop');
  const stock = new Map(last?.lines.map((l) => [l.variantId, l.stock]) ?? []);

  const fieldErrors = delivery ? addressErrors(address) : {};
  const filled = Object.keys(fieldErrors).length === 0;
  const cityOk = !delivery || !address.city.trim() || address.city.trim().toLowerCase() === store.city.trim().toLowerCase();

  const place = async () => {
    if (!filled || !cityOk) {
      setChecked(true);
      Feedback.error();
      return;
    }
    if (!current) return;
    setBusy(true);
    setFailure(null);
    const order = {
      lines,
      method,
      ...(delivery ? { address: cleanAddress(address) } : {}),
      ...(coupon.applied ? { coupon: coupon.applied.code } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      returnTo: storeReturn(),
    };
    const sig = JSON.stringify(order);
    if (attempt.current?.sig !== sig) attempt.current = { sig, key: newIdempotencyKey() };
    try {
      const placed = await StoreService.place(token, store.id, order, { idempotencyKey: attempt.current.key });
      Feedback.success();
      setCart(null);
      router.replace({ pathname: '/(customer)/store/order/[id]', params: { id: placed.order.id, pay: '1' } });
    } catch (err) {
      Feedback.error();
      if (err instanceof ApiError && err.code === 'COUPON_INVALID') {
        setCode(null);
        setFailure(`${err.message} We took the coupon off. Check the new total and pay again.`);
      } else {
        setFailure(errorText(err));
        if (err instanceof ApiError && err.status === 409) priced.reload();
      }
      // An order that timed out may have gone through; the same key returns it instead of placing it twice.
      if (!isOffline(err)) attempt.current = null;
    } finally {
      setBusy(false);
    }
  };

  const n = cartCount(cart);
  const footer = (
    <BookingBar
      summary={current ? `${n} item${n === 1 ? '' : 's'} · ${delivery ? 'Delivery' : 'Pickup'}` : ''}
      total={current?.total ?? 0}
      onPay={place}
      placeholder={quoteError ? 'Fix the cart to pay' : 'Working out the price…'}
      loading={busy}
      disabled={!store.canOrder || !current}
    />
  );

  return (
    <ScreenContainer title="Checkout" footer={footer}>
      <Text style={styles.muted}>{store.name}</Text>
      {!store.canOrder ? <Notice tone="warning" text={store.whyNot ?? 'This shop isn’t taking orders right now.'} /> : null}
      <CartLines lines={cart.lines} stock={stock} />
      <TextLink label="Change the cart" onPress={() => router.back()} />

      <Section title="How you get it" />
      {setup.delivery ? (
        <PickCard
          title="Delivery"
          lines={[`${deliveryFeeText(setup.deliveryFee)} · ${areaText(setup, store.city)}`, 'The shop’s team or a Ruxstar partner brings it.']}
          picked={delivery}
          onPress={() => setMethod('delivery')}
        />
      ) : null}
      {setup.pickup ? <PickCard title="Pick up from the shop" lines={[`Free · ${store.address}`]} picked={!delivery} onPress={() => setMethod('pickup')} /> : null}

      {delivery ? (
        <>
          <Section title="Deliver to" />
          <AddressFields
            address={address}
            onChange={setAddress}
            errors={checked ? fieldErrors : {}}
            cityError={cityOk ? undefined : `${store.name} delivers in ${store.city} only.`}
          />
        </>
      ) : (
        <Text style={styles.small}>The shop tells you when it’s ready. Show your order number when you collect it.</Text>
      )}

      <InputField label="Note for the shop" value={note} onChangeText={setNote} maxLength={500} multiline placeholder="Optional: gift wrap, landmark, best time" />

      <Section title="Pay" />
      <CheckoutCoupons
        offers={last?.offers ?? null}
        applied={coupon.applied}
        discount={coupon.discount}
        problem={coupon.problem}
        onApply={(next) => (next === code ? priced.reload() : setCode(next))}
        onRemove={() => setCode(null)}
        owner="Shop"
      />
      {current ? (
        <Card>
          <PriceLine label={`Items (${n} item${n === 1 ? '' : 's'})`} amount={current.items} />
          {delivery ? <PriceLine label={current.deliveryKm !== null ? `Delivery (${current.deliveryKm} km)` : 'Delivery'} amount={current.delivery} /> : null}
          {current.platformFee ? <PriceLine label="Platform fee" amount={current.platformFee} /> : null}
          {current.discount && coupon.applied ? <PriceLine label={`Coupon ${coupon.applied.code}`} amount={current.discount} minus /> : null}
          <Divider />
          <PriceLine label="Total" amount={current.total} strong />
        </Card>
      ) : quoteError ? (
        <ErrorBanner message={quoteError} onRetry={priced.reload} />
      ) : (
        <Skeleton height={120} radius={16} />
      )}
      {delivery && !drop ? <Text style={styles.small}>The delivery fee depends on the distance. Add the address or use your location to see it.</Text> : null}
      <Notice text={(current ?? last)?.returnRule ?? store.returnRule} />
      {current ? <Text style={styles.small}>{`You’ll pay ${money(current.total)} on Cashfree’s secure page. Stock is taken when you pay.`}</Text> : null}

      {checked && (!filled || !cityOk) ? <ErrorBanner message="Fill in the fields marked in red to pay." /> : null}
      {failure ? <ErrorBanner message={failure} /> : null}
    </ScreenContainer>
  );
}

/** Checkout for the cart: delivery or pickup, the address, an offer and the return rule, then Cashfree. */
export function CheckoutScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { cart } = useCart();
  const storeId = cart?.store.id ?? '';
  const store = useAsyncResource(() => (storeId ? StoreService.get(token, storeId) : Promise.resolve(null)), storeId);

  if (!cart || !cart.lines.length) {
    return (
      <ScreenContainer title="Checkout">
        <EmptyState icon="bag-handle-outline" title="Your cart is empty" message="Add something from a shop first." actionLabel="Back" onAction={() => router.back()} />
      </ScreenContainer>
    );
  }
  return store.data && store.data.id === cart.store.id ? (
    <Checkout cart={cart} store={store.data} />
  ) : (
    <ScreenContainer title="Checkout">
      <AsyncBoundary loading={store.loading} error={store.error} hasData={false} onRetry={store.reload} skeletonRows={4}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  muted: { ...Typography.body, color: Brand.textMuted },
  small: { ...Typography.caption, color: Brand.textMuted },
});
