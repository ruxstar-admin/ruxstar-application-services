import { StyleSheet, Text, View } from 'react-native';
import { InputField } from '@/components/ui/InputField';
import { Brand, Spacing, Typography } from '@/constants/theme';
import type { RoomKind } from '@/types/stays';
import type { PriceErrors } from '../lib/forms';

/** A room's month and night prices in rupees; either can be left empty when the room isn't let that way. */
export function RoomPriceFields({
  kind,
  month,
  night,
  errors,
  onChange,
}: {
  kind: RoomKind;
  month: string;
  night: string;
  errors: PriceErrors;
  onChange: (changes: { month?: string; night?: string }) => void;
}) {
  const per = kind === 'private' ? 'room' : 'bed';
  return (
    <View style={styles.wrap}>
      <View style={styles.pair}>
        <View style={styles.half}>
          <InputField label={`₹ a month per ${per}`} value={month} onChangeText={(v) => onChange({ month: v })} keyboardType="number-pad" maxLength={7} placeholder="Like 9000" error={errors.month} />
        </View>
        <View style={styles.half}>
          <InputField label={`₹ a night per ${per}`} value={night} onChangeText={(v) => onChange({ night: v })} keyboardType="number-pad" maxLength={7} placeholder="Like 600" error={errors.night} />
        </View>
      </View>
      <Text style={errors.prices ? styles.error : styles.hint}>{errors.prices ?? 'Leave one empty if you don’t let the room that way.'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  pair: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  hint: { ...Typography.caption, color: Brand.textMuted },
  error: { ...Typography.caption, color: Brand.error },
});
