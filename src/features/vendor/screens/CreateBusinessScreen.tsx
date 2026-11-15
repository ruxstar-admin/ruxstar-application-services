import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Checkbox } from '@/components/ui/Checkbox';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { PaymentTerms } from '@/features/pod/components/PaymentTerms';
import { vendorTerms } from '@/features/pod/lib/terms';
import { BusinessProfileFields } from '@/features/vendor/components/BusinessProfileFields';
import { OptionCard } from '@/features/vendor/components/OptionCard';
import { useBusinessCatalog } from '@/features/vendor/hooks/use-business-catalog';
import { checkProfile, EMPTY_PROFILE, locationOf, profileFieldOf, type ProfileErrors, type ProfileValues } from '@/features/vendor/lib/business-form';
import { BUSINESS_MODULES, TYPE_ICONS } from '@/features/vendor/lib/business-modules';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { keepIdempotencyKey, newIdempotencyKey } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { BusinessService } from '@/services/business-service';
import { ShopService } from '@/services/shop-service';
import type { BusinessCatalog, BusinessModule, BusinessType } from '@/types/business';

type Category = BusinessCatalog['categories'][number];

const closedNote = (c: Category) => (c.live ? 'Not taking new businesses right now' : 'Coming soon');

/** As in v1: pick a category, then the kind of business, then its profile. It starts as a draft you set up and publish. */
export function CreateBusinessScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { data, loading, error, reload } = useBusinessCatalog({ fresh: true });
  const [module, setModule] = useState<BusinessModule | null>(null);
  const [type, setType] = useState<BusinessType | null>(null);
  const [values, setValues] = useState<ProfileValues>(EMPTY_PROFILE);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // One key per attempt to create, so a retry after a dropped connection can't make two.
  const attempt = useRef(newIdempotencyKey());
  const terms = useAsyncResource(() => ShopService.terms(token));
  const [agreed, setAgreed] = useState(false);

  const category = data?.categories.find((c) => c.module === module) ?? null;
  const typeInfo = category?.types.find((t) => t.id === type) ?? null;

  const chooseCategory = (c: Category) => {
    Feedback.select();
    setModule(c.module);
    // A category with one kind of business skips the type step.
    setType(c.types.length === 1 ? c.types[0].id : null);
  };

  const change = (patch: Partial<ProfileValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((e) => ({ ...e, ...Object.fromEntries(Object.keys(patch).map((k) => [k, undefined])) }));
  };

  const create = async () => {
    if (!module || !type) return;
    const found = checkProfile(values);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) return Feedback.error();
    setSaving(true);
    try {
      const business = await BusinessService.create(
        token,
        { module, type, name: values.name.trim(), phone: values.phone, location: locationOf(values), description: values.description.trim() || null },
        attempt.current,
      );
      Feedback.success();
      router.replace({ pathname: '/(vendor)/businesses/[id]', params: { id: business.id } });
    } catch (err) {
      Feedback.error();
      if (!keepIdempotencyKey(err)) attempt.current = newIdempotencyKey();
      const detail = err instanceof ApiError ? err.details.find((d) => d.path && profileFieldOf(d.path)) : undefined;
      const field = detail?.path ? profileFieldOf(detail.path) : undefined;
      if (detail && field) setErrors({ [field]: detail.message });
      else setFailure(err instanceof ApiError && err.kind !== 'network' ? err.message : 'Could not create it. Check your connection and try again.');
      if (err instanceof ApiError && (err.code === 'MODULE_OFF' || err.code === 'SIGNUPS_CLOSED')) {
        setModule(null);
        setType(null);
        reload();
      }
    } finally {
      setSaving(false);
    }
  };

  const step = !category ? 'category' : !typeInfo ? 'type' : 'profile';
  const needsTerms = module === 'pod';

  return (
    <ScreenContainer
      title={step === 'category' ? 'Add a business' : step === 'type' ? category!.label : 'Business profile'}
      footer={
        step === 'profile' ? (
          <PrimaryButton label="Create business" loading={saving} onPress={create} disabled={needsTerms && (!terms.data || !agreed)} />
        ) : undefined
      }
    >
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {data && step === 'category' ? (
          <>
            <Text style={styles.intro}>Choose what your business does. Each business runs in one category.</Text>
            <View style={styles.options}>
              {data.categories.map((c) => (
                <OptionCard
                  key={c.module}
                  icon={BUSINESS_MODULES[c.module].icon}
                  title={c.label}
                  subtitle={c.signupsOpen ? c.description : closedNote(c)}
                  disabled={!c.signupsOpen}
                  onPress={() => chooseCategory(c)}
                />
              ))}
            </View>
          </>
        ) : null}

        {category && step === 'type' ? (
          <>
            <Text style={styles.intro}>What kind of business is it?</Text>
            <View style={styles.options}>
              {category.types.map((t) => (
                <OptionCard
                  key={t.id}
                  icon={TYPE_ICONS[t.id]}
                  title={t.label}
                  subtitle={t.description}
                  footnote={t.examples}
                  onPress={() => {
                    Feedback.select();
                    setType(t.id);
                  }}
                />
              ))}
            </View>
            <TextLink label="Choose another category" muted onPress={() => setModule(null)} />
          </>
        ) : null}

        {data && category && typeInfo && step === 'profile' ? (
          <>
            <View style={styles.chosen}>
              <View style={styles.chosenText}>
                <Text style={styles.chosenLabel}>{category.label}</Text>
                <Text style={styles.chosenType}>{typeInfo.label}</Text>
              </View>
              <TextLink
                label="Change"
                onPress={() => {
                  setType(null);
                  if (category.types.length === 1) setModule(null);
                }}
              />
            </View>
            <BusinessProfileFields
              values={values}
              errors={errors}
              onChange={change}
              states={data.states}
              namePlaceholder={typeInfo.namePlaceholder}
              detailHint={typeInfo.detailHint}
            />
            <Text style={styles.hint}>
              {module === 'events'
                ? 'You add a photo next and publish the business, then make events and sell tickets.'
                : module === 'coaching'
                  ? 'You add a photo next and publish the business, then make courses with batches and take enrolments.'
                  : module === 'turf'
                    ? 'You add a photo next and publish the business, then set up your grounds and courts and take slot bookings.'
                    : module === 'stays'
                      ? 'You add a photo next and publish the business, then set up your PG or hostel with its rooms and beds and take reservations.'
                      : module === 'shop'
                        ? 'You add a photo next and publish the business, then set delivery, pickup and returns, and add products with their sizes, colours and stock.'
                        : `You add photos${module === 'pod' ? ', products and prices' : ''} next, then publish it.`}
            </Text>
            {needsTerms ? (
              <View style={styles.terms}>
                <Text style={styles.termsTitle}>Payment terms</Text>
                {terms.data ? (
                  <>
                    <PaymentTerms terms={vendorTerms(terms.data)} />
                    <Checkbox checked={agreed} onChange={setAgreed} accessibilityLabel="I agree to these payment terms">
                      <Text style={styles.agree}>I agree to these payment terms</Text>
                    </Checkbox>
                  </>
                ) : terms.error ? (
                  <>
                    <ErrorBanner message="Could not load the payment terms. Check your connection." />
                    <PrimaryButton label="Try again" variant="outline" onPress={terms.reload} />
                  </>
                ) : (
                  <ActivityIndicator color={Brand.primarySoft} />
                )}
              </View>
            ) : null}
            {failure ? <ErrorBanner message={failure} /> : null}
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: { ...Typography.body, color: Brand.textMuted, marginBottom: Spacing.two },
  options: { gap: Spacing.two, marginBottom: Spacing.two },
  chosen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    marginBottom: Spacing.two,
  },
  chosenText: { flex: 1, gap: 2 },
  chosenLabel: { ...Typography.caption, color: Brand.textMuted },
  chosenType: { ...Typography.bodyStrong, color: Brand.text },
  hint: { ...Typography.caption, color: Brand.textFaint },
  terms: { gap: Spacing.three, marginTop: Spacing.three },
  termsTitle: { ...Typography.bodyStrong, color: Brand.text },
  agree: { ...Typography.body, color: Brand.text },
});
