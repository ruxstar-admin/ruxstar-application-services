import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { AdminService } from '@/services/admin-service';
import type { ModulePatch, ModuleSettings } from '@/types/admin';
import { useCan } from '../access';
import { Card, Fact, Facts, consoleStyles, errorText } from '../components/parts';
import { MODULE_LABEL } from '../labels';

const percentOf = (bps: number) => String(bps / 100);
const rupeesOf = (paise: number) => String(paise / 100);
const MAX_FEE_RUPEES = 500;
const MAX_PAYOUT_FEE_RUPEES = 100;
const MAX_MIN_PAYOUT_RUPEES = 100_000;
const paiseOf = (rupees: string) => (rupees.trim() === '' ? NaN : Math.round(Number(rupees) * 100));

/** The fee taken from each withdrawal and the least that can be withdrawn: vendors' on the ledger, Ruxstar partners' on delivery. */
function Withdrawals({ m, onSaved }: { m: ModuleSettings & { payouts: NonNullable<ModuleSettings['payouts']> }; onSaved: (m: ModuleSettings) => void }) {
  const token = useAuthToken();
  const who = m.module === 'delivery' ? 'partner' : 'vendor';
  const canManage = useCan('modules.manage');
  const [fee, setFee] = useState(rupeesOf(m.payouts.fee));
  const [minimum, setMinimum] = useState(rupeesOf(m.payouts.minimum));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());

  const feePaise = paiseOf(fee);
  const minPaise = paiseOf(minimum);
  const feeError = Number.isFinite(feePaise) && feePaise >= 0 && feePaise <= MAX_PAYOUT_FEE_RUPEES * 100 ? undefined : `Enter an amount from 0 to ${MAX_PAYOUT_FEE_RUPEES}`;
  const minError = !Number.isFinite(minPaise) || minPaise < 100 || minPaise > MAX_MIN_PAYOUT_RUPEES * 100
    ? `Enter an amount from 1 to ${MAX_MIN_PAYOUT_RUPEES.toLocaleString('en-IN')}`
    : !feeError && minPaise < feePaise + 100
      ? 'At least ₹1 more than the fee'
      : undefined;
  const changed = feePaise !== m.payouts.fee || minPaise !== m.payouts.minimum;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const done = await AdminService.updateModule(token, m.module, { payoutFee: feePaise, minPayout: minPaise }, key.current);
      key.current = newIdempotencyKey();
      Feedback.success();
      onSaved(done);
      if (done.payouts) {
        setFee(rupeesOf(done.payouts.fee));
        setMinimum(rupeesOf(done.payouts.minimum));
      }
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (!canManage) {
    return (
      <Facts>
        <Fact label={`Withdrawal fee (${who}s)`} value={m.payouts.fee ? `₹${rupeesOf(m.payouts.fee)}` : 'None'} />
        <Fact label={`Minimum withdrawal (${who}s)`} value={`₹${rupeesOf(m.payouts.minimum)}`} />
      </Facts>
    );
  }
  return (
    <>
      <InputField
        label="Fee taken from each withdrawal (₹)"
        keyboardType="decimal-pad"
        value={fee}
        onChangeText={(value) => setFee(value.replace(/[^\d.]/g, ''))}
        hint={`Covers Cashfree's charge. The ${who} gets the rest. 0 for none.`}
        error={feeError}
      />
      <InputField
        label={`Least a ${who} can withdraw (₹)`}
        keyboardType="decimal-pad"
        value={minimum}
        onChangeText={(value) => setMinimum(value.replace(/[^\d.]/g, ''))}
        error={minError}
      />
      <PrimaryButton label="Save withdrawal settings" variant="outline" onPress={save} loading={busy} disabled={!!feeError || !!minError || !changed} />
      {error ? <ErrorBanner message={error} /> : null}
    </>
  );
}

const MAX_RATE_RUPEES = 1000;
const wholeOf = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text) : NaN);
const rupeeError = (paise: number) => (Number.isFinite(paise) && paise >= 0 && paise <= MAX_RATE_RUPEES * 100 ? undefined : `Enter an amount from 0 to ${MAX_RATE_RUPEES}`);

