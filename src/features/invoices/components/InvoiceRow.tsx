import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { Feedback } from '@/lib/haptics';
import type { InvoiceRef } from '@/types/invoice';
import { indiaDay, KIND_LABEL, KIND_TONE, refTitle } from '../lib/invoices';

interface InvoiceRowProps {
  doc: Pick<InvoiceRef, 'kind' | 'role' | 'number' | 'issuedAt' | 'total'>;
  /** Who it's from or for, after the number. */
  detail?: string;
  onPress: () => void;
}

/** One GST document in a list: what it is, its number and date, and its amount. Credit notes read as money back. */
export function InvoiceRow({ doc, detail, onPress }: InvoiceRowProps) {
  const credit = doc.kind === 'credit_note';
  const amount = `${credit ? '−' : ''}${money(doc.total)}`;
  const title = refTitle(doc);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${doc.number}, ${amount}, ${indiaDay(doc.issuedAt)}`}
      accessibilityHint="Opens the document"
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.icon, credit && styles.iconCredit]}>
        <Ionicons name={credit ? 'return-down-back-outline' : 'document-text-outline'} size={18} color={credit ? Brand.warning : Brand.primarySoft} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.muted} numberOfLines={1}>
          {[doc.number, detail, indiaDay(doc.issuedAt)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, credit && styles.credit]}>{amount}</Text>
        <Badge label={KIND_LABEL[doc.kind]} tone={KIND_TONE[doc.kind]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  pressed: { opacity: 0.7 },
  icon: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,92,242,0.14)' },
  iconCredit: { backgroundColor: 'rgba(255,176,32,0.14)' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted },
  right: { alignItems: 'flex-end', gap: Spacing.one },
  amount: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  credit: { color: Brand.warning },
});
