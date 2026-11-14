import { StyleSheet, Text, View } from 'react-native';
import { DetailLine } from '@/components/ui/DetailLine';
import { Brand, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import type { Invoice, InvoiceAudience, InvoiceLine, InvoiceParty } from '@/types/invoice';
import { percent, supplyLine, taxRows } from '../lib/invoices';

function Party({ title, party, extra }: { title: string; party: InvoiceParty; extra?: React.ReactNode }) {
  return (
    <>
      <Text style={styles.section}>{title}</Text>
      <View style={styles.card}>
        <DetailLine label="Name" value={party.legalName && party.legalName !== party.name ? `${party.name} (${party.legalName})` : party.name} />
        <DetailLine label="GSTIN" value={party.gstin ?? 'Not GST registered'} copyable={!!party.gstin} />
        {party.address ? <DetailLine label="Address" value={party.address} /> : null}
        {party.state ? <DetailLine label="State" value={party.stateCode ? `${party.state} (${party.stateCode})` : party.state} /> : null}
        {extra}
      </View>
    </>
  );
}

function Line({ line }: { line: InvoiceLine }) {
  const facts = [
    `${line.quantity} × ${money(line.unitPrice)}`,
    line.code ? `${line.codeKind.toUpperCase()} ${line.code}` : null,
    line.rateBps ? `GST ${percent(line.rateBps)}` : 'No GST',
  ];
  return (
    <View style={styles.line}>
      <View style={styles.lineHead}>
        <Text style={styles.lineTitle}>{line.description}</Text>
        <Text style={styles.value}>{money(line.total)}</Text>
      </View>
      <Text style={styles.muted}>{facts.filter(Boolean).join(' · ')}</Text>
      {line.discount ? <Text style={styles.muted}>{`${money(line.discount)} off from the seller`}</Text> : null}
      {line.rateBps ? <Text style={styles.muted}>{`${money(line.taxable)} before GST`}</Text> : null}
    </View>
  );
}

function Sum({ label, amount, strong, negative }: { label: string; amount: number; strong?: boolean; negative?: boolean }) {
  return (
    <View style={styles.sum}>
      <Text style={strong ? styles.strong : styles.label}>{label}</Text>
      <Text style={strong ? styles.strong : styles.value}>{`${negative ? '−' : ''}${money(amount)}`}</Text>
    </View>
  );
}

/** Seller, buyer, the lines, the GST split and the totals of one document, as printed on its PDF. */
export function InvoiceBody({ invoice, audience }: { invoice: Invoice; audience: InvoiceAudience }) {
  const { totals, tcs } = invoice;
  const operator = invoice.operator ? `${invoice.operator.name}${invoice.operator.gstin ? ` · ${invoice.operator.gstin}` : ''}` : null;
  return (
    <>
      <Party
        title="From"
        party={invoice.seller}
        extra={operator ? <DetailLine label={invoice.operatorPays ? 'E-commerce operator, which pays the GST' : 'E-commerce operator'} value={operator} /> : null}
      />
      <Party title="To" party={invoice.buyer} extra={<DetailLine label="Place of supply" value={supplyLine(invoice)} />} />

      <Text style={styles.section}>{invoice.kind === 'credit_note' ? 'Credited' : 'Items'}</Text>
      <View style={styles.card}>
        {invoice.lines.map((line, i) => (
          <Line key={`${line.description}-${i}`} line={line} />
        ))}
        <View style={styles.totals}>
          {totals.tax ? <Sum label="Taxable value" amount={totals.taxable} /> : null}
          {taxRows(invoice).map((row) => (
            <Sum key={row.label} label={row.label} amount={row.amount} />
          ))}
          <Sum label={invoice.kind === 'credit_note' ? 'Total credited' : 'Total'} amount={totals.total} strong />
          {totals.ruxstarDiscount ? (
            <>
              <Sum label="Ruxstar discount (paid by Ruxstar)" amount={totals.ruxstarDiscount} negative />
              <Sum label={audience === 'customer' ? 'You paid' : 'Customer paid'} amount={totals.payable} strong />
            </>
          ) : null}
        </View>
      </View>

      {tcs && audience !== 'customer' ? (
        <View style={styles.note}>
          <Text style={styles.strong}>{`TCS ${percent(tcs.rateBps)}: ${money(tcs.amount)}`}</Text>
          <Text style={styles.muted}>
            {audience === 'vendor'
              ? 'Tax collected at source: the share of GST law says Ruxstar collects on your sale, for your GST return. It isn’t taken from your payouts yet.'
              : "Tax Ruxstar collects at source on the business's sale. It isn't taken from payouts yet."}
          </Text>
        </View>
      ) : null}

      {invoice.notes.length ? (
        <View style={styles.note}>
          {invoice.notes.map((n) => (
            <Text key={n} style={styles.muted}>
              {n}
            </Text>
          ))}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three, marginBottom: Spacing.one },
  card: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  note: { gap: Spacing.one, padding: Spacing.three, marginTop: Spacing.two, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  line: { gap: 2 },
  lineHead: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  lineTitle: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text, flex: 1 },
  totals: { gap: Spacing.two, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.border },
  sum: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  label: { ...Typography.body, fontSize: 15, color: Brand.textMuted, flexShrink: 1 },
  value: { ...Typography.body, fontSize: 15, color: Brand.text },
  strong: { fontFamily: Fonts.bold, fontSize: 16, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted },
});
