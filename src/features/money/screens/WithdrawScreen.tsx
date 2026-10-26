import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { MIN_WITHDRAWAL } from '@/features/money/lib/rules';
import { digitsOnly } from '@/features/kyc/lib/validators';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { formatRupees } from '@/lib/money';
import { MoneyService } from '@/services/money-service';

const failureText = (err: unknown) => {
  if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.';
  if (err.kind === 'validation') return `Enter at least ${formatRupees(MIN_WITHDRAWAL)}.`;
  if (err.kind === 'conflict') return 'That is more than your withdrawable balance.';
  if (err.kind === 'forbidden') return 'Choose a verified account.';
  return 'Something went wrong. Please try again.';
};

/** Withdraw to a verified bank account or UPI id. Payouts only ever go to verified accounts. */
export function WithdrawScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const accounts = useAsyncResource(() => MoneyService.payoutAccounts(token));
  const balance = useAsyncResource(() => MoneyService.earnings(token));
  const [accountId, setAccountId] = useState<string>();
  const [amount, setAmount] = useState('');
  const [upi, setUpi] = useState('');
  const [addingUpi, setAddingUpi] = useState(false);
  const [upiError, setUpiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withdrawable = balance.data?.withdrawable ?? 0;
  const value = Number(amount);
  const selected = accountId ?? accounts.data?.[0]?.id;
  const valid = !!selected && value >= MIN_WITHDRAWAL && value <= withdrawable;

  const addUpi = async () => {
    setBusy(true);
    setUpiError(null);
    try {
      const account = await MoneyService.addUpi(token, upi);
      Feedback.success();
      setAccountId(account.id);
      setUpi('');
      setAddingUpi(false);
      accounts.reload();
    } catch (err) {
      Feedback.error();
      setUpiError(err instanceof ApiError && err.kind === 'conflict' ? 'That UPI id is already added.' : 'We could not verify that UPI id.');
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await MoneyService.withdraw(token, selected, value);
      Feedback.success();
      router.back();
    } catch (err) {
      Feedback.error();
      setError(failureText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer title="Withdraw" footer={<PrimaryButton label={valid ? `Withdraw ${formatRupees(value)}` : 'Withdraw'} onPress={withdraw} disabled={!valid} loading={busy && !addingUpi} />}>
      <Text style={styles.balance}>{`Withdrawable: ${formatRupees(withdrawable)}`}</Text>
      <InputField label="Amount (₹)" value={amount} onChangeText={(v) => { setAmount(digitsOnly(v, 7)); setError(null); }} keyboardType="number-pad" placeholder={`Minimum ${MIN_WITHDRAWAL}`} />
      <TextLink muted label="Withdraw everything" onPress={() => setAmount(String(withdrawable))} />

      <Text style={styles.section}>Pay out to</Text>
      <AsyncBoundary loading={accounts.loading} error={accounts.error} hasData={!!accounts.data} onRetry={accounts.reload} skeletonRows={2}>
        {accounts.data?.map((account) => (
          <ListRow
            key={account.id}
            icon={account.kind === 'bank' ? 'business-outline' : 'phone-portrait-outline'}
            title={account.label}
            subtitle={account.kind === 'bank' ? 'Bank account from your verification' : 'UPI'}
            onPress={() => setAccountId(account.id)}
            right={
              <View style={styles.accountRight}>
                {account.verified ? <Badge label="Verified" tone="success" /> : null}
                <Ionicons name={selected === account.id ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected === account.id ? Brand.primary : Brand.textFaint} />
              </View>
            }
          />
        ))}
      </AsyncBoundary>

      {addingUpi ? (
        <View style={styles.upiBox}>
          <InputField label="UPI id" value={upi} onChangeText={(v) => { setUpi(v.toLowerCase().replace(/\s/g, '')); setUpiError(null); }} autoCapitalize="none" placeholder="name@bank" error={upiError ?? undefined} />
          <PrimaryButton label="Verify and add" variant="outline" onPress={addUpi} disabled={upi.length < 5} loading={busy && addingUpi} />
        </View>
      ) : (
        <TextLink label="Add a UPI id" onPress={() => setAddingUpi(true)} />
      )}

      {error ? <ErrorBanner message={error} /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  balance: { ...Typography.bodyStrong, color: Brand.text },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four },
  accountRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  upiBox: { gap: Spacing.two },
});