/** Delivery only: what a Ruxstar partner is paid for a trip, the most a shop can charge, and how long an offer waits. */
function DeliveryRates({ m, onSaved }: { m: ModuleSettings & { delivery: NonNullable<ModuleSettings['delivery']> }; onSaved: (m: ModuleSettings) => void }) {
  const token = useAuthToken();
  const canManage = useCan('modules.manage');
  const d = m.delivery;
  const [riderBase, setRiderBase] = useState(rupeesOf(d.riderRate.base));
  const [riderKm, setRiderKm] = useState(String(d.riderRate.includedKm));
  const [riderPerKm, setRiderPerKm] = useState(rupeesOf(d.riderRate.perKm));
  const [shopBase, setShopBase] = useState(rupeesOf(d.shopFeeMax.base));
  const [shopPerKm, setShopPerKm] = useState(rupeesOf(d.shopFeeMax.perKm));
  const [minutes, setMinutes] = useState(String(d.offerMinutes));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());

  const riderRate = { base: paiseOf(riderBase), includedKm: wholeOf(riderKm), perKm: paiseOf(riderPerKm) };
  const shopFeeMax = { base: paiseOf(shopBase), perKm: paiseOf(shopPerKm) };
  const offerMinutes = wholeOf(minutes);
  const errors = {
    riderBase: rupeeError(riderRate.base),
    riderKm: riderRate.includedKm >= 0 && riderRate.includedKm <= 50 ? undefined : 'Enter whole km from 0 to 50',
    riderPerKm: rupeeError(riderRate.perKm),
    shopBase: rupeeError(shopFeeMax.base),
    shopPerKm: rupeeError(shopFeeMax.perKm),
    minutes: offerMinutes >= 1 && offerMinutes <= 120 ? undefined : 'Enter whole minutes from 1 to 120',
  };
  const invalid = Object.values(errors).some(Boolean);
  const changed =
    riderRate.base !== d.riderRate.base ||
    riderRate.includedKm !== d.riderRate.includedKm ||
    riderRate.perKm !== d.riderRate.perKm ||
    shopFeeMax.base !== d.shopFeeMax.base ||
    shopFeeMax.perKm !== d.shopFeeMax.perKm ||
    offerMinutes !== d.offerMinutes;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const done = await AdminService.updateModule(token, m.module, { riderRate, shopFeeMax, offerMinutes }, key.current);
      key.current = newIdempotencyKey();
      Feedback.success();
      onSaved(done);
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (!canManage) {
    return (
      <Facts>
        <Fact label="Partner pay" value={`₹${rupeesOf(d.riderRate.base)} for ${d.riderRate.includedKm} km, then ₹${rupeesOf(d.riderRate.perKm)} a km`} />
        <Fact label="Most a shop charges" value={`₹${rupeesOf(d.shopFeeMax.base)}, plus ₹${rupeesOf(d.shopFeeMax.perKm)} a km`} />
        <Fact label="Offer waits" value={`${d.offerMinutes} min`} />
      </Facts>
    );
  }
  const rupees = (set: (v: string) => void) => (value: string) => set(value.replace(/[^\d.]/g, ''));
  const whole = (set: (v: string) => void) => (value: string) => set(value.replace(/\D/g, ''));
  return (
    <>
      <Text style={styles.group}>Ruxstar partner pay, per trip</Text>
      <Text style={consoleStyles.muted}>Paid to the partner out of the shop&apos;s share. The partner keeps all of it.</Text>
      <View style={styles.pair}>
        <View style={styles.flex}>
          <InputField label="Base (₹)" keyboardType="decimal-pad" value={riderBase} onChangeText={rupees(setRiderBase)} error={errors.riderBase} />
        </View>
        <View style={styles.flex}>
          <InputField label="Covers (km)" keyboardType="number-pad" value={riderKm} onChangeText={whole(setRiderKm)} error={errors.riderKm} />
        </View>
      </View>
      <InputField label="Each km after (₹)" keyboardType="decimal-pad" value={riderPerKm} onChangeText={rupees(setRiderPerKm)} error={errors.riderPerKm} />
      <Text style={styles.group}>Most a shop can charge customers</Text>
      <View style={styles.pair}>
        <View style={styles.flex}>
          <InputField label="Base (₹)" keyboardType="decimal-pad" value={shopBase} onChangeText={rupees(setShopBase)} error={errors.shopBase} />
        </View>
        <View style={styles.flex}>
          <InputField label="Per km (₹)" keyboardType="decimal-pad" value={shopPerKm} onChangeText={rupees(setShopPerKm)} error={errors.shopPerKm} />
        </View>
      </View>
      <InputField
        label="Offer waits (minutes)"
        keyboardType="number-pad"
        value={minutes}
        onChangeText={whole(setMinutes)}
        hint="If no partner accepts by then, the offer is cancelled and the shop is told."
        error={errors.minutes}
      />
      <PrimaryButton label="Save delivery rates" variant="outline" onPress={save} loading={busy} disabled={invalid || !changed} />
      {error ? <ErrorBanner message={error} /> : null}
    </>
  );
}

