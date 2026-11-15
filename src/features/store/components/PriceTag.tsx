import { StyleSheet, Text, View } from 'react-native';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { percentOff, priceSpoken } from '../lib/store';

/** The sale price, the MRP struck through and the % off, read out as one line. `big` on the product page. */
export function PriceTag({ price, mrp, from, big }: { price: number; mrp: number | null; from?: boolean; big?: boolean }) {
  const off = percentOff(price, mrp);
  return (
    <View style={styles.row} accessible accessibilityLabel={priceSpoken(price, mrp, from)}>
      <Text style={big ? styles.bigPrice : styles.price}>{`${from ? 'From ' : ''}${money(price)}`}</Text>
      {off && mrp ? (
        <>
          <Text style={big ? styles.bigMrp : styles.mrp}>{money(mrp)}</Text>
          <Text style={big ? styles.bigOff : styles.off}>{`${off}% off`}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: Spacing.two },
  price: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  mrp: { ...Typography.caption, fontSize: 12, color: Brand.textFaint, textDecorationLine: 'line-through' },
  off: { ...Typography.caption, fontSize: 12, color: Brand.success },
  bigPrice: { ...Typography.title, color: Brand.text },
  bigMrp: { ...Typography.body, color: Brand.textFaint, textDecorationLine: 'line-through' },
  bigOff: { ...Typography.bodyStrong, color: Brand.success },
});
