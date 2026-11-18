import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { InvoiceService } from '@/services/invoice-service';
import type { Invoice, InvoiceAudience } from '@/types/invoice';
import { InvoiceBody } from '../components/InvoiceBody';
import { InvoiceRow } from '../components/InvoiceRow';
import { useInvoicePdf } from '../hooks/use-invoice-pdf';
import { indiaDay, KIND_LABEL, KIND_TONE, kindNote } from '../lib/invoices';
import { orderHref, relatedInvoices, useInvoicePath } from '../lib/routes';

function Head({ invoice, audience }: { invoice: Invoice; audience: InvoiceAudience }) {
  return (
    <>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text style={styles.number} selectable accessibilityLabel={`${KIND_LABEL[invoice.kind]} number ${invoice.number}`}>
            {invoice.number}
          </Text>
          <Text style={styles.muted}>{`Issued ${indiaDay(invoice.issuedAt)} · FY ${invoice.fy}`}</Text>
          <Text style={styles.muted}>{`${invoice.business.name} · Order #${invoice.order.orderNo}`}</Text>
        </View>
        <Badge label={KIND_LABEL[invoice.kind]} tone={KIND_TONE[invoice.kind]} />
      </View>
      <Text style={[styles.total, invoice.kind === 'credit_note' && styles.credit]}>{`${invoice.kind === 'credit_note' ? '−' : ''}${money(invoice.totals.total)}`}</Text>
      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={18} color={Brand.textMuted} />
        <Text style={styles.noteText}>{kindNote(invoice, audience)}</Text>
      </View>
    </>
  );
}

function Details({ invoice, related, audience }: { invoice: Invoice; related: Invoice[]; audience: InvoiceAudience }) {
  const router = useRouter();
  const pdf = useInvoicePdf(audience, invoice.id);
  const path = useInvoicePath(audience);
  const open = (id: string) => router.push({ pathname: path, params: { id } });
  const order = orderHref(invoice, audience);

  return (
    <>
      <Head invoice={invoice} audience={audience} />
      {invoice.against ? (
        <View style={styles.against}>
          <Text style={styles.muted}>{`Reduces invoice ${invoice.against.number} of ${indiaDay(invoice.against.issuedAt)}`}</Text>
          <TextLink label="Open that invoice" onPress={() => open(invoice.against!.id)} />
        </View>
      ) : null}
      {invoice.refund?.reason ? <Text style={styles.muted}>{`Refund reason: ${invoice.refund.reason}`}</Text> : null}
      {invoice.credited && invoice.kind !== 'credit_note' ? (
        <Text style={styles.muted}>{`${money(invoice.credited)} of this has been credited back for refunds.`}</Text>
      ) : null}

      <View style={styles.actions}>
        <View style={styles.flex}>
          <PrimaryButton label="Open PDF" onPress={pdf.open} loading={pdf.busy === 'open'} disabled={!!pdf.busy} />
        </View>
        <View style={styles.flex}>
          <PrimaryButton label="Share or save" variant="outline" onPress={pdf.share} loading={pdf.busy === 'share'} disabled={!!pdf.busy} />
        </View>
      </View>
      {pdf.error ? <ErrorBanner message={pdf.error} /> : null}

      <InvoiceBody invoice={invoice} audience={audience} />

      {related.length ? (
        <>
          <Text style={styles.section}>{audience === 'vendor' ? 'Credit notes against it' : 'Other documents for this order'}</Text>
          {related.map((doc) => (
            <InvoiceRow key={doc.id} doc={{ ...doc, total: doc.totals.total }} detail={doc.issuer === 'ruxstar' ? 'Ruxstar' : undefined} onPress={() => open(doc.id)} />
          ))}
        </>
      ) : null}

      {order ? (
        <View style={styles.order}>
          <PrimaryButton label="View order" variant="outline" onPress={() => router.push(order)} />
        </View>
      ) : null}
    </>
  );
}

/** One GST invoice, bill of supply or credit note, for a customer, a business or Ruxstar staff. */
export function InvoiceScreen({ audience }: { audience: InvoiceAudience }) {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(async () => {
    const invoice = await InvoiceService.get(token, audience, id);
    const related = await relatedInvoices(token, audience, invoice).catch(() => []);
    return { invoice, related };
  }, id);

  return (
    <ScreenContainer title={data ? KIND_LABEL[data.invoice.kind] : 'Invoice'}>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={5}>
        {data ? <Details invoice={data.invoice} related={data.related} audience={audience} /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  number: { ...Typography.title, fontSize: 22, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted },
  total: { fontFamily: Fonts.bold, fontSize: 32, color: Brand.text, marginTop: Spacing.two },
  credit: { color: Brand.warning },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  noteText: { ...Typography.caption, fontSize: 14, color: Brand.text, flex: 1 },
  against: { gap: Spacing.one, alignItems: 'flex-start' },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three, marginBottom: Spacing.one },
  order: { marginTop: Spacing.three },
});