function Module({ m, onSaved }: { m: ModuleSettings; onSaved: (m: ModuleSettings) => void }) {
  const token = useAuthToken();
  const canManage = useCan('modules.manage');
  const [busy, setBusy] = useState<keyof ModulePatch | null>(null);
  const [commission, setCommission] = useState(percentOf(m.commissionBps));
  const [fee, setFee] = useState(rupeesOf(m.platformFee));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const key = useRef(newIdempotencyKey());

  const bps = Math.round(Number(commission) * 100);
  const commissionValid = commission.trim() !== '' && Number.isFinite(bps) && bps >= 0 && bps <= 10000;
  const feePaise = Math.round(Number(fee) * 100);
  const feeValid = fee.trim() !== '' && Number.isFinite(feePaise) && feePaise >= 0 && feePaise <= MAX_FEE_RUPEES * 100;

  const save = async (patch: ModulePatch) => {
    if (busy) return;
    setBusy(Object.keys(patch)[0] as keyof ModulePatch);
    setError(null);
    setSaved(false);
    try {
      const done = await AdminService.updateModule(token, m.module, patch, key.current);
      key.current = newIdempotencyKey();
      Feedback.success();
      onSaved(done);
      setCommission(percentOf(done.commissionBps));
      setFee(rupeesOf(done.platformFee));
      setSaved(true);
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text style={styles.name}>{MODULE_LABEL[m.module]}</Text>
          <Text style={consoleStyles.muted}>{saved ? 'Saved just now' : `Changed ${timeAgo(m.updatedAt)}`}</Text>
        </View>
        <Badge label={m.live ? 'Live' : 'Off'} tone={m.live ? 'success' : 'neutral'} />
      </View>

      {canManage ? (
        <>
          <ToggleRow title="Live" subtitle="Off hides it everywhere, for everyone." value={m.live} onValueChange={(live) => save({ live })} />
          <ToggleRow title="New vendors can join" subtitle="Off keeps current vendors working but stops new ones joining." value={m.signupsOpen} onValueChange={(signupsOpen) => save({ signupsOpen })} />
          <ToggleRow title="Delivery" subtitle="Orders can be sent with a Ruxstar delivery partner." value={m.deliveryEnabled} onValueChange={(deliveryEnabled) => save({ deliveryEnabled })} />
          {m.gstinRequired !== null ? (
            <ToggleRow
              title="GSTIN needed to publish"
              subtitle="New businesses need a verified GSTIN. Live ones without one stay live."
              value={m.gstinRequired}
              onValueChange={(gstinRequired) => save({ gstinRequired })}
            />
          ) : null}
          <InputField
            label="Commission on each order (%)"
            keyboardType="decimal-pad"
            value={commission}
            onChangeText={(value) => setCommission(value.replace(/[^\d.]/g, ''))}
            error={commissionValid ? undefined : 'Enter a number from 0 to 100'}
          />
          <PrimaryButton
            label="Save commission"
            variant="outline"
            onPress={() => save({ commissionBps: bps })}
            loading={busy === 'commissionBps'}
            disabled={!commissionValid || bps === m.commissionBps || (busy !== null && busy !== 'commissionBps')}
          />
          <InputField
            label="Platform fee the customer pays on each order (₹)"
            keyboardType="decimal-pad"
            value={fee}
            onChangeText={(value) => setFee(value.replace(/[^\d.]/g, ''))}
            hint="Added to the customer's total and kept by Ruxstar. 0 for none."
            error={feeValid ? undefined : `Enter an amount from 0 to ${MAX_FEE_RUPEES}`}
          />
          <PrimaryButton
            label="Save platform fee"
            variant="outline"
            onPress={() => save({ platformFee: feePaise })}
            loading={busy === 'platformFee'}
            disabled={!feeValid || feePaise === m.platformFee || (busy !== null && busy !== 'platformFee')}
          />
        </>
      ) : (
        <Facts>
          <Fact label="New vendors can join" value={m.signupsOpen ? 'Yes' : 'No'} />
          <Fact label="Delivery" value={m.deliveryEnabled ? 'On' : 'Off'} />
          {m.gstinRequired !== null ? <Fact label="GSTIN to publish" value={m.gstinRequired ? 'Needed' : 'Optional'} /> : null}
          <Fact label="Commission" value={`${percentOf(m.commissionBps)}%`} />
          <Fact label="Platform fee" value={m.platformFee ? `₹${rupeesOf(m.platformFee)}` : 'None'} />
        </Facts>
      )}
      {error ? <ErrorBanner message={error} /> : null}
      {m.payouts ? <Withdrawals m={{ ...m, payouts: m.payouts }} onSaved={onSaved} /> : null}
      {m.delivery ? <DeliveryRates m={{ ...m, delivery: m.delivery }} onSaved={onSaved} /> : null}
    </Card>
  );
}

export function ModulesScreen() {
  const token = useAuthToken();
  const canManage = useCan('modules.manage');
  const { data: modules, loading, error, reload, setData } = useAsyncResource(() => AdminService.modules(token));

  return (
    <ScreenContainer title="Modules">
      <Text style={consoleStyles.muted}>
        {canManage ? 'Changes apply at once and are written to the audit log.' : 'You can see these settings. Ask an admin to change them.'}
      </Text>
      <AsyncBoundary loading={loading} error={error} hasData={!!modules} onRetry={reload}>
        {modules?.map((m) => (
          <Module key={m.module} m={m} onSaved={(done) => setData(modules.map((x) => (x.module === done.module ? done : x)))} />
        ))}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  name: { ...Typography.bodyStrong, color: Brand.text },
  group: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.two },
  pair: { flexDirection: 'row', gap: Spacing.two },
});
