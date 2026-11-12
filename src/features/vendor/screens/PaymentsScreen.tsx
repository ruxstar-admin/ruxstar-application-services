import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { digitsOnly, isValidAccountNumber, isValidIfsc } from '@/features/kyc/lib/validators';
import { VendorTabScreen } from '@/features/vendor/components/VendorTabScreen';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { formatRupees } from '@/lib/money';
import { timeAgo } from '@/lib/time';
import { BusinessService } from '@/services/business-service';
import type { PayoutMethod } from '@/types/business';

const KINDS = [
  { key: 'bank', label: 'Bank account' },
  { key: 'upi', label: 'UPI ID' },
] as const;
const VPA = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/;
const rupees = (paise: number) => formatRupees(paise / 100);

type Field = 'accountNumber' | 'confirm' | 'ifsc' | 'vpa';

function MethodForm({ onSaved, onCancel }: { onSaved: (method: PayoutMethod) => void; onCancel?: () => void }) {
  const token = useAuthToken();
  const [kind, setKind] = useState<(typeof KINDS)[number]['key']>('bank');
  const [values, setValues] = useState<Record<Field, string>>({ accountNumber: '', confirm: '', ifsc: '', vpa: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (field: Field) => (text: string) => {
    const value = field === 'ifsc' ? text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) : field === 'vpa' ? text.trim() : digitsOnly(text, 18);
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((x) => ({ ...x, [field]: undefined }));
  };

  const save = async () => {
    const found: Partial<Record<Field, string>> = {};
    if (kind === 'bank') {
      if (!isValidAccountNumber(values.accountNumber)) found.accountNumber = 'Account numbers have 9 to 18 digits.';
      else if (values.confirm !== values.accountNumber) found.confirm = 'The two numbers do not match.';
      if (!isValidIfsc(values.ifsc)) found.ifsc = 'An IFSC has 11 characters, like YESB0000262.';
    } else if (!VPA.test(values.vpa)) found.vpa = 'A UPI ID looks like name@okhdfc.';
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) return Feedback.error();
    setSaving(true);
    try {
      const saved = await BusinessService.setPayoutMethod(
        token,
        kind === 'bank' ? { kind, accountNumber: values.accountNumber, ifsc: values.ifsc } : { kind, vpa: values.vpa },
      );
      Feedback.success();
      if (saved) onSaved(saved);
    } catch (err) {
      Feedback.error();
      const detail = err instanceof ApiError ? (err.detailFor('accountNumber') ?? err.detailFor('vpa')) : undefined;
      if (detail) setErrors({ [kind === 'bank' ? 'accountNumber' : 'vpa']: detail.message });
      else setFailure(err instanceof ApiError && err.kind !== 'network' ? err.message : 'Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      <SegmentedTabs options={KINDS} value={kind} onChange={setKind} />
      {kind === 'bank' ? (
        <>
          <InputField
            label="Account number"
            value={values.accountNumber}
            onChangeText={set('accountNumber')}
            keyboardType="number-pad"
            maxLength={18}
            secureTextEntry
            error={errors.accountNumber}
          />
          <InputField label="Account number again" value={values.confirm} onChangeText={set('confirm')} keyboardType="number-pad" maxLength={18} error={errors.confirm} />
          <InputField
            label="IFSC"
            value={values.ifsc}
            onChangeText={set('ifsc')}
            placeholder="YESB0000262"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={11}
            error={errors.ifsc}
          />
        </>
      ) : (
        <InputField
          label="UPI ID"
          value={values.vpa}
          onChangeText={set('vpa')}
          placeholder="name@okhdfc"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          error={errors.vpa}
        />
      )}
      <Text style={styles.hint}>
        {kind === 'bank'
          ? 'We check the account with your bank. It must be in the name on your Aadhaar. Only the last 4 digits are shown again.'
          : 'We send ₹1 to check it. It must be in the name on your Aadhaar.'}
      </Text>
      {failure ? <ErrorBanner message={failure} /> : null}
      <PrimaryButton label="Check and save" loading={saving} onPress={save} />
      {onCancel ? <TextLink muted label="Cancel" onPress={onCancel} /> : null}
    </View>
  );
}

/** Balance, where the vendor is paid, and their payouts. */
export function PaymentsScreen() {
  const token = useAuthToken();
  const { data, loading, error, reload, setData } = useAsyncResource(() => BusinessService.payments(token));
  useRefetchOnFocus(reload);
  const [changing, setChanging] = useState(false);

  return (
    <VendorTabScreen title="Payments" onRefresh={reload}>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {data ? (
          <>
            <View style={styles.card}>
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{rupees(data.balance.available)}</Text>
                  <Text style={styles.muted}>Available</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{rupees(data.balance.pending)}</Text>
                  <Text style={styles.muted}>Pending</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{rupees(data.balance.paidOut)}</Text>
                  <Text style={styles.muted}>Paid out</Text>
                </View>
              </View>
              <Text style={styles.hint}>Your balance fills in once your businesses take orders and bookings.</Text>
            </View>

            <Text style={styles.section}>Where you get paid</Text>
            {data.payoutMethod && !changing ? (
              <View style={styles.card}>
                <View style={styles.methodHead}>
                  <Ionicons name={data.payoutMethod.kind === 'bank' ? 'business-outline' : 'phone-portrait-outline'} size={22} color={Brand.text} />
                  <Text style={styles.methodLabel}>{data.payoutMethod.label}</Text>
                  <Badge label="Checked" tone="success" />
                </View>
                {data.payoutMethod.holderName ? <Text style={styles.muted}>In the name of {data.payoutMethod.holderName}</Text> : null}
                {data.payoutMethod.ifsc ? <Text style={styles.muted}>IFSC {data.payoutMethod.ifsc}</Text> : null}
                <TextLink label="Change" onPress={() => setChanging(true)} />
              </View>
            ) : (
              <MethodForm
                onCancel={data.payoutMethod ? () => setChanging(false) : undefined}
                onSaved={(payoutMethod) => {
                  setData({ ...data, payoutMethod });
                  setChanging(false);
                }}
              />
            )}

            <Text style={styles.section}>Payouts</Text>
            {data.payouts.length ? (
              data.payouts.map((p) => (
                <View key={p.id} style={styles.payout}>
                  <View style={styles.flex}>
                    <Text style={styles.payoutAmount}>{rupees(p.amount)}</Text>
                    <Text style={styles.muted}>
                      {p.to} · {timeAgo(p.paidAt ?? p.createdAt)}
                    </Text>
                  </View>
                  <Badge label={p.status === 'paid' ? 'Paid' : p.status === 'pending' ? 'On the way' : 'Failed'} tone={p.status === 'paid' ? 'success' : p.status === 'pending' ? 'warning' : 'error'} />
                </View>
              ))
            ) : (
              <Text style={styles.muted}>No payouts yet.</Text>
            )}
          </>
        ) : null}
      </AsyncBoundary>
    </VendorTabScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { gap: 2 },
  statValue: { ...Typography.heading, color: Brand.text },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  hint: { ...Typography.caption, color: Brand.textFaint },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three },
  methodHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  methodLabel: { ...Typography.bodyStrong, color: Brand.text, flex: 1 },
  form: { gap: Spacing.two },
  payout: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  payoutAmount: { ...Typography.bodyStrong, color: Brand.text },
});
