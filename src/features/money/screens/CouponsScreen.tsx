import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { digitsOnly } from '@/features/kyc/lib/validators';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { formatRupees } from '@/lib/money';
import { MoneyService } from '@/services/money-service';

function NewCouponForm({ onCreated }: { onCreated: () => void }) {
  const token = useAuthToken();
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState('');
  const [cap, setCap] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = code.length >= 4 && Number(percent) >= 1 && Number(percent) <= 90 && Number(cap) >= 1;

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      await MoneyService.createCoupon(token, { code, percent: Number(percent), cap: Number(cap) });
      Feedback.success();
      onCreated();
    } catch (err) {
      Feedback.error();
      setError(err instanceof ApiError && err.kind === 'conflict' ? 'That code already exists.' : 'Check the code, percent (1 to 90) and cap.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Text style={styles.note}>You pay for this discount out of the sale, so your payout is lower when it is used.</Text>
      <InputField label="Code" value={code} onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))} autoCapitalize="characters" placeholder="e.g. FLEX10" error={error ?? undefined} />
      <InputField label="Percent off" value={percent} onChangeText={(v) => setPercent(digitsOnly(v, 2))} keyboardType="number-pad" />
      <InputField label="Maximum discount (₹)" value={cap} onChangeText={(v) => setCap(digitsOnly(v, 5))} keyboardType="number-pad" />
      <PrimaryButton label="Create coupon" onPress={create} disabled={!valid} loading={busy} />
    </>
  );
}

/** Your coupons. Vendor-funded: the discount comes out of your payout, unlike Ruxstar's own offers. */
export function CouponsScreen() {
  const token = useAuthToken();
  const { data, loading, error, reload, setData } = useAsyncResource(() => MoneyService.vendorCoupons(token));
  const [creating, setCreating] = useState(false);

  const toggle = async (code: string, active: boolean) => {
    if (!data) return;
    const previous = data;
    setData(data.map((c) => (c.code === code ? { ...c, active } : c)));
    try {
      await MoneyService.setCouponActive(token, code, active);
    } catch {
      Feedback.error();
      setData(previous);
    }
  };

  return (
    <ScreenContainer title="Coupons" footer={<PrimaryButton label="New coupon" onPress={() => setCreating(true)} />}>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload}>
        {data?.map((coupon) => (
          <View key={coupon.code}>
            <ToggleRow
              title={coupon.code}
              subtitle={`${coupon.percent}% off, up to ${formatRupees(coupon.cap)}${coupon.module ? '' : ' · all your modules'}`}
              value={coupon.active}
              onValueChange={(active) => toggle(coupon.code, active)}
            />
          </View>
        ))}
        {data?.length === 0 ? <EmptyState icon="pricetags-outline" title="No coupons yet" message="Create a code customers can apply at checkout." /> : null}
      </AsyncBoundary>

      <BottomSheet visible={creating} onClose={() => setCreating(false)} title="New coupon">
        <NewCouponForm
          onCreated={() => {
            setCreating(false);
            reload();
          }}
        />
      </BottomSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  note: { ...Typography.caption, color: Brand.textMuted, marginBottom: Spacing.two },
});
