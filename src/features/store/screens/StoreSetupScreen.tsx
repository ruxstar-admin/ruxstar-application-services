import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Stepper } from '@/components/ui/Stepper';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Notice } from '@/features/coaching/components/Parts';
import { errorText } from '@/features/events/lib/messages';
import { useBusinessCatalog } from '@/features/vendor/hooks/use-business-catalog';
import { paiseOf, rupeeInput, rupeesText } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { VendorStoreService } from '@/services/store-service';
import type { StoreSetupOne } from '@/types/store';
import { deliveryFeeText } from '../lib/store';

const MAX_RADIUS_KM = 50;
const NOTES_MAX = 1000;

function Form({ businessId, setup, feeMax, onSaved }: { businessId: string; setup: StoreSetupOne; feeMax: { base: number; perKm: number }; onSaved: () => void }) {
  const token = useAuthToken();
  const [delivery, setDelivery] = useState(setup.delivery);
  const [pickup, setPickup] = useState(setup.pickup);
  const [anywhere, setAnywhere] = useState(setup.radiusKm === null);
  const [radius, setRadius] = useState(setup.radiusKm ?? 5);
  const [feeBase, setFeeBase] = useState(setup.deliveryFee.base ? rupeesText(setup.deliveryFee.base) : '');
  const [feeKm, setFeeKm] = useState(setup.deliveryFee.includedKm);
  const [feePerKm, setFeePerKm] = useState(setup.deliveryFee.perKm ? rupeesText(setup.deliveryFee.perKm) : '');
  const [minOrder, setMinOrder] = useState(setup.minOrder ? rupeesText(setup.minOrder) : '');
  const [returns, setReturns] = useState(setup.returns);
  const [notes, setNotes] = useState(setup.notes ?? '');
  const [problem, setProblem] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const base = paiseOf(feeBase) ?? 0;
  const perKm = paiseOf(feePerKm) ?? 0;
  const fee = { base, includedKm: perKm ? feeKm : 0, perKm };

  const save = async () => {
    setFailure(null);
    if (!delivery && !pickup) return (setProblem('Offer delivery, pickup or both.'), Feedback.error());
    if (base > feeMax.base || perKm > feeMax.perKm) {
      return (setProblem(`Ruxstar allows a delivery charge of up to ₹${rupeesText(feeMax.base)}, plus ₹${rupeesText(feeMax.perKm)} a km.`), Feedback.error());
    }
    setProblem(null);
    setSaving(true);
    try {
      await VendorStoreService.saveSetup(token, businessId, {
        delivery,
        pickup,
        radiusKm: anywhere ? null : radius,
        deliveryFee: fee,
        minOrder: paiseOf(minOrder) ?? 0,
        returns,
        notes: notes.trim() || null,
      });
      Feedback.success();
      onSaved();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Text style={styles.section}>How customers get it</Text>
      <View style={styles.card}>
        <ToggleRow title="Delivery" subtitle="In your city, by your team, a Ruxstar partner or yourself" value={delivery} onValueChange={setDelivery} />
        <ToggleRow title="Pickup from the shop" subtitle="Customers collect it; no delivery fee" value={pickup} onValueChange={setPickup} />
      </View>

      {delivery ? (
        <>
          <Text style={styles.section}>Where you deliver</Text>
          <View style={styles.card}>
            <ToggleRow title="Anywhere in your city" subtitle="Turn off to deliver only nearby" value={anywhere} onValueChange={setAnywhere} />
          </View>
          {!anywhere ? (
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.label}>Up to (km by road)</Text>
                <Text style={styles.hint}>{`Addresses further than ${radius} km can’t order delivery.`}</Text>
              </View>
              <Stepper value={radius} min={1} max={MAX_RADIUS_KM} onChange={setRadius} label="Delivery distance in km" />
            </View>
          ) : null}

          <Text style={styles.section}>Delivery charge</Text>
          <InputField
            label="Base charge (₹)"
            value={feeBase}
            onChangeText={(t) => setFeeBase(rupeeInput(t))}
            keyboardType="decimal-pad"
            placeholder="0"
            hint={`Up to ₹${rupeesText(feeMax.base)}. Leave both at 0 for free delivery.`}
          />
          <InputField
            label="Per km (₹, optional)"
            value={feePerKm}
            onChangeText={(t) => setFeePerKm(rupeeInput(t))}
            keyboardType="decimal-pad"
            placeholder="0"
            hint={`Up to ₹${rupeesText(feeMax.perKm)} a km, by road from your shop.`}
          />
          {perKm ? (
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.label}>Km in the base charge</Text>
                <Text style={styles.hint}>{feeKm === 0 ? `₹${rupeesText(perKm)} for every km` : `₹${rupeesText(perKm)} a km after the first ${feeKm} km`}</Text>
              </View>
              <Stepper value={feeKm} min={0} max={50} onChange={setFeeKm} label="Km the base charge covers" />
            </View>
          ) : null}
          <Text style={styles.hint}>{`Customers see: ${deliveryFeeText(fee)}.`}</Text>
        </>
      ) : null}

      <Text style={styles.section}>Orders</Text>
      <InputField
        label="Minimum order (₹, optional)"
        value={minOrder}
        onChangeText={(t) => setMinOrder(rupeeInput(t))}
        keyboardType="decimal-pad"
        placeholder="0"
        hint="Carts below this can't check out."
      />

      <Text style={styles.section}>Returns</Text>
      <View style={styles.card}>
        <ToggleRow
          title={`Take returns within ${setup.returnDays} day${setup.returnDays === 1 ? '' : 's'}`}
          subtitle="Off shows “No returns” before customers pay"
          value={returns}
          onValueChange={setReturns}
        />
      </View>
      <Notice
        text={
          returns
            ? `Customers can ask within ${setup.returnDays} day${setup.returnDays === 1 ? '' : 's'} of delivery. If you sent the wrong item or it arrived damaged, you pay the trip back; otherwise the customer does.`
            : 'Customers are told “No returns” on every product and at checkout.'
        }
      />

      <InputField
        label="Notes for customers (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="Shop hours, pickup timings, alterations…"
        multiline
        maxLength={NOTES_MAX}
        showCount
      />

      {problem ? <Text style={styles.problem}>{problem}</Text> : null}
      {failure ? <ErrorBanner message={failure} onRetry={save} /> : null}
      <PrimaryButton label="Save" loading={saving} onPress={save} />
    </>
  );
}

/** A local shop's setup: delivery or pickup, how far it delivers and the charge, the minimum order, returns and notes. */
export function StoreSetupScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const setup = useAsyncResource(() => VendorStoreService.setup(token, id), id);
  const catalog = useBusinessCatalog();
  const retry = () => {
    if (setup.error) setup.reload();
    if (catalog.error) catalog.reload();
  };

  return (
    <ScreenContainer title="Delivery & returns">
      <AsyncBoundary loading={setup.loading || catalog.loading} error={setup.error ?? catalog.error} hasData={!!setup.data && !!catalog.data} onRetry={retry} skeletonRows={8}>
        {setup.data && catalog.data ? <Form businessId={id} setup={setup.data} feeMax={catalog.data.limits.deliveryFee} onSaved={() => router.back()} /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three },
  card: { borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: 2 },
  label: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  hint: { ...Typography.caption, color: Brand.textMuted },
  problem: { ...Typography.caption, color: Brand.error },
});
