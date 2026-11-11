import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { digitsOnly } from '@/features/kyc/lib/validators';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { KycService } from '@/services/kyc-service';
import type { KycBusiness } from '@/types/kyc';

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PINCODE = /^[1-9][0-9]{5}$/;

type Field = 'businessName' | 'line1' | 'line2' | 'city' | 'state' | 'pincode' | 'gstin';
type Values = Record<Field, string>;

const fromBusiness = (b: KycBusiness | null): Values => ({
  businessName: b?.name ?? '',
  line1: b?.address.line1 ?? '',
  line2: b?.address.line2 ?? '',
  city: b?.address.city ?? '',
  state: b?.address.state ?? '',
  pincode: b?.address.pincode ?? '',
  gstin: b?.gstin?.number ?? '',
});

function check(v: Values): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  if (v.businessName.trim().length < 2) e.businessName = 'Enter your business name.';
  if (v.line1.trim().length < 3) e.line1 = 'Enter the shop or building and street.';
  if (v.city.trim().length < 2) e.city = 'Enter the city.';
  if (v.state.trim().length < 2) e.state = 'Enter the state.';
  if (!PINCODE.test(v.pincode)) e.pincode = 'Enter the 6-digit PIN code.';
  if (v.gstin && !GSTIN.test(v.gstin)) e.gstin = 'A GSTIN has 15 characters, like 36ABCDE1234F1Z5. Or leave it empty.';
  return e;
}

function Form({ initial, onSaved }: { initial: KycBusiness | null; onSaved: () => void }) {
  const token = useAuthToken();
  const [values, setValues] = useState(() => fromBusiness(initial));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (field: Field) => (text: string) => {
    const value = field === 'gstin' ? text.toUpperCase().replace(/\s/g, '').slice(0, 15) : field === 'pincode' ? digitsOnly(text, 6) : text;
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((x) => ({ ...x, [field]: undefined }));
  };

  const save = async () => {
    const found = check(values);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) return Feedback.error();
    setSaving(true);
    try {
      await KycService.saveVendor(token, {
        businessName: values.businessName.trim(),
        address: { line1: values.line1.trim(), line2: values.line2.trim() || null, city: values.city.trim(), state: values.state.trim(), pincode: values.pincode },
        gstin: values.gstin || null,
      });
      Feedback.success();
      onSaved();
    } catch (err) {
      Feedback.error();
      const gst = err instanceof ApiError ? err.detailFor('gstin') : undefined;
      if (gst) setErrors({ gstin: gst.message });
      else setFailure(err instanceof ApiError && err.kind !== 'network' ? err.message : 'Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const field = (name: Field, label: string, extra: Partial<React.ComponentProps<typeof InputField>> = {}) => (
    <InputField label={label} value={values[name]} onChangeText={set(name)} error={errors[name]} {...extra} />
  );

  return (
    <>
      {field('businessName', 'Business name', { autoComplete: 'organization', maxLength: 80, autoCapitalize: 'words' })}
      {field('line1', 'Address', { placeholder: 'Shop number, building, street', maxLength: 120, autoComplete: 'street-address' })}
      {field('line2', 'Area or landmark (optional)', { maxLength: 120 })}
      <View style={styles.row}>
        <View style={styles.flex}>{field('city', 'City', { maxLength: 60, autoCapitalize: 'words' })}</View>
        <View style={styles.flex}>{field('state', 'State', { maxLength: 60, autoCapitalize: 'words' })}</View>
      </View>
      {field('pincode', 'PIN code', { keyboardType: 'number-pad', maxLength: 6, autoComplete: 'postal-code' })}
      {field('gstin', 'GSTIN (optional)', { autoCapitalize: 'characters', autoCorrect: false, maxLength: 15 })}
      {failure ? <ErrorBanner message={failure} onRetry={save} /> : null}
      <View style={styles.footer}>
        <PrimaryButton label="Save details" loading={saving} onPress={save} />
      </View>
    </>
  );
}

/** Business name and address for vendor verification. Saving checks the GSTIN; sending for review is on the Verification screen. */
export function VendorDetailsScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => KycService.getOverview(token));

  return (
    <ScreenContainer title="Business details">
      <Text style={styles.intro}>We use these to verify your business. Customers see your business name on your posts and store.</Text>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={5}>
        {data ? <Form initial={data.vendor.business} onSaved={() => router.back()} /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: { ...Typography.body, color: Brand.textMuted, marginBottom: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  footer: { paddingTop: Spacing.two },
});
