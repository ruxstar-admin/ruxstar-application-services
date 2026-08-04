/**
 * Add Business — 3 or 4-step wizard
 * Step 1: Category → Step 2: Type → [Step 3: Booking mode — turf & venue only] → Step 4: Details
 *
 * After creation:
 *   • appointments module → business-setup wizard
 *   • events module       → businesses list (event wizard in Phase 4)
 *   • others              → businesses list (Coming Soon)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/auth-store';
import { useBusinessStore } from '@/stores/business-store';
import {
  getBusinessCatalog,
  needsBookingModeOnCreate,
  supportsSlotSetup,
  uploadBusinessThumbnail,
  type BusinessCatalog,
  type CatalogBusinessCategory,
  type CatalogBusinessType,
  type BookingMode,
} from '@/services/vendor-business-service';
import {
  CategoryStep,
  TypeStep,
  BookingStep,
  DetailsStep,
  SkeletonBox,
  composeAddress,
  type DetailsForm,
} from '@/components/vendor/wizard/WizardSteps';

// ─── Wizard step meta ─────────────────────────────────────────────────────────

type Step = 'category' | 'type' | 'booking' | 'details';

const STEP_LABELS: Record<Step, string> = {
  category: 'Category',
  type:     'Type',
  booking:  'Booking style',
  details:  'Profile',
};

const STEP_HINTS: Record<Step, string> = {
  category: 'Choose the group that best fits your business.',
  type:     'Pick the closest match — turf, salon, shop, etc.',
  booking:  'How customers reserve your space — hourly slots or full days.',
  details:  'Name, phone, location, and a short description.',
};

const STEP_TITLES: Record<Step, string> = {
  category: 'What kind of business?',
  type:     'What type exactly?',
  booking:  'How will customers book?',
  details:  'Add your profile',
};

const STEP_ICONS: Record<Step, keyof typeof Ionicons.glyphMap> = {
  category: 'grid-outline',
  type:     'storefront-outline',
  booking:  'calendar-outline',
  details:  'person-circle-outline',
};

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AddBusinessScreen() {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const token       = useAuthStore((s) => s.token);
  const addBusiness = useBusinessStore((s) => s.addBusiness);

  // Catalog
  const [catalog,        setCatalog]        = useState<BusinessCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError,   setCatalogError]   = useState('');

  // Wizard state
  const [step,        setStep]        = useState<Step>('category');
  const [category,    setCategory]    = useState<CatalogBusinessCategory | null>(null);
  const [bizType,     setBizType]     = useState<CatalogBusinessType | null>(null);
  const [bookingMode, setBookingMode] = useState<BookingMode | null>(null);
  const [form,        setForm]        = useState<DetailsForm>({
    name: '', phone: '', state: '', city: '', area: '', description: '',
  });

  // Submission
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  // Booking step only for turf and venue
  const steps = useMemo<Step[]>(() => {
    const list: Step[] = ['category', 'type'];
    if (bizType && needsBookingModeOnCreate(bizType.id)) list.push('booking');
    list.push('details');
    return list;
  }, [bizType]);

  const stepIndex  = steps.indexOf(step);
  const totalSteps = steps.length;
  const progress   = (stepIndex + 1) / totalSteps;

  // Load catalog once
  const loadCatalog = useCallback(async () => {
    try {
      setCatalogLoading(true);
      setCatalogError('');
      setCatalog(await getBusinessCatalog());
    } catch (e: unknown) {
      setCatalogError(e instanceof Error ? e.message : 'Could not load categories');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  // Navigation
  function goBack() {
    setError('');
    if (step === 'type')    { setStep('category'); return; }
    if (step === 'booking') { setStep('type');     return; }
    if (step === 'details') {
      setStep(bizType && needsBookingModeOnCreate(bizType.id) ? 'booking' : 'type');
      return;
    }
    router.navigate('/(vendor)/businesses' as never);
  }

  // Validation
  function validateDetails(): string {
    if (!form.name.trim())        return `${bizType?.label ?? 'Business'} name is required.`;
    const ph = form.phone.trim();
    if (!ph)                      return 'Phone number is required.';
    if (ph.length !== 10)         return 'Enter a valid 10-digit phone number.';
    if (!form.state.trim())       return 'Please select a state.';
    if (!form.city.trim())        return 'Please select or enter a city.';
    if (!form.description.trim()) return 'Description is required.';
    return '';
  }

  async function handleSubmit() {
    const err = validateDetails();
    if (err) { setError(err); return; }
    if (!token || !bizType) return;

    setSaving(true);
    setError('');
    const address = composeAddress(form.state, form.city, form.area);
    try {
      const created = await addBusiness(token, {
        name:        form.name.trim(),
        typeId:      bizType.id,
        phone:       form.phone.trim(),
        address,
        description: form.description.trim(),
        ...(bookingMode ? { bookingMode } : {}),
      });

      // Upload thumbnail if vendor picked one
      if (form.thumbnail && created.id) {
        try {
          await uploadBusinessThumbnail(token, created.id, form.thumbnail);
        } catch {
          // Non-fatal — business is created, thumbnail can be added later
        }
      }

      // Route based on module:
      // appointments → slot setup wizard
      // events       → businesses list (event wizard comes in Phase 4)
      // others       → businesses list (Coming Soon)
      if (supportsSlotSetup(created)) {
        router.replace({
          pathname: '/(vendor)/business-setup',
          params:   { id: created.id },
        } as never);
      } else {
        router.replace('/(vendor)/businesses' as never);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.iconBtn} onPress={goBack} disabled={saving} hitSlop={8}>
          <Ionicons name="arrow-back" size={18} color={brand.cream} />
        </Pressable>

        <View style={s.headerCenter}>
          <View style={s.stepChip}>
            <Ionicons name={STEP_ICONS[step]} size={12} color={brand.primary} />
            <Text style={s.stepChipText}>
              Step {stepIndex + 1} of {totalSteps} · {STEP_LABELS[step]}
            </Text>
          </View>
          <Text style={s.headerTitle} numberOfLines={1}>{STEP_TITLES[step]}</Text>
          <Text style={s.headerHint}>{STEP_HINTS[step]}</Text>
        </View>

        <Pressable style={s.iconBtn} onPress={() => router.navigate('/(vendor)/businesses' as never)} disabled={saving} hitSlop={8}>
          <Ionicons name="close" size={18} color={brand.creamSub} />
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={s.progressSection}>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
      </View>

      {/* Error banner */}
      {error ? (
        <View style={s.errorBanner}>
          <View style={s.errorIconWrap}>
            <Ionicons name="alert-circle" size={16} color={brand.error} />
          </View>
          <Text style={s.errorText}>{error}</Text>
          <Pressable onPress={() => setError('')} hitSlop={8}>
            <Ionicons name="close-circle-outline" size={16} color={brand.creamMuted} />
          </Pressable>
        </View>
      ) : null}

      {/* Content */}
      {catalogLoading ? (
        <View style={s.skeletonWrap}>
          {[0, 1, 2, 3].map((i) => <SkeletonBox key={i} h={88} />)}
        </View>
      ) : catalogError ? (
        <View style={s.errorState}>
          <View style={s.errorStateIconWrap}>
            <Ionicons name="cloud-offline-outline" size={36} color={brand.creamMuted} />
          </View>
          <Text style={s.errorStateTitle}>Failed to load</Text>
          <Text style={s.errorStateText}>{catalogError}</Text>
          <Pressable style={s.retryBtn} onPress={loadCatalog}>
            <Ionicons name="refresh-outline" size={14} color="#fff" />
            <Text style={s.retryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {step === 'category' && catalog && (
            <CategoryStep
              categories={catalog.categories}
              onSelect={(cat) => {
                setCategory(cat);
                setBizType(null);
                setBookingMode(null);
                setStep('type');
              }}
            />
          )}

          {step === 'type' && category && (
            <TypeStep
              category={category}
              selectedId={bizType?.id ?? null}
              onSelect={(t) => {
                setBizType(t);
                setBookingMode(null);
                // Only turf and venue get the booking style step
                setStep(needsBookingModeOnCreate(t.id) ? 'booking' : 'details');
              }}
            />
          )}

          {step === 'booking' && (
            <BookingStep
              selected={bookingMode}
              onSelect={(m) => { setBookingMode(m); setError(''); setStep('details'); }}
            />
          )}

          {step === 'details' && bizType && (
            <DetailsStep
              form={form}
              onChange={(patch) => { setForm((f) => ({ ...f, ...patch })); setError(''); }}
              typeLabel={bizType.label}
              namePlaceholder={bizType.namePlaceholder}
            />
          )}
        </KeyboardAvoidingView>
      )}

      {/* Submit footer — details step only */}
      {step === 'details' && (
        <View style={s.footer}>
          <Pressable
            style={[s.submitBtn, saving && s.submitDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={s.submitBtnText}>Creating your business…</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={s.submitBtnText}>Create Business</Text>
                <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
              </>
            )}
          </Pressable>
          <Text style={s.footerNote}>
            <Ionicons name="lock-closed-outline" size={10} color={brand.creamMuted} />
            {'  '}Your info is secure and only visible to customers who book.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (brand: BrandTokens) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: brand.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: brand.border1,
    gap: Spacing.two,
  },
  iconBtn: {
    width: 38, height: 38,
    borderRadius: Radius.md,
    backgroundColor: brand.surface1,
    borderWidth: 1,
    borderColor: brand.border1,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  headerCenter: { flex: 1, gap: 3 },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: brand.primaryGlow,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  stepChipText: { fontSize: 11, fontWeight: '700', color: brand.primary, letterSpacing: 0.1 },
  headerTitle:  { fontSize: 18, fontWeight: '800', color: brand.cream, letterSpacing: -0.2 },
  headerHint:   { fontSize: 12, color: brand.creamSub, lineHeight: 17 },

  progressSection: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    backgroundColor: brand.bg,
    borderBottomWidth: 1,
    borderBottomColor: brand.border1,
  },
  progressTrack: { height: 3, backgroundColor: brand.surface2, borderRadius: 2 },
  progressFill:  { height: 3, backgroundColor: brand.primary, borderRadius: 2 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(220,38,38,0.06)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(220,38,38,0.15)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  errorIconWrap: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(220,38,38,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  errorText: { color: brand.error, fontSize: 12, flex: 1, lineHeight: 17 },

  skeletonWrap: { padding: Spacing.three, gap: Spacing.two },

  errorState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: Spacing.two, padding: Spacing.four,
  },
  errorStateIconWrap: {
    width: 72, height: 72,
    borderRadius: Radius.xl,
    backgroundColor: brand.surface1,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  errorStateTitle: { fontSize: 16, fontWeight: '700', color: brand.cream },
  errorStateText:  { color: brand.creamSub, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: brand.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: brand.border1,
    backgroundColor: brand.bg,
    gap: Spacing.two,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: brand.primary,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    shadowColor: brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  submitDisabled: { opacity: 0.6 },
  submitBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: brand.creamMuted,
    lineHeight: 16,
  },
});
