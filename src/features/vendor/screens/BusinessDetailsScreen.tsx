import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { BusinessProfileFields } from '@/features/vendor/components/BusinessProfileFields';
import { useBusinessCatalog } from '@/features/vendor/hooks/use-business-catalog';
import { checkProfile, GSTIN, locationOf, profileFieldOf, profileOf, type ProfileErrors, type ProfileValues } from '@/features/vendor/lib/business-form';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { shopDesk } from '@/features/vendor/lib/shop-desk';
import type { Business, BusinessCatalog } from '@/types/business';

function Form({ id, team, business, catalog, onSaved }: { id: string; team: boolean; business: Business; catalog: BusinessCatalog; onSaved: () => void }) {
  const token = useAuthToken();
  const [values, setValues] = useState<ProfileValues>(() => profileOf(business));
  const [gstin, setGstin] = useState(business.gstin?.number ?? '');
  const [errors, setErrors] = useState<ProfileErrors & { gstin?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const typeInfo = catalog.categories.flatMap((c) => c.types).find((t) => t.id === business.type);

  const change = (patch: Partial<ProfileValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((e) => ({ ...e, ...Object.fromEntries(Object.keys(patch).map((k) => [k, undefined])) }));
  };

  const save = async () => {
    const found: ProfileErrors & { gstin?: string } = checkProfile(values);
    if (gstin && !GSTIN.test(gstin)) found.gstin = 'A GSTIN has 15 characters, like 36ABCDE1234F1Z5. Or leave it empty.';
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) return Feedback.error();
    setSaving(true);
    try {
      await shopDesk(team).service.update(token, id, {
        name: values.name.trim(),
        description: values.description.trim() || null,
        phone: values.phone,
        location: locationOf(values),
        // Only sent when changed: the API checks it with the GST network each time.
        ...(!team && gstin !== (business.gstin?.number ?? '') ? { gstin: gstin || null } : {}),
      });
      Feedback.success();
      onSaved();
    } catch (err) {
      Feedback.error();
      const gst = err instanceof ApiError ? err.detailFor('gstin') : undefined;
      const detail = err instanceof ApiError ? err.details.find((d) => d.path && profileFieldOf(d.path)) : undefined;
      const field = detail?.path ? profileFieldOf(detail.path) : undefined;
      if (gst) setErrors({ gstin: gst.message });
      else if (detail && field) setErrors({ [field]: detail.message });
      else if (err instanceof ApiError && err.code === 'BUSINESS_INCOMPLETE') setFailure('A live business needs a phone number and location.');
      else setFailure(err instanceof ApiError && err.kind !== 'network' ? err.message : 'Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <BusinessProfileFields
        values={values}
        errors={errors}
        onChange={change}
        states={catalog.states}
        namePlaceholder={typeInfo?.namePlaceholder}
        detailHint={typeInfo?.detailHint}
      />
      {team ? null : (
        <>
          <InputField
            label={business.missing.includes('gstin') ? 'GSTIN, needed to publish' : 'GSTIN (optional)'}
            value={gstin}
            onChangeText={(text) => {
              setGstin(text.toUpperCase().replace(/\s/g, '').slice(0, 15));
              setErrors((e) => ({ ...e, gstin: undefined }));
            }}
            error={errors.gstin}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={15}
          />
          <Text style={styles.hint}>We check a GSTIN with the GST network when you save.</Text>
        </>
      )}
      {failure ? <ErrorBanner message={failure} onRetry={save} /> : null}
      <PrimaryButton label="Save details" loading={saving} onPress={save} />
    </>
  );
}

/** Everything customers read about a business. `team` opens it from Work, where `id` is the place there. */
export function BusinessDetailsScreen({ team = false }: { team?: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const business = useAsyncResource(() => shopDesk(team).service.get(token, id), id);
  const catalog = useBusinessCatalog();
  const retry = () => {
    if (business.error) business.reload();
    if (catalog.error) catalog.reload();
  };

  return (
    <ScreenContainer title="Business details">
      <AsyncBoundary
        loading={business.loading || catalog.loading}
        error={business.error ?? catalog.error}
        hasData={!!business.data && !!catalog.data}
        onRetry={retry}
        skeletonRows={6}
      >
        {business.data && catalog.data ? <Form id={id} team={team} business={business.data} catalog={catalog.data} onSaved={() => router.back()} /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hint: { ...Typography.caption, color: Brand.textFaint, marginBottom: Spacing.two },
});
