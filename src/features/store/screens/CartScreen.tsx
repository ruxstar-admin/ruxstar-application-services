import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Card, Divider, PriceLine } from '@/features/coaching/components/Parts';
import { Feedback } from '@/lib/haptics';
import { CartLines } from '../components/CartLines';
import { useStoreRules } from '../hooks/use-store-rules';
import { cartCount, cartTotals, lineMax, removeLine, setQuantity } from '../lib/cart';
import { useCart } from '../stores/cart-store';

/** The cart on this phone: one shop's items, quantities and what they come to. Checkout prices them again. */
export function CartScreen() {
  const router = useRouter();
  const rules = useStoreRules();
  const { cart, setCart } = useCart();
  const [clearing, setClearing] = useState(false);

  if (!cart || !cart.lines.length) {
    return (
      <ScreenContainer title="Your cart">
        <EmptyState
          icon="bag-handle-outline"
          title="Your cart is empty"
          message="Find a local shop and add what you need. An order is from one shop."
          actionLabel="Find shops"
          onAction={() => router.replace({ pathname: '/(customer)/(tabs)/discover', params: { category: 'shop' } })}
        />
      </ScreenContainer>
    );
  }

  const totals = cartTotals(cart.lines);
  const n = cartCount(cart);
  const footer = (
    <>
      <PrimaryButton label="Checkout" onPress={() => router.push('/(customer)/store/checkout')} />
      <PrimaryButton label="Keep shopping" variant="outline" onPress={() => router.push({ pathname: '/(customer)/store/[id]', params: { id: cart.store.id } })} />
    </>
  );

  return (
    <ScreenContainer title="Your cart" footer={footer}>
      <View style={styles.head}>
        <Text style={styles.muted}>{`From ${cart.store.name}`}</Text>
        <TextLink label="Clear cart" muted onPress={() => setClearing(true)} />
      </View>

      <CartLines
        lines={cart.lines}
        maxOf={(l) => lineMax(l, rules)}
        onQuantity={(variantId, q) => setCart(setQuantity(cart, variantId, q, rules))}
        onRemove={(variantId) => {
          Feedback.tap();
          setCart(removeLine(cart, variantId));
        }}
      />

      <Card>
        {totals.saved > 0 ? <PriceLine label="MRP" amount={totals.mrp} /> : null}
        {totals.saved > 0 ? <PriceLine label="You save" amount={totals.saved} minus /> : null}
        {totals.saved > 0 ? <Divider /> : null}
        <PriceLine label={`Items (${n} item${n === 1 ? '' : 's'})`} amount={totals.items} strong />
      </Card>
      <Text style={styles.small}>Delivery, fees and offers are added at checkout, where prices and stock are checked again.</Text>

      <ConfirmSheet
        visible={clearing}
        title="Clear your cart?"
        message={`This removes everything from ${cart.store.name} in your cart.`}
        confirmLabel="Clear cart"
        onConfirm={() => {
          Feedback.tap();
          setClearing(false);
          setCart(null);
        }}
        onCancel={() => setClearing(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  muted: { ...Typography.body, color: Brand.textMuted, flex: 1 },
  small: { ...Typography.caption, color: Brand.textMuted },
});
