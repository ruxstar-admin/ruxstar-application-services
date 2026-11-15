import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { MultiChoiceChips } from '@/components/ui/MultiChoiceChips';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Stepper } from '@/components/ui/Stepper';
import { TextLink } from '@/components/ui/TextLink';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Section } from '@/features/coaching/components/Parts';
import { errorText } from '@/features/events/lib/messages';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { keepIdempotencyKey, newIdempotencyKey } from '@/lib/api-client';
import { clockText } from '@/lib/booking/slots';
import { Feedback } from '@/lib/haptics';
import { StaysDeskService, StaysService, VendorStaysService } from '@/services/stays-service';
import type { Facility, FoodType, Meal, NearbyKind, Occupant, PropertyDetail, PropertyKind, StayFor, StaysRules } from '@/types/stays';
import { MAX_NEARBY, emptyProperty, propertyDraftOf, propertyErrors, refundLimitsOf, toPropertyInput, type NearbyDraft, type PropertyDraft } from '../lib/forms';
import { FOOD_LABEL, FOR_LABEL, KINDS, KIND_LABEL, MEALS, MEAL_LABEL, NEARBY, NEARBY_KINDS, OCCUPANT_LABEL } from '../lib/stays';

const KIND_CHIPS = KINDS.map((k) => ({ key: k, label: KIND_LABEL[k] }));
const FOR_CHIPS = (['any', 'men', 'women'] as const).map((k) => ({ key: k, label: FOR_LABEL[k] }));
const OCCUPANT_CHIPS = (['students', 'working'] as const).map((k) => ({ key: k, label: OCCUPANT_LABEL[k] }));
const FOOD_CHIPS = (['none', 'veg', 'non_veg'] as const).map((k) => ({ key: k, label: FOOD_LABEL[k] }));
const MEAL_CHIPS = MEALS.map((m) => ({ key: m, label: MEAL_LABEL[m] }));
const NEARBY_CHIPS = NEARBY_KINDS.map((k) => ({ key: k, label: NEARBY[k].label }));
const CURFEWS = ['', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'];
const NOTICES = [0, 7, 15, 30, 45, 60, 90];

function NearbyRow({ place, index, onChange, onRemove }: { place: NearbyDraft; index: number; onChange: (p: NearbyDraft) => void; onRemove: () => void }) {
  return (
    <View style={styles.nearby}>
      <View style={styles.nearbyHead}>
        <Text style={styles.label}>{`Place ${index + 1}`}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove place ${index + 1}`} hitSlop={8} onPress={onRemove} style={styles.remove}>
          <Ionicons name="close" size={18} color={Brand.textMuted} />
        </Pressable>
      </View>
      <View style={styles.bleed}>
        <ChoiceChips secondary options={NEARBY_CHIPS} value={place.kind} onChange={(kind: NearbyKind) => onChange({ ...place, kind })} />
      </View>
      <View style={styles.pair}>
        <View style={styles.wide}>
          <InputField label="Name" value={place.name} onChangeText={(name) => onChange({ ...place, name })} maxLength={80} placeholder="Like “Christ University”" />
        </View>
        <View style={styles.half}>
          <InputField label="Km away" value={place.km} onChangeText={(km) => onChange({ ...place, km })} keyboardType="decimal-pad" maxLength={5} placeholder="1.5" />
        </View>
      </View>
    </View>
  );
}

/** Where the form saves: a new property for a business, the owner's own, or the desk's listing edit for a warden. */
type Target = { kind: 'new'; businessId: string } | { kind: 'owner'; property: PropertyDetail; limits: { min: number; max: number } } | { kind: 'desk'; property: PropertyDetail };

function Form({ rules, facilities, target }: { rules: StaysRules; facilities: Facility[]; target: Target }) {
  const router = useRouter();
  const token = useAuthToken();
  const existing = target.kind === 'new' ? null : target.property;
  const [draft, setDraft] = useState<PropertyDraft>(() => (existing ? propertyDraftOf(existing) : emptyProperty(rules)));
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(newIdempotencyKey());
  const limits = target.kind === 'owner' ? target.limits : refundLimitsOf(rules);
  const errors = propertyErrors(draft, limits);
  const err = (field: keyof typeof errors) => (shown ? errors[field] : undefined);
  const set = <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const facilityChips = facilities.map((f) => ({ key: f.key, label: f.name }));
  for (const key of draft.facilities) if (!facilities.some((f) => f.key === key)) facilityChips.push({ key, label: existing?.facilities.find((f) => f.key === key)?.name ?? key });
  const curfews = CURFEWS.includes(draft.curfew) ? CURFEWS : [...CURFEWS, draft.curfew];
  const notices = NOTICES.includes(draft.noticeDays) ? NOTICES : [...NOTICES, draft.noticeDays].sort((a, b) => a - b);

  const save = async () => {
    setShown(true);
    if (Object.keys(errors).length) {
      Feedback.error();
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const body = toPropertyInput(draft);
      if (target.kind === 'new') {
        const created = await VendorStaysService.create(token, target.businessId, body, { idempotencyKey: attempt.current });
        Feedback.success();
        router.replace({ pathname: '/(vendor)/properties/[id]', params: { id: created.id, fresh: '1' } });
        return;
      }
      if (target.kind === 'owner') await VendorStaysService.update(token, target.property.id, body);
      else await StaysDeskService.update(token, target.property.id, body);
      Feedback.success();
      router.back();
    } catch (e) {
      Feedback.error();
      setFailure(errorText(e));
      if (!keepIdempotencyKey(e)) attempt.current = newIdempotencyKey();
    } finally {
      setBusy(false);
    }
  };

  const title = target.kind === 'new' ? 'New PG or hostel' : 'Edit listing';
  const footer = <PrimaryButton label={target.kind === 'new' ? 'Save as draft' : 'Save changes'} loading={busy} onPress={save} />;

  return (
    <ScreenContainer title={title} footer={footer}>
      <InputField label="Name" value={draft.name} onChangeText={(v) => set('name', v)} maxLength={80} placeholder="Like “Sunrise PG for Women, Koramangala”" error={err('name')} />
      <Text style={styles.label}>What kind of place</Text>
      <View style={styles.bleed}>
        <ChoiceChips options={KIND_CHIPS} value={draft.kind} onChange={(v: PropertyKind) => set('kind', v)} />
      </View>
      <Text style={styles.hint}>PGs and co-living usually let by the month, hostels by the night. Each room can offer either or both.</Text>
      <InputField
        label="About the place (optional)"
        value={draft.description}
        onChangeText={(v) => set('description', v)}
        multiline
        maxLength={2000}
        showCount
        placeholder="The rooms, the building, who lives here, what’s close by"
        error={err('description')}
      />

      <Section title="Address" />
      <InputField label="Address" value={draft.line} onChangeText={(v) => set('line', v)} maxLength={300} placeholder="Building, street, landmark" error={err('line')} />
      <InputField label="Area (optional)" value={draft.area} onChangeText={(v) => set('area', v)} maxLength={60} placeholder="Like Koramangala; tenants search by it" error={err('area')} />
      <View style={styles.pair}>
        <View style={styles.half}>
          <InputField label="City" value={draft.city} onChangeText={(v) => set('city', v)} maxLength={60} autoCapitalize="words" error={err('city')} />
        </View>
        <View style={styles.half}>
          <InputField label="Pincode (optional)" value={draft.pincode} onChangeText={(v) => set('pincode', v)} keyboardType="number-pad" maxLength={6} error={err('pincode')} />
        </View>
      </View>

      <Section title="Who can stay" />
      <View style={styles.bleed}>
        <ChoiceChips options={FOR_CHIPS} value={draft.for} onChange={(v: StayFor) => set('for', v)} />
      </View>
      <MultiChoiceChips options={OCCUPANT_CHIPS} value={draft.occupants} onChange={(v: Occupant[]) => set('occupants', v)} />
      <Text style={styles.hint}>Pick none for anyone, or students, working people or both.</Text>

      <Section title="Food" />
      <View style={styles.bleed}>
        <ChoiceChips options={FOOD_CHIPS} value={draft.foodType} onChange={(v: FoodType) => set('foodType', v)} />
      </View>
      {draft.foodType !== 'none' ? (
        <>
          <Text style={styles.label}>Meals included in the rent</Text>
          <MultiChoiceChips options={MEAL_CHIPS} value={draft.meals} onChange={(v: Meal[]) => set('meals', v)} />
        </>
      ) : null}

      <Section title="Facilities" />
      {facilityChips.length ? (
        <MultiChoiceChips options={facilityChips} value={draft.facilities} onChange={(v) => set('facilities', v)} />
      ) : (
        <Text style={styles.hint}>Ruxstar hasn’t listed any facilities yet.</Text>
      )}

      <Section title="House rules" />
      <Text style={styles.label}>Latest entry time</Text>
      <View style={styles.bleed}>
        <ChoiceChips secondary options={curfews.map((c) => ({ key: c, label: c ? clockText(c) : 'None' }))} value={draft.curfew} onChange={(v) => set('curfew', v)} />
      </View>
      <ToggleRow title="Guests allowed" value={draft.guests} onValueChange={(v) => set('guests', v)} />
      <ToggleRow title="Smoking allowed" value={draft.smoking} onValueChange={(v) => set('smoking', v)} />
      <ToggleRow title="Alcohol allowed" value={draft.alcohol} onValueChange={(v) => set('alcohol', v)} />
      <ToggleRow title="Pets allowed" value={draft.pets} onValueChange={(v) => set('pets', v)} />
      <InputField label="Other rules (optional)" value={draft.notes} onChangeText={(v) => set('notes', v)} multiline maxLength={500} showCount placeholder="Like “Lights off in common rooms at 11 pm”" error={err('notes')} />

      <Section title="Notice, deposit and refunds" />
      <Text style={styles.label}>Notice to move out</Text>
      <View style={styles.bleed}>
        <ChoiceChips
          secondary
          options={notices.map((d) => ({ key: String(d), label: d === 0 ? 'No notice' : `${d} days` }))}
          value={String(draft.noticeDays)}
          onChange={(v) => set('noticeDays', Number(v))}
        />
      </View>
      {err('notice') ? <ErrorBanner message={err('notice')!} /> : null}
      <InputField
        label="Security deposit in ₹ (optional)"
        value={draft.deposit}
        onChangeText={(v) => set('deposit', v)}
        keyboardType="number-pad"
        maxLength={9}
        placeholder="Like 15000"
        hint="Paid to you at move-in, not through Ruxstar. Tenants see it before they reserve."
        error={err('deposit')}
      />
      <InputField label="About the deposit (optional)" value={draft.depositNote} onChangeText={(v) => set('depositNote', v)} maxLength={200} placeholder="Like “Returned within 7 days of moving out”" error={err('depositNote')} />
      <View style={styles.stepRow}>
        <Text style={styles.stepText}>Full refund up to this many days before move-in</Text>
        <Stepper label="Days before move-in for a full refund" value={draft.refundDays} min={limits.min} max={limits.max} onChange={(v) => set('refundDays', v)} />
      </View>
      <Text style={styles.hint}>{`Cancel ${draft.refundDays === 0 ? 'before move-in day' : `${draft.refundDays}+ days before move-in`}: all back. Later: nothing back. If you cancel, the tenant gets everything back.`}</Text>
      {err('refund') ? <ErrorBanner message={err('refund')!} /> : null}

      <Section title="Nearby" />
      <Text style={styles.hint}>Colleges, offices and metro stations close by. Tenants search by them.</Text>
      {draft.nearby.map((p, i) => (
        <NearbyRow
          key={i}
          place={p}
          index={i}
          onChange={(next) => set('nearby', draft.nearby.map((x, j) => (j === i ? next : x)))}
          onRemove={() => set('nearby', draft.nearby.filter((_, j) => j !== i))}
        />
      ))}
      {draft.nearby.length < MAX_NEARBY ? <TextLink label="Add a nearby place" onPress={() => set('nearby', [...draft.nearby, { kind: 'college', name: '', km: '' }])} /> : null}
      {err('nearby') ? <ErrorBanner message={err('nearby')!} /> : null}

      <Text style={styles.hint}>
        {`Ruxstar keeps ${rules.commissionBps / 100}% of each reservation.${rules.platformFee ? ` Tenants also pay a ${money(rules.platformFee)} platform fee.` : ''}`}
      </Text>
      {target.kind === 'new' ? <Text style={styles.hint}>It’s saved as a draft. Add photos and rooms, then publish it from the next screen.</Text> : null}
      {failure ? <ErrorBanner message={failure} /> : null}
    </ScreenContainer>
  );
}

/** Adding a PG or hostel for `businessId`, or editing `propertyId` as its owner, or (`desk`) as a warden allowed to edit the listing. */
export function PropertyFormScreen({ businessId, propertyId: id, desk }: { businessId?: string; propertyId?: string; desk?: boolean }) {
  const token = useAuthToken();
  const rules = useAsyncResource(() => StaysService.rules(token), 'stays-rules');
  const facilities = useAsyncResource(() => StaysService.facilities(token), 'stays-facilities');
  const owned = useAsyncResource(() => (id && !desk ? VendorStaysService.get(token, id) : Promise.resolve(null)), `${id ?? 'new'}|${desk ? 'desk' : 'owner'}`);
  const listed = useAsyncResource(() => (id && desk ? StaysService.get(token, id) : Promise.resolve(null)), `${id ?? 'new'}|${desk ? 'desk' : 'owner'}`);
  const target: Target | null = !id
    ? businessId
      ? { kind: 'new', businessId }
      : null
    : desk
      ? listed.data
        ? { kind: 'desk', property: listed.data }
        : null
      : owned.data
        ? { kind: 'owner', property: owned.data, limits: owned.data.refundLimits }
        : null;
  const ready = rules.data && facilities.data && target;
  return ready ? (
    <Form rules={rules.data!} facilities={facilities.data!} target={target!} />
  ) : (
    <ScreenContainer title={id ? 'Edit listing' : 'New PG or hostel'}>
      <AsyncBoundary
        loading={rules.loading || facilities.loading || owned.loading || listed.loading}
        error={rules.error ?? facilities.error ?? owned.error ?? listed.error}
        hasData={false}
        onRetry={() => {
          rules.reload();
          facilities.reload();
          owned.reload();
          listed.reload();
        }}
        skeletonRows={5}
      >
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -Spacing.three },
  label: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  hint: { ...Typography.caption, color: Brand.textMuted },
  pair: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  wide: { flex: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepText: { ...Typography.body, fontSize: 15, color: Brand.text, flex: 1 },
  nearby: { gap: Spacing.two, padding: Spacing.three, overflow: 'hidden', borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  nearbyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  remove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
