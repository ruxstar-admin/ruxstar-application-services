import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SelectField } from '@/components/ui/SelectField';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { decimalOnly, sellerErrors, sellerPatch, sellerValues, type SellerValues } from '@/features/invoices/lib/gst-settings';
import { cleanGstin, stateOfGstin, STATE_NAMES } from '@/features/invoices/lib/gstin';
import { percent } from '@/features/invoices/lib/invoices';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { GstService } from '@/services/invoice-service';
import type { GstSellerSettings } from '@/types/invoice';
import { useCan } from '../access';
import { Card, Fact, Facts, Note, consoleStyles, errorText } from './parts';

const FIELD_OF: Partial<Record<string, keyof SellerValues>> = { gstin: 'gstin', state: 'state', line: 'line', city: 'city', pincode: 'pincode', legalName: 'legalName', tradeName: 'tradeName' };

/** The API's message for a field it refused, matched on the end of its path (`body/address/state`). */
function fieldErrorOf(err: unknown): Partial<Record<keyof SellerValues, string>> {
  if (!(err instanceof ApiError)) return {};
  const found: Partial<Record<keyof SellerValues, string>> = {};
  for (const d of err.details) {
    const field = FIELD_OF[d.path?.split('/').pop() ?? ''];
    if (field) found[field] = d.message;
  }
  return found;
}

function ReadOnly({ s }: { s: GstSellerSettings }) {
  return (
    <Facts>
      <Fact label="Legal name" value={s.legalName} />
      <Fact label="Trade name" value={s.tradeName} />
      <Fact label="GSTIN" value={s.gstin ?? 'Not entered'} warn={!s.gstin} />
      <Fact label="State" value={s.address?.state ?? 'Not entered'} warn={!s.address} />
      <Fact label="Address" value={s.address ? `${s.address.line}, ${s.address.city} ${s.address.pincode}` : 'Not entered'} warn={!s.address} />
      <Fact label="Platform fee" value={`SAC ${s.feeCode || 'not set'} · ${percent(s.feeRateBps)}`} />
    </Facts>
  );
}

/** Ruxstar's own GST details: on its platform-fee invoices, on sales it invoices itself, and as the operator on businesses' invoices. */
export function GstSellerCard({ s, onSaved }: { s: GstSellerSettings; onSaved: (s: GstSellerSettings) => void }) {
  const token = useAuthToken();
  const canManage = useCan('modules.manage');
  const [values, setValues] = useState<SellerValues>(() => sellerValues(s));
  const [serverErrors, setServerErrors] = useState<Partial<Record<keyof SellerValues, string>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());

  const errors = { ...serverErrors, ...Object.fromEntries(Object.entries(sellerErrors(values)).filter(([, v]) => v)) };
  const invalid = Object.values(errors).some(Boolean);
  const changes = sellerPatch(s, values);
  const gstinState = stateOfGstin(values.gstin);

  const set = (field: keyof SellerValues) => (text: string) => {
    const value = field === 'gstin' ? cleanGstin(text) : field === 'pincode' ? text.replace(/\D/g, '').slice(0, 6) : field === 'feeCode' ? text.replace(/\D/g, '').slice(0, 8) : field === 'feeRate' ? decimalOnly(text) : text;
    setValues((v) => ({ ...v, [field]: value }));
    setServerErrors((e) => ({ ...e, [field]: undefined }));
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const done = await GstService.updateSeller(token, changes, key.current);
      key.current = newIdempotencyKey();
      Feedback.success();
      onSaved(done);
      setValues(sellerValues(done));
    } catch (err) {
      Feedback.error();
      const fields = fieldErrorOf(err);
      setServerErrors(fields);
      if (!Object.keys(fields).length) setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <View style={styles.flex}>
        <Text style={styles.name}>Ruxstar&apos;s details</Text>
        <Text style={consoleStyles.muted}>{s.updatedAt ? `Changed ${timeAgo(s.updatedAt)}` : 'On the defaults'}</Text>
      </View>
      {!s.gstin || !s.address ? (
        <Note tone="danger">
          Enter Ruxstar&apos;s GSTIN, legal name and address before going live. Until there is a GSTIN, Ruxstar&apos;s platform-fee documents are bills of
          supply with no GST.
        </Note>
      ) : null}
      {!canManage ? (
        <ReadOnly s={s} />
      ) : (
        <>
          <InputField label="Legal name" value={values.legalName} onChangeText={set('legalName')} maxLength={120} hint="Exactly as on Ruxstar's GST registration certificate." error={errors.legalName} />
          <InputField label="Trade name" value={values.tradeName} onChangeText={set('tradeName')} maxLength={120} hint="The name people see at the top of Ruxstar's invoices." error={errors.tradeName} />
          <InputField
            label="GSTIN"
            value={values.gstin}
            onChangeText={set('gstin')}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={15}
            placeholder="36AABCR1234A1Z5"
            hint={gstinState && !errors.gstin ? `Registered in ${gstinState}.` : '15 characters: the state code, the PAN, then 3 more. Leave empty until Ruxstar is registered.'}
            error={errors.gstin}
          />
          <Text style={styles.group}>Registered address</Text>
          <Text style={consoleStyles.muted}>Fill in all of it, or leave all of it empty. The state must be the GSTIN&apos;s state.</Text>
          <InputField label="Address" value={values.line} onChangeText={set('line')} maxLength={200} placeholder="Building, street, area" error={errors.line} />
          <View style={styles.pair}>
            <View style={styles.flex}>
              <InputField label="City" value={values.city} onChangeText={set('city')} maxLength={60} error={errors.city} />
            </View>
            <View style={styles.flex}>
              <InputField label="PIN code" value={values.pincode} onChangeText={set('pincode')} keyboardType="number-pad" maxLength={6} error={errors.pincode} />
            </View>
          </View>
          <SelectField label="State" value={values.state} options={STATE_NAMES} onChange={set('state')} placeholder="Pick a state" error={errors.state} />
          <Text style={styles.group}>Platform fee</Text>
          <View style={styles.pair}>
            <View style={styles.flex}>
              <InputField label="SAC code" value={values.feeCode} onChangeText={set('feeCode')} keyboardType="number-pad" maxLength={8} hint="998599 by default." error={errors.feeCode} />
            </View>
            <View style={styles.flex}>
              <InputField label="GST rate (%)" value={values.feeRate} onChangeText={set('feeRate')} keyboardType="decimal-pad" hint="18% by default." error={errors.feeRate} />
            </View>
          </View>
          <PrimaryButton label="Save Ruxstar's details" onPress={save} loading={busy} disabled={invalid || !Object.keys(changes).length} />
          {error ? <ErrorBanner message={error} /> : null}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  name: { ...Typography.bodyStrong, color: Brand.text },
  group: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.two },
  pair: { flexDirection: 'row', gap: Spacing.two },
});
