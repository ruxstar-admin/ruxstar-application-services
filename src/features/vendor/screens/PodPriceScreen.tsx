import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { digitsOnly } from '@/features/kyc/lib/validators';
import { useBusinessCatalog } from '@/features/vendor/hooks/use-business-catalog';
import { OPTION_LABELS, paiseOf, rupeeInput, rupeesText } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { shopDesk } from '@/features/vendor/lib/shop-desk';
import type { Business, PodExtra, PodProduct, PodProductInfo } from '@/types/business';

const extraKey = (option: string, value: string) => `${option}|${value}`;

interface TierRow {
  from: string;
  price: string;
}

type Errors = Partial<Record<'base' | 'page' | 'minQuantity' | 'turnaround' | 'tiers' | 'extras', string>>;

function Form({
  id,
  team,
  business,
  info,
  maxTiers,
  maxDays,
  onSaved,
}: {
  id: string;
  team: boolean;
  business: Business;
  info: PodProductInfo;
  maxTiers: number;
  maxDays: number;
  onSaved: () => void;
}) {
  const token = useAuthToken();
  const current = business.pod?.prices.find((p) => p.product === info.id);
  const perPage = info.pricing === 'per_page';
  const unit = perPage ? 'page' : 'unit';
  const [base, setBase] = useState(rupeesText(current?.basePrice));
  const [bw, setBw] = useState(rupeesText(current?.bw));
  const [color, setColor] = useState(rupeesText(current?.color));
  const [minQuantity, setMinQuantity] = useState(String(current?.minQuantity ?? info.minQuantity));
  const [turnaround, setTurnaround] = useState(current?.turnaroundDays == null ? '' : String(current.turnaroundDays));
  const [extras, setExtras] = useState<Record<string, string>>(() =>
    Object.fromEntries((current?.extras ?? []).map((e) => [extraKey(e.option, e.value), rupeesText(e.price)])),
  );
  const [tiers, setTiers] = useState<TierRow[]>(() => (current?.tiers ?? []).map((t) => ({ from: String(t.from), price: rupeesText(t.unitPrice) })));
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const check = (): Errors => {
    const e: Errors = {};
    if (perPage) {
      if (!(paiseOf(bw) ?? 0) && !(paiseOf(color) ?? 0)) e.page = 'Set a black & white or a colour price per page.';
    } else if (!(paiseOf(base) ?? 0)) e.base = `Enter the price for one ${unit}.`;
    const min = Number(minQuantity);
    if (!Number.isInteger(min) || min < 1) e.minQuantity = `Enter at least 1 ${unit}.`;
    if (turnaround && Number(turnaround) > maxDays) e.turnaround = `At most ${maxDays} days.`;
    const froms = tiers.map((t) => Number(t.from));
    if (tiers.some((t) => Number(t.from) < 2 || !(paiseOf(t.price) ?? 0))) e.tiers = `Each bulk price needs a quantity of 2 or more and a price per ${unit}.`;
    else if (new Set(froms).size !== froms.length) e.tiers = 'Each bulk price needs a different quantity.';
    return e;
  };

  const save = async () => {
    const found = check();
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) return Feedback.error();
    const extraList: PodExtra[] = Object.entries(extras).flatMap(([key, text]) => {
      const price = paiseOf(text);
      if (!price) return [];
      const [option, value] = key.split('|');
      return [{ option, value, price }];
    });
    setSaving(true);
    try {
      await shopDesk(team).service.updatePod(token, id, {
        prices: [
          {
            product: info.id,
            minQuantity: Number(minQuantity),
            turnaroundDays: turnaround ? Number(turnaround) : null,
            ...(perPage ? { bw: paiseOf(bw), color: paiseOf(color) } : { basePrice: paiseOf(base) }),
            extras: extraList,
            tiers: tiers.map((t) => ({ from: Number(t.from), unitPrice: paiseOf(t.price)! })),
          },
        ],
      });
      Feedback.success();
      onSaved();
    } catch (err) {
      Feedback.error();
      setFailure(err instanceof ApiError && err.kind !== 'network' ? err.message : 'Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const rupees = (label: string, value: string, set: (v: string) => void, error?: string, hint?: string) => (
    <InputField
      label={label}
      value={value}
      onChangeText={(t) => {
        set(rupeeInput(t));
        setErrors({});
      }}
      keyboardType="decimal-pad"
      placeholder="0"
      error={error}
      hint={hint}
    />
  );

  return (
    <>
      <Text style={styles.intro}>{info.description}</Text>

      {perPage ? (
        <>
          {rupees('Black & white, per page (₹)', bw, setBw, errors.page)}
          {rupees('Colour, per page (₹)', color, setColor, undefined, 'Leave one empty if you print only the other.')}
        </>
      ) : (
        rupees(`Price per ${unit} (₹)`, base, setBase, errors.base, 'Before any extras below.')
      )}

      <View style={styles.row}>
        <View style={styles.flex}>
          <InputField
            label={`Minimum ${unit}s`}
            value={minQuantity}
            onChangeText={(t) => setMinQuantity(digitsOnly(t, 6))}
            keyboardType="number-pad"
            error={errors.minQuantity}
          />
        </View>
        <View style={styles.flex}>
          <InputField
            label="Ready in (days)"
            value={turnaround}
            onChangeText={(t) => setTurnaround(digitsOnly(t, 2))}
            keyboardType="number-pad"
            placeholder={String(business.pod?.turnaroundDays ?? 3)}
            hint="Empty uses your usual time."
            error={errors.turnaround}
          />
        </View>
      </View>

      {info.options.map(({ option, values }) => (
        <View key={option} style={styles.group}>
          <Text style={styles.section}>{`${OPTION_LABELS[option] ?? option} extras`}</Text>
          <Text style={styles.hint}>{`Added to each ${unit}. Leave empty for no extra charge.`}</Text>
          <View style={styles.card}>
            {values.map((value, i) => (
              <View key={value} style={[styles.extraRow, i > 0 && styles.divider]}>
                <Text style={styles.extraLabel}>{value}</Text>
                <View style={styles.extraInput}>
                  <InputField
                    value={extras[extraKey(option, value)] ?? ''}
                    onChangeText={(t) => setExtras((x) => ({ ...x, [extraKey(option, value)]: rupeeInput(t) }))}
                    keyboardType="decimal-pad"
                    placeholder="+₹0"
                    accessibilityLabel={`Extra for ${value}, in rupees`}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}

      <Text style={styles.section}>Bulk prices</Text>
      <Text style={styles.hint}>{`A lower price per ${unit} from a quantity, such as ₹180 each from 50.`}</Text>
      {tiers.map((tier, i) => (
        <View key={i} style={styles.tier}>
          <View style={styles.flex}>
            <InputField
              label={`From (${unit}s)`}
              value={tier.from}
              onChangeText={(t) => setTiers((list) => list.map((x, j) => (j === i ? { ...x, from: digitsOnly(t, 6) } : x)))}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.flex}>
            <InputField
              label={`₹ per ${unit}`}
              value={tier.price}
              onChangeText={(t) => setTiers((list) => list.map((x, j) => (j === i ? { ...x, price: rupeeInput(t) } : x)))}
              keyboardType="decimal-pad"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove this bulk price"
            hitSlop={8}
            onPress={() => setTiers((list) => list.filter((_, j) => j !== i))}
            style={styles.removeTier}
          >
            <Ionicons name="trash-outline" size={20} color={Brand.textMuted} />
          </Pressable>
        </View>
      ))}
      {errors.tiers ? <Text style={styles.problem}>{errors.tiers}</Text> : null}
      {tiers.length < maxTiers ? <TextLink label="Add a bulk price" onPress={() => setTiers((list) => [...list, { from: '', price: '' }])} /> : null}

      {failure ? <ErrorBanner message={failure} onRetry={save} /> : null}
      <View style={styles.footer}>
        <PrimaryButton label="Save prices" loading={saving} onPress={save} />
      </View>
    </>
  );
}

/** Prices for one print product: per unit (or per page for documents), extras by option and bulk tiers. `team` opens it from Work. */
export function PodPriceScreen({ team = false }: { team?: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const { id, product } = useLocalSearchParams<{ id: string; product: PodProduct }>();
  const business = useAsyncResource(() => shopDesk(team).service.get(token, id), id);
  const catalog = useBusinessCatalog();
  const info = catalog.data?.podProducts.find((p) => p.id === product);
  const retry = () => {
    if (business.error) business.reload();
    if (catalog.error) catalog.reload();
  };

  return (
    <ScreenContainer title={info?.label ?? 'Prices'}>
      <AsyncBoundary
        loading={business.loading || catalog.loading}
        error={business.error ?? catalog.error}
        hasData={!!business.data && !!catalog.data}
        onRetry={retry}
        skeletonRows={6}
      >
        {business.data && catalog.data && info && business.data.pod?.products.includes(info.id) ? (
          <Form
            id={id}
            team={team}
            business={business.data}
            info={info}
            maxTiers={catalog.data.limits.tiers}
            maxDays={catalog.data.limits.turnaroundDays}
            onSaved={() => router.back()}
          />
        ) : business.data && catalog.data ? (
          <EmptyState icon="pricetag-outline" title="Not one of your products" message="Add it under Products & delivery first." />
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: { ...Typography.body, color: Brand.textMuted, marginBottom: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  group: { gap: Spacing.one },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three },
  hint: { ...Typography.caption, color: Brand.textFaint, marginBottom: Spacing.one },
  card: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.surface, paddingHorizontal: Spacing.three },
  extraRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.two },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.border },
  extraLabel: { ...Typography.body, color: Brand.text, flex: 1 },
  extraInput: { width: 120 },
  tier: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  removeTier: { height: 56, justifyContent: 'center', marginTop: 28 },
  problem: { ...Typography.caption, fontSize: 14, color: Brand.error },
  footer: { paddingTop: Spacing.three },
});
