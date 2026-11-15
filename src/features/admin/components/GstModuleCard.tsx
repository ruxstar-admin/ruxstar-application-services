import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { decimalOnly, lowRateLine, MAX_TCS_BPS, moduleErrors, modulePatch, moduleValues, type ModuleValues } from '@/features/invoices/lib/gst-settings';
import { percent } from '@/features/invoices/lib/invoices';
import { useAuthToken } from '@/hooks/use-auth-token';
import { keepIdempotencyKey, newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { GstService } from '@/services/invoice-service';
import type { GstModulePatch, GstModuleSettings } from '@/types/invoice';
import { useCan } from '../access';
import { GST_MODULE_LABEL } from '../labels';
import { Card, Fact, Facts, Note, consoleStyles, errorText } from './parts';

const CODE_KINDS = [
  { key: 'sac', label: 'SAC (services)' },
  { key: 'hsn', label: 'HSN (goods)' },
] as const;

const SELLER_TEXT: Record<GstModuleSettings['seller'], string> = {
  vendor: 'The business, with Ruxstar as the e-commerce operator',
  ruxstar: 'Ruxstar invoices the sale itself',
};
const WITHOUT_GSTIN_TEXT: Record<GstModuleSettings['withoutGstin'], string> = {
  bill_of_supply: 'Issues a bill of supply, with no GST',
  ruxstar: 'Ruxstar invoices it and pays the GST (section 9(5))',
};

/** What the module does that staff can see but not change here. */
function Rules({ m }: { m: GstModuleSettings }) {
  return (
    <>
      <Facts>
        <Fact label="Who sells" value={SELLER_TEXT[m.seller]} />
        <Fact label="A business without a GSTIN" value={WITHOUT_GSTIN_TEXT[m.withoutGstin]} />
        {m.lowRate ? <Fact label="Lower rate" value={lowRateLine(m.lowRate)} /> : null}
        <Fact label="Prices include GST" value={m.pricesIncludeTax ? 'Yes, always' : 'No'} />
      </Facts>
      <Note>
        Customers always pay the price they see, and the invoice shows how much of it was GST. Adding GST on top of prices at checkout isn&apos;t
        available yet, because it would change what customers pay, so Ruxstar refuses switching this off.
      </Note>
      {m.items.length ? (
        <>
          <Text style={styles.group}>Own rates for some items</Text>
          {m.items.map((item) => (
            <Text key={item.key} style={consoleStyles.muted}>
              {[item.label, item.code ? `${item.codeKind.toUpperCase()} ${item.code}` : null, percent(item.rateBps), item.lowRate ? lowRateLine(item.lowRate) : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ))}
        </>
      ) : null}
    </>
  );
}

/** One module's GST rules: whether documents are issued, the standard rate and code, and TCS. */
export function GstModuleCard({ m, onSaved }: { m: GstModuleSettings; onSaved: (m: GstModuleSettings) => void }) {
  const token = useAuthToken();
  const canManage = useCan('modules.manage');
  const [values, setValues] = useState<ModuleValues>(() => moduleValues(m));
  const [busy, setBusy] = useState<'enabled' | 'rates' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turningOff, setTurningOff] = useState(false);
  const key = useRef(newIdempotencyKey());

  const errors = moduleErrors(values);
  const invalid = Object.values(errors).some(Boolean);
  const changes = invalid ? {} : modulePatch(m, values);
  const set = (field: keyof ModuleValues) => (text: string) => setValues((v) => ({ ...v, [field]: field === 'code' ? text.replace(/\D/g, '').slice(0, 8) : decimalOnly(text) }));

  const save = async (patch: GstModulePatch, what: 'enabled' | 'rates') => {
    if (busy) return;
    setBusy(what);
    setError(null);
    try {
      const done = await GstService.updateModule(token, m.module, patch, key.current);
      key.current = newIdempotencyKey();
      Feedback.success();
      onSaved(done);
      if (what === 'rates') setValues(moduleValues(done));
    } catch (err) {
      Feedback.error();
      if (!keepIdempotencyKey(err)) key.current = newIdempotencyKey();
      setError(errorText(err));
    } finally {
      setBusy(null);
      setTurningOff(false);
    }
  };

  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text style={styles.name}>{GST_MODULE_LABEL[m.module]}</Text>
          <Text style={consoleStyles.muted}>{m.updatedAt ? `Changed ${timeAgo(m.updatedAt)}` : 'On the defaults'}</Text>
        </View>
        <Badge label={m.enabled ? 'Issuing' : 'Off'} tone={m.enabled ? 'success' : 'neutral'} />
      </View>

      {canManage ? (
        <>
          <ToggleRow
            title="Issue GST documents"
            subtitle="Invoices, bills of supply and credit notes for this module's paid orders, including Ruxstar's fee invoice."
            value={m.enabled}
            onValueChange={(enabled) => (enabled ? save({ enabled }, 'enabled') : setTurningOff(true))}
          />
          <InputField
            label="GST rate (%)"
            keyboardType="decimal-pad"
            value={values.rate}
            onChangeText={set('rate')}
            hint="The standard rate for this module. Items listed below keep their own rates."
            error={errors.rate}
          />
          <SegmentedTabs options={CODE_KINDS} value={values.codeKind} onChange={(codeKind) => setValues((v) => ({ ...v, codeKind }))} />
          <InputField
            label={values.codeKind === 'sac' ? 'SAC code' : 'HSN code'}
            keyboardType="number-pad"
            value={values.code}
            onChangeText={set('code')}
            maxLength={8}
            hint="Printed on every line. SAC is for services, HSN for goods: 4 to 8 digits. Leave empty if there isn't one yet."
            error={errors.code}
          />
          <InputField
            label="TCS (%)"
            keyboardType="decimal-pad"
            value={values.tcs}
            onChangeText={set('tcs')}
            hint={`Tax Ruxstar collects at source on GST-registered businesses' sales; 0.5% since 10 July 2024. Up to ${percent(MAX_TCS_BPS)}. Shown on their invoices; not taken from payouts yet.`}
            error={errors.tcs}
          />
          <PrimaryButton
            label="Save rates"
            variant="outline"
            onPress={() => save(changes, 'rates')}
            loading={busy === 'rates'}
            disabled={invalid || !Object.keys(changes).length || busy !== null}
          />
        </>
      ) : (
        <Facts>
          <Fact label="GST documents" value={m.enabled ? 'Issued' : 'Off'} />
          <Fact label="GST rate" value={percent(m.rateBps)} />
          <Fact label={m.codeKind === 'sac' ? 'SAC' : 'HSN'} value={m.code || 'Not set'} warn={!m.code} />
          <Fact label="TCS" value={percent(m.tcsBps)} />
        </Facts>
      )}
      {error ? <ErrorBanner message={error} /> : null}
      <Rules m={m} />

      <ConfirmSheet
        visible={turningOff}
        title={`Stop GST documents for ${GST_MODULE_LABEL[m.module]}?`}
        message="Orders paid from now on get no invoice, not even Ruxstar's fee invoice. Documents already issued stay as they are."
        confirmLabel="Turn off"
        loading={busy === 'enabled'}
        onConfirm={() => save({ enabled: false }, 'enabled')}
        onCancel={() => setTurningOff(false)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  name: { ...Typography.bodyStrong, color: Brand.text },
  group: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.two },
});
