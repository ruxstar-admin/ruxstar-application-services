import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { refundLine, type RefundTier } from '@/lib/booking/refund';

type RefundLineProps =
  /** `what` finishes "before …": "it starts", "move-in", "the first class". */
  | { tiers: readonly RefundTier[]; what?: string }
  /** A sentence written elsewhere, e.g. an event's dated cut-off. */
  | { text: string; refundable: boolean };

/** The refund rule in one sentence, shown above every Pay button. Green shield when money comes back, amber when it doesn't. */
export function RefundLine(props: RefundLineProps) {
  const text = 'text' in props ? props.text : refundLine(props.tiers, props.what);
  const refundable = 'text' in props ? props.refundable : props.tiers.some((t) => t.percent > 0);
  return (
    <View style={styles.box}>
      <Ionicons name="shield-checkmark-outline" size={18} color={refundable ? Brand.success : Brand.warning} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start', padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  text: { ...Typography.caption, fontSize: 14, color: Brand.text, flex: 1 },
});
