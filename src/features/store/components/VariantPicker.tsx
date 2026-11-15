import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
import type { ProductDetail } from '@/types/store';
import { pickValue, valueState } from '../lib/variants';

/**
 * One row of values per option. A value no variant has with what's picked before it can't be tapped; one that's sold out
 * is struck through and can still be picked, so the customer sees it's gone.
 */
export function VariantPicker({ product, picked, onPick }: { product: Pick<ProductDetail, 'options' | 'variants'>; picked: string[]; onPick: (next: string[]) => void }) {
  return (
    <View style={styles.wrap}>
      {product.options.map((option, index) => (
        <View key={option.name} style={styles.option}>
          <Text style={styles.name}>
            {option.name}
            <Text style={styles.chosen}>{picked[index] ? `  ${picked[index]}` : ''}</Text>
          </Text>
          <View style={styles.values} accessibilityRole="radiogroup" accessibilityLabel={option.name}>
            {option.values.map((value) => {
              const state = valueState(product, picked, index, value);
              const selected = picked[index] === value;
              const missing = state === 'missing';
              const soldOut = state === 'sold_out';
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: missing }}
                  accessibilityLabel={`${option.name} ${value}${soldOut ? ', sold out' : missing ? ', not available' : ''}`}
                  disabled={missing}
                  onPress={() => {
                    if (selected) return;
                    Feedback.select();
                    onPick(pickValue(product, picked, index, value));
                  }}
                  style={[styles.chip, selected && styles.chipSelected, missing && styles.chipMissing]}
                >
                  <Text style={[styles.label, selected && styles.labelSelected, soldOut && styles.labelSoldOut]}>{value}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  option: { gap: Spacing.two },
  name: { ...Typography.bodyStrong, color: Brand.text },
  chosen: { ...Typography.body, color: Brand.textMuted },
  values: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    minWidth: 48,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { borderColor: Brand.primary, backgroundColor: 'rgba(180,92,242,0.18)' },
  chipMissing: { opacity: 0.35 },
  label: { ...Typography.body, fontSize: 15, color: Brand.text },
  labelSelected: { color: Brand.primarySoft, fontFamily: Typography.bodyStrong.fontFamily },
  labelSoldOut: { color: Brand.textMuted, textDecorationLine: 'line-through' },
});
