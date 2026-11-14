import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SelectField } from '@/components/ui/SelectField';
import { Stepper } from '@/components/ui/Stepper';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useBusinessCatalog } from '@/features/vendor/hooks/use-business-catalog';
import { paiseOf, rupeeInput, rupeesText, titleCase } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { shopDesk } from '@/features/vendor/lib/shop-desk';
import type { Business, BusinessCatalog, PodProduct } from '@/types/business';

const OTHER_CITY = 'Other city';
const NOTES_MAX = 1000;

/** The server's reasons, such as "Set a price for every product you offer", rather than its one-line summary. */
function failureOf(err: unknown) {
  if (!(err instanceof ApiError) || err.kind === 'network') return 'Could not save. Check your connection and try again.';
  const reasons = err.details.map((d) => d.message).filter(Boolean);
  return err.code === 'BUSINESS_INCOMPLETE' && reasons.length ? `${reasons.join('. ')}.` : err.message;
}

function Form({ id, team, business, catalog, onSaved }: { id: string; team: boolean; business: Business; catalog: BusinessCatalog; onSaved: (saved: Business) => void }) {
  const token = useAuthToken();
  const pod = business.pod!;
  const home = business.location?.city.toLowerCase();
  const [products, setProducts] = useState<PodProduct[]>(pod.products);
  const [serveAll, setServeAll] = useState(pod.serveAll);
  const [cities, setCities] = useState<string[]>(() => (pod.cities.length || pod.serveAll || !home ? pod.cities : [home]));
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const [turnaround, setTurnaround] = useState(pod.turnaroundDays);
  const [minOrder, setMinOrder] = useState(pod.minOrder ? rupeesText(pod.minOrder) : '');
  const [notes, setNotes] = useState(pod.notes ?? '');
  const [feeBase, setFeeBase] = useState(pod.deliveryFee.base ? rupeesText(pod.deliveryFee.base) : '');
  const [feeKm, setFeeKm] = useState(pod.deliveryFee.includedKm);
  const [feePerKm, setFeePerKm] = useState(pod.deliveryFee.perKm ? rupeesText(pod.deliveryFee.perKm) : '');
  const [problem, setProblem] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const feeMax = catalog.limits.deliveryFee;
  const base = paiseOf(feeBase) ?? 0;
  const perKm = paiseOf(feePerKm) ?? 0;
  const stateCities = catalog.states.find((s) => s.name === business.location?.state)?.cities ?? [];
  const suggestions = stateCities.filter((c) => !cities.includes(c.toLowerCase()));
  const limit = catalog.limits.cities;

  const toggle = (product: PodProduct, on: boolean) => {
    setProducts((list) => (on ? [...list, product] : list.filter((p) => p !== product)));
    setProblem(null);
  };

  const addCity = (city: string) => {
    const key = city.trim().toLowerCase();
    if (key.length < 2 || cities.includes(key) || cities.length >= limit) return;
    Feedback.select();
    setCities((list) => [...list, key]);
    setProblem(null);
  };

  const save = async () => {
    setFailure(null);
    if (!products.length) return (setProblem('Choose at least one product.'), Feedback.error());
    if (!serveAll && !cities.length) return (setProblem('Add a city you deliver to, or turn on every city.'), Feedback.error());
    if (base > feeMax.base || perKm > feeMax.perKm) {
      return (setProblem(`Ruxstar allows a delivery charge of up to ₹${rupeesText(feeMax.base)}, plus ₹${rupeesText(feeMax.perKm)} a km.`), Feedback.error());
    }
    setSaving(true);
    try {
      const saved = await shopDesk(team).service.updatePod(token, id, {
        products,
        serveAll,
        cities,
        turnaroundDays: turnaround,
        minOrder: paiseOf(minOrder) ?? 0,
        notes: notes.trim() || null,
        deliveryFee: { base, includedKm: perKm ? feeKm : 0, perKm },
      });
      Feedback.success();
      onSaved(saved);
    } catch (err) {
      Feedback.error();
      setFailure(failureOf(err));
    } finally {
      setSaving(false);
    }
  };

  const dropped = pod.products.filter((p) => !products.includes(p) && pod.prices.some((x) => x.product === p));

  return (
    <>
      <Text style={styles.section}>What you print</Text>
      <View style={styles.card}>
        {catalog.podProducts.map((info) => (
          <ToggleRow
            key={info.id}
            title={info.label}
            subtitle={info.description}
            value={products.includes(info.id)}
            onValueChange={(on) => toggle(info.id, on)}
          />
        ))}
      </View>
      {dropped.length ? <Text style={styles.warn}>Prices you set for products you turn off are removed when you save.</Text> : null}

      <Text style={styles.section}>Where you deliver</Text>
      <View style={styles.card}>
        <ToggleRow title="Every city" subtitle="Ship anywhere in India" value={serveAll} onValueChange={setServeAll} />
      </View>
      {!serveAll ? (
        <>
          <View style={styles.chips}>
            {cities.map((city) => (
              <Pressable
                key={city}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${titleCase(city)}`}
                onPress={() => {
                  Feedback.select();
                  setCities((list) => list.filter((c) => c !== city));
                }}
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              >
                <Text style={styles.chipText}>{titleCase(city)}</Text>
                <Ionicons name="close" size={14} color={Brand.textMuted} />
              </Pressable>
            ))}
          </View>
          {cities.length < limit ? (
            <SelectField
              label="Add a city"
              value=""
              options={[...suggestions, OTHER_CITY]}
              onChange={(city) => (city === OTHER_CITY ? setTyping(true) : addCity(city))}
              placeholder={business.location ? `Cities in ${business.location.state}, or another` : 'Choose a city'}
            />
          ) : (
            <Text style={styles.hint}>{`You can deliver to up to ${limit} cities. Turn on every city to ship anywhere.`}</Text>
          )}
          {typing ? (
            <InputField
              label="Other city"
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="words"
              maxLength={60}
              returnKeyType="done"
              onSubmitEditing={() => {
                addCity(typed);
                setTyped('');
                setTyping(false);
              }}
              accessory={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add city"
                  hitSlop={8}
                  onPress={() => {
                    addCity(typed);
                    setTyped('');
                    setTyping(false);
                  }}
                >
                  <Text style={styles.add}>Add</Text>
                </Pressable>
              }
            />
          ) : null}
        </>
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
        hint={`Up to ₹${rupeesText(feeMax.perKm)} a km. Customers then share their location at checkout.`}
      />
      {perKm ? (
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.label}>Km in the base charge</Text>
            <Text style={styles.hint}>
              {feeKm === 0 ? `₹${rupeesText(perKm)} for every km` : `₹${rupeesText(perKm)} a km after the first ${feeKm} km`}
            </Text>
          </View>
          <Stepper value={feeKm} min={0} max={50} onChange={setFeeKm} label="Km the base charge covers" />
        </View>
      ) : null}

      <Text style={styles.section}>Orders</Text>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.label}>Ready in (days)</Text>
          <Text style={styles.hint}>{turnaround === 0 ? 'Same day' : `${turnaround} day${turnaround === 1 ? '' : 's'} after the order`}</Text>
        </View>
        <Stepper value={turnaround} min={0} max={catalog.limits.turnaroundDays} onChange={setTurnaround} label="Days to get an order ready" />
      </View>
      <InputField
        label="Minimum order (₹, optional)"
        value={minOrder}
        onChangeText={(t) => setMinOrder(rupeeInput(t))}
        keyboardType="decimal-pad"
        placeholder="0"
        hint="Orders below this can't be placed."
      />
      <InputField
        label="Notes for customers (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="File formats you accept, pickup timings…"
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

/** Print on demand setup: which products, where it delivers, and how fast. `team` opens it from Work, by place id. */
export function PodProductsScreen({ team = false }: { team?: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const business = useAsyncResource(() => shopDesk(team).service.get(token, id), id);
  const catalog = useBusinessCatalog();
  const desk = shopDesk(team);
  // A product just switched on has no price yet, and customers can't see it until it has one.
  const saved = (next: Business) => {
    const before = business.data?.pod?.products ?? [];
    const added = next.pod?.unpriced.some((p) => !before.includes(p));
    if (added) router.replace({ pathname: desk.routes.prices, params: { id } });
    else router.back();
  };
  const retry = () => {
    if (business.error) business.reload();
    if (catalog.error) catalog.reload();
  };

  return (
    <ScreenContainer title="Products & delivery">
      <AsyncBoundary
        loading={business.loading || catalog.loading}
        error={business.error ?? catalog.error}
        hasData={!!business.data?.pod && !!catalog.data}
        onRetry={retry}
        skeletonRows={8}
      >
        {business.data?.pod && catalog.data ? <Form id={id} team={team} business={business.data} catalog={catalog.data} onSaved={saved} /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three },
  card: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.surface, paddingHorizontal: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    height: 34,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  chipText: { ...Typography.caption, fontSize: 14, color: Brand.text },
  pressed: { opacity: 0.7 },
  add: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: 2 },
  label: { ...Typography.body, color: Brand.text },
  hint: { ...Typography.caption, color: Brand.textFaint },
  warn: { ...Typography.caption, color: Brand.warning },
  problem: { ...Typography.caption, fontSize: 14, color: Brand.error },
});
