import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { MultiChoiceChips } from '@/components/ui/MultiChoiceChips';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Stepper } from '@/components/ui/Stepper';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { errorText } from '@/features/events/lib/messages';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { keepIdempotencyKey, newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { TurfService, VendorTurfService } from '@/services/turf-service';
import type { Amenity, TurfRules, VendorGround } from '@/types/turf';
import { emptyGround, groundDraftOf, groundErrors, toGroundInput, type GroundDraft } from '../lib/forms';
import { AMENITIES, AMENITY } from '../lib/turf';

const AMENITY_CHIPS = AMENITIES.map((a) => ({ key: a, label: AMENITY[a].label }));

function Form({ rules, ground, businessId }: { rules: TurfRules; ground?: VendorGround; businessId?: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const [draft, setDraft] = useState<GroundDraft>(() => (ground ? groundDraftOf(ground) : emptyGround(rules)));
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(newIdempotencyKey());
  const errors = groundErrors(draft, rules);
  const err = (field: keyof typeof errors) => (shown ? errors[field] : undefined);
  const set = <K extends keyof GroundDraft>(key: K, value: GroundDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const halfPercent = ground?.refunds.halfPercent ?? rules.halfPercent;

  const save = async () => {
    setShown(true);
    if (Object.keys(errors).length) {
      Feedback.error();
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const body = toGroundInput(draft);
      if (ground) {
        await VendorTurfService.update(token, ground.id, body);
        Feedback.success();
        router.back();
      } else {
        const created = await VendorTurfService.create(token, businessId!, body, { idempotencyKey: attempt.current });
        Feedback.success();
        router.replace({ pathname: '/(vendor)/grounds/[id]', params: { id: created.id, fresh: '1' } });
      }
    } catch (e) {
      Feedback.error();
      setFailure(errorText(e));
      if (!keepIdempotencyKey(e)) attempt.current = newIdempotencyKey();
    } finally {
      setBusy(false);
    }
  };

  const footer = <PrimaryButton label={ground ? 'Save changes' : 'Save as draft'} loading={busy} onPress={save} />;

  return (
    <ScreenContainer title={ground ? 'Edit ground' : 'New ground'} footer={footer}>
      <InputField label="Ground name" value={draft.name} onChangeText={(v) => set('name', v)} maxLength={80} placeholder="Like “Kickoff Arena, Kondapur”" error={err('name')} />
      <InputField
        label="About the ground (optional)"
        value={draft.description}
        onChangeText={(v) => set('description', v)}
        multiline
        maxLength={2000}
        showCount
        placeholder="Surface, size, rules, what to bring"
      />
      <InputField label="Address" value={draft.address} onChangeText={(v) => set('address', v)} maxLength={200} placeholder="Building, street, area" error={err('address')} />
      <View style={styles.pair}>
        <View style={styles.half}>
          <InputField label="City" value={draft.city} onChangeText={(v) => set('city', v)} maxLength={60} autoCapitalize="words" error={err('city')} />
        </View>
        <View style={styles.half}>
          <InputField label="Pincode (optional)" value={draft.pincode} onChangeText={(v) => set('pincode', v)} keyboardType="number-pad" maxLength={6} error={err('pincode')} />
        </View>
      </View>

      <Text style={styles.label}>What the ground has</Text>
      <MultiChoiceChips options={AMENITY_CHIPS} value={draft.amenities} onChange={(v: Amenity[]) => set('amenities', v)} />

      <Text style={styles.label}>Refunds when a player cancels</Text>
      <View style={styles.stepRow}>
        <Text style={styles.stepText}>Full refund up to this many hours before</Text>
        <Stepper label="Hours before for a full refund" value={draft.fullHours} min={rules.minFullHours} max={rules.maxFullHours} onChange={(v) => set('fullHours', v)} />
      </View>
      <View style={styles.stepRow}>
        <Text style={styles.stepText}>{`${halfPercent}% back up to this many hours before`}</Text>
        <Stepper label={`Hours before for a ${halfPercent}% refund`} value={draft.halfHours} min={0} max={draft.fullHours} onChange={(v) => set('halfHours', v)} />
      </View>
      <Text style={styles.hint}>
        {draft.halfHours > 0 && draft.halfHours < draft.fullHours
          ? `Cancel ${draft.fullHours}+ hours before: all back. ${draft.halfHours}–${draft.fullHours} hours: ${halfPercent}% back. Later: nothing back.`
          : `Cancel ${draft.fullHours}+ hours before: all back. Later: nothing back.`}
      </Text>
      {err('refunds') ? <ErrorBanner message={err('refunds')!} /> : null}

      <Text style={styles.hint}>
        {`Ruxstar keeps ${rules.commissionBps / 100}% of each booking.${rules.platformFee ? ` Players also pay a ${money(rules.platformFee)} platform fee.` : ''}`}
      </Text>
      {ground ? null : <Text style={styles.hint}>It’s saved as a draft. Add photos and courts, then publish it from the next screen.</Text>}
      {failure ? <ErrorBanner message={failure} /> : null}
    </ScreenContainer>
  );
}

/** Adding a ground for `businessId`, or changing `groundId`. A new ground is saved as a draft. */
export function GroundFormScreen({ businessId, groundId: id }: { businessId?: string; groundId?: string }) {
  const token = useAuthToken();
  const rules = useAsyncResource(() => TurfService.rules(token), 'rules');
  const ground = useAsyncResource(() => (id ? VendorTurfService.get(token, id) : Promise.resolve(null)), id ?? 'new');
  const ready = rules.data && (!id || ground.data);
  return ready ? (
    <Form rules={rules.data!} ground={ground.data ?? undefined} businessId={businessId} />
  ) : (
    <ScreenContainer title={id ? 'Edit ground' : 'New ground'}>
      <AsyncBoundary
        loading={rules.loading || ground.loading}
        error={rules.error ?? ground.error}
        hasData={false}
        onRetry={() => {
          rules.reload();
          ground.reload();
        }}
        skeletonRows={4}
      >
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  label: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  hint: { ...Typography.caption, color: Brand.textMuted },
  pair: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepText: { ...Typography.body, fontSize: 15, color: Brand.text, flex: 1 },
});
