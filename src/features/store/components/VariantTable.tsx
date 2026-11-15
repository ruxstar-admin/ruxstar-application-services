import { useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
import { bulkSet, type VariantRow } from '../lib/variants';

const rupees = (text: string) => text.replace(/[^\d.]/g, '').slice(0, 9);
const whole = (text: string) => text.replace(/\D/g, '').slice(0, 6);

function Cell({ label, value, onChange, kind, wide }: { label: string; value: string; onChange: (text: string) => void; kind: 'rupees' | 'whole' | 'text'; wide?: boolean }) {
  return (
    <View style={[styles.cell, wide && styles.wide]}>
      <Text style={styles.cellLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(kind === 'rupees' ? rupees(t) : kind === 'whole' ? whole(t) : t.slice(0, 40))}
        keyboardType={kind === 'text' ? 'default' : kind === 'rupees' ? 'decimal-pad' : 'number-pad'}
        placeholder={kind === 'rupees' ? '₹' : kind === 'whole' ? '0' : 'Optional'}
        placeholderTextColor={Brand.textFaint}
        accessibilityLabel={label}
        autoCapitalize="characters"
        style={styles.input}
      />
    </View>
  );
}

/** One row per mix of option values: on or off, price, MRP, stock and SKU. "Set for all" fills every row that's on. */
export function VariantTable({ rows, onChange, hasOptions }: { rows: VariantRow[]; onChange: (rows: VariantRow[]) => void; hasOptions: boolean }) {
  const [bulk, setBulk] = useState({ price: '', mrp: '', stock: '' });
  const set = (i: number, patch: Partial<VariantRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const on = rows.filter((r) => r.on).length;

  return (
    <View style={styles.wrap}>
      {hasOptions && rows.length > 1 ? (
        <View style={styles.bulk}>
          <Text style={styles.strong}>{`Set for all ${on} on`}</Text>
          <View style={styles.cells}>
            <Cell label="Price" value={bulk.price} onChange={(price) => setBulk((b) => ({ ...b, price }))} kind="rupees" />
            <Cell label="MRP" value={bulk.mrp} onChange={(mrp) => setBulk((b) => ({ ...b, mrp }))} kind="rupees" />
            <Cell label="Stock" value={bulk.stock} onChange={(stock) => setBulk((b) => ({ ...b, stock }))} kind="whole" />
          </View>
          <PrimaryButton
            label="Apply"
            variant="outline"
            disabled={!on || (!bulk.price && !bulk.mrp && !bulk.stock)}
            onPress={() => {
              Feedback.select();
              onChange(bulkSet(rows, bulk));
              setBulk({ price: '', mrp: '', stock: '' });
            }}
          />
        </View>
      ) : null}
      {rows.map((r, i) => {
        const name = r.values.length ? r.values.join(' / ') : 'Price and stock';
        return (
          <View key={r.values.join('\u0000') || 'one'} style={[styles.row, !r.on && styles.off]}>
            <View style={styles.rowHead}>
              <Text style={styles.strong}>{name}</Text>
              {hasOptions ? (
                <Switch
                  value={r.on}
                  onValueChange={(v) => {
                    Feedback.select();
                    set(i, { on: v });
                  }}
                  accessibilityLabel={`Sell ${name}`}
                  trackColor={{ true: Brand.primary, false: Brand.surfaceAlt }}
                />
              ) : null}
            </View>
            {r.on ? (
              <View style={styles.cells}>
                <Cell label="Price" value={r.price} onChange={(price) => set(i, { price })} kind="rupees" />
                <Cell label="MRP" value={r.mrp} onChange={(mrp) => set(i, { mrp })} kind="rupees" />
                <Cell label="Stock" value={r.stock} onChange={(stock) => set(i, { stock })} kind="whole" />
                <Cell label="SKU" value={r.sku} onChange={(sku) => set(i, { sku })} kind="text" wide />
              </View>
            ) : (
              <Text style={styles.small}>Not sold. Turn it on to sell this one.</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  bulk: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: 'rgba(180,92,242,0.08)', borderWidth: 1, borderColor: Brand.border },
  row: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  off: { opacity: 0.7 },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three, minHeight: 32 },
  strong: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text, flex: 1 },
  small: { ...Typography.caption, color: Brand.textMuted },
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  cell: { flexGrow: 1, flexBasis: '28%', gap: 2 },
  wide: { flexBasis: '100%' },
  cellLabel: { ...Typography.caption, fontSize: 12, color: Brand.textMuted },
  input: { height: 44, paddingHorizontal: Spacing.two, borderRadius: Radius.md, borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.bg, color: Brand.text, ...Typography.body },
});
