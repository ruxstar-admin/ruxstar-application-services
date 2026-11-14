import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import type { Term } from '@/features/pod/lib/terms';

/** Payment conditions, one per line with an icon. */
export function PaymentTerms({ terms }: { terms: Term[] }) {
  return (
    <View style={styles.card}>
      {terms.map((term) => (
        <View key={term.text} style={styles.row}>
          <View style={styles.icon}>
            <Ionicons name={term.icon} size={18} color={Brand.primarySoft} />
          </View>
          <Text style={styles.text}>{term.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  icon: { width: 32, height: 32, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.surfaceAlt },
  text: { ...Typography.caption, fontSize: 14, lineHeight: 20, color: Brand.text, flex: 1, paddingTop: 5 },
});
