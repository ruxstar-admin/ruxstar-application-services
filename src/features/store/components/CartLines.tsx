import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stepper } from '@/components/ui/Stepper';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import type { CartLine } from '../lib/cart';
import { optionsText } from '../lib/variants';

interface CartLinesProps {
  lines: readonly CartLine[];
  /** Left now per variant, from the quote; a line over it is flagged. */
  stock?: ReadonlyMap<string, number>;
  /** With these, each line gets a quantity stepper and Remove. */
  maxOf?: (line: CartLine) => number;
  onQuantity?: (variantId: string, quantity: number) => void;
  onRemove?: (variantId: string) => void;
}

/** The cart's lines: photo, title, options, price each and the line total; editable in the cart, read-only at checkout. */
export function CartLines({ lines, stock, maxOf, onQuantity, onRemove }: CartLinesProps) {
  return (
    <View style={styles.list}>
      {lines.map((line) => {
        const left = stock?.get(line.variantId) ?? line.stock;
        const short = left < line.quantity;
        const options = optionsText(line.options);
        return (
          <View key={line.variantId} style={styles.row}>
            <View style={styles.thumb}>
              {line.photoUrl ? (
                <Image source={{ uri: line.photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={line.photoUrl} accessible={false} />
              ) : (
                <Ionicons name="bag-handle-outline" size={22} color={Brand.textFaint} />
              )}
            </View>
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={2}>
                {line.title}
              </Text>
              {options ? <Text style={styles.small}>{options}</Text> : null}
              <Text style={styles.small}>{onQuantity ? `${money(line.price)} each` : `${line.quantity} × ${money(line.price)}`}</Text>
              {short ? <Text style={styles.warn}>{left > 0 ? `Only ${left} left. Lower the quantity.` : 'Sold out. Remove it to check out.'}</Text> : null}
              {onQuantity && maxOf ? (
                <View style={styles.controls}>
                  <Stepper value={line.quantity} min={1} max={Math.max(line.quantity, maxOf(line))} onChange={(q) => onQuantity(line.variantId, q)} label={`${line.title} quantity`} />
                  {onRemove ? <TextLink label="Remove" muted onPress={() => onRemove(line.variantId)} /> : null}
                </View>
              ) : null}
            </View>
            <Text style={styles.total}>{money(line.price * line.quantity)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  thumb: { width: 64, height: 64, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Brand.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  title: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  warn: { ...Typography.caption, color: Brand.warning },
  controls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.one },
  total: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
});
