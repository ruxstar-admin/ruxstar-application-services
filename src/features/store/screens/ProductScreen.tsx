import { useCallback, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Stepper } from '@/components/ui/Stepper';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Fact, Facts, Notice, Section } from '@/features/coaching/components/Parts';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { ListingReviews } from '@/features/reviews/components/ListingReviews';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { StoreService } from '@/services/store-service';
import type { ProductDetail } from '@/types/store';
import { PriceTag } from '../components/PriceTag';
import { VariantPicker } from '../components/VariantPicker';
import { useStoreRules } from '../hooks/use-store-rules';
import { addToCart, cartCount, lineMax, type CartLine } from '../lib/cart';
import { methodsText } from '../lib/store';
import { firstPick, namedValues, stockLine, variantFor } from '../lib/variants';
import { useCart } from '../stores/cart-store';

function ProductView({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const rules = useStoreRules();
  const { cart, setCart } = useCart();
  const [picked, setPicked] = useState(() => firstPick(product));
  const [quantity, setQuantity] = useState(1);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState<{ tone: 'success' | 'warning'; text: string } | null>(null);

  const store = { id: product.business.id, name: product.business.name };
  const variant = variantFor(product, picked);
  const stock = variant?.stock ?? 0;
  const inCart = cart?.lines.find((l) => l.variantId === variant?.id)?.quantity ?? 0;
  const max = Math.max(0, lineMax({ stock }, rules) - inCart);
  const live = product.status === 'live';
  const canAdd = live && product.canOrder && !!variant && max > 0;
  const shown = Math.min(quantity, Math.max(1, max));
  const fromHere = cart?.store.id === store.id ? cartCount(cart) : 0;

  const add = (replace: boolean) => {
    if (!variant) return;
    const line: CartLine = {
      productId: product.id,
      variantId: variant.id,
      title: product.title,
      options: namedValues(product.options, variant.values),
      photoUrl: product.photo?.url ?? null,
      price: variant.price,
      mrp: variant.mrp,
      stock: variant.stock,
      quantity: shown,
    };
    const result = addToCart(cart, store, line, rules, replace);
    if ('problem' in result) {
      if (result.problem === 'other_store') {
        setAsking(true);
        return;
      }
      Feedback.error();
      setNote({ tone: 'warning', text: `An order can have up to ${result.max} different items. Check out this cart first.` });
      return;
    }
    Feedback.success();
    setCart(result.cart);
    setAsking(false);
    setQuantity(1);
    setNote(result.capped ? { tone: 'warning', text: 'Added as many as the shop has. Your cart has all that are left.' } : { tone: 'success', text: 'Added to your cart.' });
  };

  const buttonLabel = !live
    ? 'Not for sale'
    : !product.canOrder
      ? (product.whyNot ?? 'Not taking orders')
      : !variant
        ? 'Pick an option'
        : stock <= 0
          ? 'Sold out'
          : max <= 0
            ? 'All of these are in your cart'
            : 'Add to cart';

  const footer = (
    <>
      <PrimaryButton label={buttonLabel} onPress={() => add(false)} disabled={!canAdd} />
      {fromHere ? <PrimaryButton label={`View cart (${fromHere})`} variant="outline" onPress={() => router.push('/(customer)/store/cart')} /> : null}
    </>
  );

  return (
    <ScreenContainer title="Product" footer={footer}>
      <ShopCover photo={product.photo ? { ...product.photo, smaller: [] } : null} name={product.title} width={width - Spacing.three * 2} style={styles.photo} dimmed={!canAdd} />
      <View style={styles.head}>
        <Text style={styles.title}>{product.title}</Text>
        <TextLink label={`From ${product.business.name}`} onPress={() => router.push({ pathname: '/(customer)/store/[id]', params: { id: store.id } })} />
      </View>
      {product.status === 'removed' ? <Notice tone="error" text="Ruxstar took this product down. It isn’t for sale." /> : null}
      {product.status === 'hidden' ? <Notice tone="warning" text="The shop took this off sale for now." /> : null}
      {live && !product.canOrder && product.whyNot ? <Notice tone="warning" text={product.whyNot} /> : null}

      {variant ? <PriceTag price={variant.price} mrp={variant.mrp} big /> : <PriceTag price={product.priceFrom} mrp={product.mrpFrom} from big />}
      {variant && stockLine(stock) ? <Text style={[styles.stock, stock <= 0 && styles.soldOut]}>{stockLine(stock)}</Text> : null}
      {product.options.length && !variant ? <Text style={styles.muted}>The shop doesn’t sell this combination. Pick another.</Text> : null}

      {product.options.length ? <VariantPicker product={product} picked={picked} onPick={setPicked} /> : null}

      {canAdd ? (
        <View style={styles.quantity}>
          <Text style={styles.label}>How many</Text>
          <Stepper value={shown} min={1} max={max} onChange={setQuantity} label="Quantity" />
        </View>
      ) : null}
      {inCart ? <Text style={styles.muted}>{`${inCart} of these already in your cart.`}</Text> : null}
      {note ? <Notice tone={note.tone} text={note.text} /> : null}

      <Facts>
        <Fact icon="bicycle-outline" title={methodsText(product)} />
        <Fact icon="return-down-back-outline" title={product.returnRule} />
      </Facts>

      {product.description ? (
        <>
          <Section title="About this product" />
          <Text style={styles.description}>{product.description}</Text>
        </>
      ) : null}

      <ListingReviews module="shop" listing={{ type: 'product', id: product.id }} business={product.business.name} rating={product.rating} />

      <ConfirmSheet
        visible={asking}
        title="Start a new cart?"
        message={`Your cart has items from ${cart?.store.name ?? 'another shop'}. An order is from one shop, so adding this clears them.`}
        confirmLabel="Clear cart and add"
        onConfirm={() => add(true)}
        onCancel={() => setAsking(false)}
      />
    </ScreenContainer>
  );
}

/** One product: its photo, price with the MRP struck through, the option picker, stock, and Add to cart. */
export function ProductScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => StoreService.product(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));

  return data ? (
    <ProductView key={data.id} product={data} />
  ) : (
    <ScreenContainer title="Product">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={5}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  head: { gap: Spacing.one, marginTop: Spacing.two },
  title: { ...Typography.title, color: Brand.text },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  stock: { ...Typography.bodyStrong, color: Brand.warning },
  soldOut: { color: Brand.error },
  quantity: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  label: { ...Typography.bodyStrong, color: Brand.text },
  description: { ...Typography.body, lineHeight: 24, color: Brand.textMuted },
});
