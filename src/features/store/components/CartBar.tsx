import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { cartCount, cartTotals, type Cart } from '../lib/cart';
import { useCart } from '../stores/cart-store';

/** The cart when it holds this shop's things, for a screen's footer. */
export function useStoreCart(storeId: string): Cart | null {
  const { cart } = useCart();
  return cart && cart.store.id === storeId && cart.lines.length ? cart : null;
}

/** "3 items in your cart · ₹1,200" and View cart. */
export function CartBar({ cart }: { cart: Cart }) {
  const router = useRouter();
  const n = cartCount(cart);
  return (
    <View style={styles.bar}>
      <View style={styles.flex}>
        <Text style={styles.total}>{money(cartTotals(cart.lines).items)}</Text>
        <Text style={styles.faint}>{`${n} item${n === 1 ? '' : 's'} in your cart`}</Text>
      </View>
      <View style={styles.button}>
        <PrimaryButton label="View cart" onPress={() => router.push('/(customer)/store/cart')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1 },
  total: { ...Typography.heading, color: Brand.text },
  faint: { ...Typography.caption, color: Brand.textMuted },
  button: { width: 150 },
});
