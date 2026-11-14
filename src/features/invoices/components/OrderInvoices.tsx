import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Brand, Spacing, Typography } from '@/constants/theme';
import type { InvoiceAudience, InvoiceRef } from '@/types/invoice';
import { INVOICE_PATH } from '../lib/routes';
import { InvoiceRow } from './InvoiceRow';

/** An order's GST invoices and credit notes, each opening the document. Nothing for older orders, which have none. */
export function OrderInvoices({ refs, audience = 'customer' }: { refs: InvoiceRef[] | undefined; audience?: InvoiceAudience }) {
  const router = useRouter();
  if (!refs?.length) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>{refs.length === 1 ? 'Invoice' : 'Invoices'}</Text>
      {refs.map((ref) => (
        <InvoiceRow
          key={ref.id}
          doc={ref}
          detail={ref.issuer === 'ruxstar' ? 'Ruxstar' : undefined}
          onPress={() => router.push({ pathname: INVOICE_PATH[audience], params: { id: ref.id } })}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four, marginBottom: Spacing.one },
});
