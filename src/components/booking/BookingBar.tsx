import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';

interface BookingBarProps {
  /** "2 slots · 7–9 pm". Empty shows `placeholder` and hides the total. */
  summary: string;
  /** Paise. */
  total: number;
  onPay: () => void;
  payLabel?: string;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
}

/** The pinned bar for `ScreenContainer`'s `footer`: what's picked, the total and Pay. It stays put and updates as you pick. */
export function BookingBar({ summary, total, onPay, payLabel = 'Pay', placeholder = 'Pick a slot to book', loading, disabled }: BookingBarProps) {
  const empty = !summary;
  return (
    <View style={styles.bar}>
      <View style={styles.text} accessible accessibilityLiveRegion="polite" accessibilityLabel={empty ? placeholder : `${summary}, total ${money(total)}`}>
        <Text style={styles.summary} numberOfLines={1}>
          {empty ? placeholder : summary}
        </Text>
        {empty ? null : <Text style={styles.total}>{total === 0 ? 'Free' : money(total)}</Text>}
      </View>
      <View style={styles.button}>
        <PrimaryButton label={payLabel} onPress={onPay} loading={loading} disabled={disabled || empty} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  text: { flex: 1, gap: 2 },
  summary: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  total: { ...Typography.bodyStrong, fontSize: 20, color: Brand.text },
  button: { minWidth: 132 },
});
