import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { BusinessService } from '@/services/business-service';
import type { Business, BusinessUpdate } from '@/types/business';

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PINCODE = /^[1-9][0-9]{5}$/;
const PHONE = /^[6-9][0-9]{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADDRESS_FIELDS = ['line1', 'line2', 'city', 'state', 'pincode'] as const;

type Field = 'name' | 'description' | 'phone' | 'email' | (typeof ADDRESS_FIELDS)[number] | 'gstin';
type Values = Record<Field, string>;

const fromBusiness = (b: Business): Values => ({
  name: b.name,
  description: b.description ?? '',
  phone: b.phone ?? '',
  email: b.email ?? '',
  line1: b.address?.line1 ?? '',
  line2: b.address?.line2 ?? '',
  city: b.address?.city ?? '',
  state: b.address?.state ?? '',
  pincode: b.address?.pincode ?? '',
  gstin: b.gstin?.number ?? '',
});

/** An address is all or nothing, so typing only a city asks for the rest. */
const hasAddress = (v: Values) => ADDRESS_FIELDS.some((f) => v[f].trim());

function check(v: Values): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  if (v.name.trim().length < 2) e.name = 'Enter the business name.';
  if (v.description.trim() && v.description.trim().length < 20) e.description = 'Write at least 20 characters so customers know what you offer.';
  if (v.phone && !PHONE.test(v.phone)) e.phone = 'Enter a 10-digit mobile number.';
  if (v.email.trim() && !EMAIL.test(v.email.trim())) e.email = 'Enter an email like name@example.com, or leave it empty.';
  if (hasAddress(v)) {
    if (v.line1.trim().length < 3) e.line1 = 'Enter the shop or building and street.';
    if (v.city.trim().length < 2) e.city = 'Enter the city.';
    if (v.state.trim().length < 2) e.state = 'Enter the state.';
    if (!PINCODE.test(v.pincode)) e.pincode = 'Enter the 6-digit PIN code.';
  }
  if (v.gstin && !GSTIN.test(v.gstin)) e.gstin = 'A GSTIN has 15 characters, like 36ABCDE1234F1Z5. Or leave it empty.';
  return e;
}

const toUpdate = (v: Values): BusinessUpdate => ({
  name: v.name.trim(),
  description: v.description.trim() || null,
  phone: v.phone || null,
  email: v.email.trim() || null,
  address: hasAddress(v)
    ? { line1: v.line1.trim(), line2: v.line2.trim() || null, city: v.city.trim(), state: v.state.trim(), pincode: v.pincode }
    : null,
  gstin: v.gstin || null,
});

function Form({ business, onSaved }: { business: Business; onSaved: () => void }) {
  const token = useAuthToken();
  const [values, setValues] = useState(() => fromBusiness(business));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (field: Field) => (text: string) => {
    const value =
      field === 'gstin' ? text.toUpperCase().replace(/\s/g, '').slice(0, 15) : field === 'pincode' ? digitsOnly(text, 6) : field === 'phone' ? digitsOnly(text, 10) : text;
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
      await BusinessService.update(token, business.id, toUpdate(values));
      Feedback.success();
      onSaved();
    } catch (err) {
      Feedback.error();
      const gst = err instanceof ApiError ? err.detailFor('gstin') : undefined;
      if (gst) setErrors({ gstin: gst.message });
      else if (err instanceof ApiError && err.code === 'BUSINESS_INCOMPLETE') setFailure('A live business needs a description, phone number and address.');
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
      {field('name', 'Business name', { autoComplete: 'organization', maxLength: 80, autoCapitalize: 'words' })}
      {field('description', 'About', {
        placeholder: 'What you offer, in a few lines',
        multiline: true,
        maxLength: 1000,
        showCount: true,
      })}
      {field('phone', 'Phone', { keyboardType: 'phone-pad', maxLength: 10, autoComplete: 'tel' })}
      {field('email', 'Email (optional)', { keyboardType: 'email-address', autoCapitalize: 'none', autoComplete: 'email', maxLength: 120 })}
      <Text style={styles.section}>Address</Text>
      {field('line1', 'Shop, building and street', { maxLength: 120, autoComplete: 'street-address' })}
      {field('line2', 'Area or landmark (optional)', { maxLength: 120 })}
      <View style={styles.row}>
        <View style={styles.flex}>{field('city', 'City', { maxLength: 60, autoCapitalize: 'words' })}</View>
        <View style={styles.flex}>{field('state', 'State', { maxLength: 60, autoCapitalize: 'words' })}</View>
      </View>
      {field('pincode', 'PIN code', { keyboardType: 'number-pad', maxLength: 6, autoComplete: 'postal-code' })}
      {field('gstin', 'GSTIN (optional)', { autoCapitalize: 'characters', autoCorrect: false, maxLength: 15 })}
      <Text style={styles.hint}>We check a GSTIN with the GST network when you save.</Text>
      {failure ? <ErrorBanner message={failure} onRetry={save} /> : null}
      <View style={styles.footer}>
        <PrimaryButton label="Save details" loading={saving} onPress={save} />
      </View>
    </>
  );
}

/** Everything customers read about a business. */
export function BusinessDetailsScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => BusinessService.get(token, id), id);

  return (
    <ScreenContainer title="Business details">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={6}>
        {data ? <Form business={data} onSaved={() => router.back()} /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three },
  hint: { ...Typography.caption, color: Brand.textFaint },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  footer: { paddingTop: Spacing.two },
});
