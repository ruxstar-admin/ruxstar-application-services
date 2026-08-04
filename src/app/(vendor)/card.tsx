/**
 * Ruxstar Card Screen
 * • Shows KYC progress with step statuses, progress bar, and active-step CTA
 * • When pending_review: auto-polls every 15 s
 * • When verified: shows the actual RuxstarCard + detail rows with premium layout
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet,
  ActivityIndicator, ScrollView, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/auth-store';
import { useKycStore, nextKycStep } from '@/stores/kyc-store';
import { KycService, type RuxstarCardData, type VendorKycStatus } from '@/services/kyc-service';
import RuxstarCard from '@/components/vendor/RuxstarCard';
import VendorHeader from '@/components/vendor/VendorHeader';

// ─── Step config ─────────────────────────────────────────────────────────────

const IDENTITY_STEPS = [
  {
    id: 'aadhaar' as const,
    label: 'Aadhaar',
    sub: 'DigiLocker verification',
    icon: 'finger-print-outline' as const,
    route: '/(vendor)/kyc/aadhaar' as never,
    btnLabel: 'Verify with DigiLocker',
  },
  {
    id: 'pan' as const,
    label: 'PAN',
    sub: 'Income tax PAN card',
    icon: 'card-outline' as const,
    route: '/(vendor)/kyc/pan' as never,
    btnLabel: 'Enter PAN details',
  },
  {
    id: 'face' as const,
    label: 'Selfie',
    sub: 'Live face match',
    icon: 'camera-outline' as const,
    route: '/(vendor)/kyc/face' as never,
    btnLabel: 'Take selfie',
  },
];

const TOTAL_STEPS = 4;

// ─── Style factory ────────────────────────────────────────────────────────────

const createStyles = (brand: BrandTokens) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: brand.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },

  body:        { padding: Spacing.four, gap: Spacing.four },
  loadingText: { color: brand.creamSub, fontSize: 14 },

  // ── Premium card section ───────────────────────────────────────────────────
  cardSection: {
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    backgroundColor: brand.surface1,
    borderWidth: 1,
    borderColor: brand.border1,
  },
  cardGlowWrap: {
    alignItems: 'center',
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    position: 'relative',
  },
  cardGlow: {
    position: 'absolute',
    top: -20,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(124,58,237,0.10)',
  },
  cardInner: { width: '100%', zIndex: 1 },

  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: brand.border1,
  },
  tierLabel: { fontSize: 10, fontWeight: '700', color: brand.creamMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(134,239,172,0.08)',
    borderWidth: 1, borderColor: 'rgba(134,239,172,0.25)',
  },
  verifiedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#86efac' },
  verifiedText: { color: '#86efac', fontSize: 11, fontWeight: '700' },

  // ── Details card ──────────────────────────────────────────────────────────
  detailsCard: {
    backgroundColor: brand.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: brand.border1,
  },
  detailsHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1, borderBottomColor: brand.border1,
  },
  detailsHeaderText: { fontSize: 12, fontWeight: '700', color: brand.creamSub, letterSpacing: 0.5 },
  detailsBody: { paddingHorizontal: Spacing.three },

  drRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: Spacing.two },
  drBorder:   { borderBottomWidth: 1, borderBottomColor: brand.border1 },
  drIconWrap: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: brand.surface2, alignItems: 'center', justifyContent: 'center' },
  drLabel:    { color: brand.creamMuted, fontSize: 11, letterSpacing: 0.3 },
  drValue:    { color: brand.cream, fontSize: 14, fontWeight: '600', fontFamily: 'monospace' },

  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: brand.primaryGlow,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)',
    padding: Spacing.three,
  },
  noteText: { color: brand.creamSub, fontSize: 12, lineHeight: 18, flex: 1 },

  // ── KYC Progress ──────────────────────────────────────────────────────────
  progressHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, marginBottom: Spacing.two },
  kycLabel:  { color: brand.creamMuted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  kycTitle:  { color: brand.cream, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  kycSub:    { color: brand.creamSub, fontSize: 13, lineHeight: 19 },
  progressBadge: { alignItems: 'flex-end', paddingTop: 2 },
  progressPct:   { color: brand.cream, fontSize: 22, fontWeight: '800' },
  progressSteps: { color: brand.creamMuted, fontSize: 11 },

  barTrack: { height: 4, borderRadius: 4, backgroundColor: brand.surface2, overflow: 'hidden', marginBottom: Spacing.two },
  barFill:  { height: '100%', borderRadius: 4, backgroundColor: brand.primary },

  rejectBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two,
    backgroundColor: 'rgba(220,38,38,0.08)', borderRadius: Radius.xl,
    borderWidth: 1, borderColor: 'rgba(220,38,38,0.25)',
    padding: Spacing.three, marginBottom: Spacing.two,
  },
  rejectTitle: { color: '#fca5a5', fontSize: 13, fontWeight: '700' },
  rejectSub:   { color: '#fca5a5', fontSize: 12, opacity: 0.75, lineHeight: 17 },

  stepList: { backgroundColor: brand.surface1, borderRadius: Radius.xl, borderWidth: 1, borderColor: brand.border1, padding: Spacing.three },

  // Step row
  srWrap:         { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, paddingBottom: Spacing.three },
  srLine:         { position: 'absolute', left: 16, top: 34, bottom: 0, width: 1, backgroundColor: brand.border1 },
  srLineDone:     { backgroundColor: 'rgba(134,239,172,0.35)' },
  srCircle:       { width: 33, height: 33, borderRadius: 17, borderWidth: 1, borderColor: brand.border1, backgroundColor: brand.surface2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  srCircleDone:   { borderColor: 'rgba(134,239,172,0.40)', backgroundColor: 'rgba(134,239,172,0.10)' },
  srCircleActive: { borderColor: 'rgba(255,255,255,0.30)', backgroundColor: 'rgba(255,255,255,0.10)' },
  srCircleReview: { borderColor: 'rgba(96,165,250,0.40)',  backgroundColor: 'rgba(96,165,250,0.10)' },
  srText:         { flex: 1, paddingTop: 4, gap: 2 },
  srLabel:        { color: brand.creamMuted, fontSize: 14, fontWeight: '600' },
  srLabelDone:    { color: '#86efac' },
  srLabelActive:  { color: brand.cream },
  srLabelReview:  { color: '#93c5fd' },
  srSub:          { color: brand.creamMuted, fontSize: 11 },
  srDoneBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, backgroundColor: 'rgba(134,239,172,0.10)', borderWidth: 1, borderColor: 'rgba(134,239,172,0.25)', marginTop: 6 },
  srDoneBadgeText:{ color: '#86efac', fontSize: 10, fontWeight: '700' },

  ctaBox:       { backgroundColor: brand.surface1, borderRadius: Radius.xl, borderWidth: 1, borderColor: brand.border1, padding: Spacing.three, gap: Spacing.three },
  ctaHeader:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  ctaIconWrap:  { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: brand.primaryGlow, alignItems: 'center', justifyContent: 'center' },
  ctaStepLabel: { color: brand.creamMuted, fontSize: 10, fontWeight: '600', letterSpacing: 1.5 },
  ctaTitle:     { color: brand.cream, fontSize: 15, fontWeight: '700' },
  ctaBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: brand.primary, paddingVertical: 14, borderRadius: Radius.pill },
  ctaBtnText:   { color: '#fff', fontSize: 15, fontWeight: '700' },

  reviewBox:      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, backgroundColor: 'rgba(96,165,250,0.06)', borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(96,165,250,0.20)', padding: Spacing.three },
  reviewIconWrap: { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: 'rgba(96,165,250,0.10)', alignItems: 'center', justifyContent: 'center' },
  reviewTitle:    { color: '#93c5fd', fontSize: 13, fontWeight: '700' },
  reviewSub:      { color: brand.creamSub, fontSize: 12, lineHeight: 17 },
  refreshRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  refreshText:    { color: brand.creamMuted, fontSize: 11 },

  errorWrap: { alignItems: 'center', paddingTop: 40, gap: Spacing.two },
  errorText: { color: brand.error, fontSize: 14, textAlign: 'center' },
  retryBtn:  { paddingHorizontal: Spacing.three, paddingVertical: 10, borderRadius: Radius.pill, borderWidth: 1, borderColor: brand.border2 },
  retryText: { color: brand.creamSub, fontSize: 14, fontWeight: '600' },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function completedCount(kyc: VendorKycStatus | null): number {
  if (!kyc) return 0;
  let n = 0;
  if (kyc.aadhaar?.status === 'verified') n++;
  if (kyc.pan?.status     === 'verified') n++;
  if (kyc.face?.status    === 'verified') n++;
  return n;
}

type Visual = 'done' | 'active' | 'pending';

function stepVisual(id: 'aadhaar' | 'pan' | 'face', kyc: VendorKycStatus | null, currentStep: string): Visual {
  if (kyc?.[id]?.status === 'verified') return 'done';
  if (currentStep === id) return 'active';
  return 'pending';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepRow({ step, visual, isLast }: { step: typeof IDENTITY_STEPS[number]; visual: Visual; isLast: boolean }) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  return (
    <View style={s.srWrap}>
      {!isLast && <View style={[s.srLine, visual === 'done' && s.srLineDone]} />}
      <View style={[s.srCircle, visual === 'done' && s.srCircleDone, visual === 'active' && s.srCircleActive]}>
        {visual === 'done'
          ? <Ionicons name="checkmark" size={14} color="#86efac" />
          : <Ionicons name={step.icon} size={14} color={visual === 'active' ? brand.cream : brand.creamMuted} />}
      </View>
      <View style={s.srText}>
        <Text style={[s.srLabel, visual === 'done' && s.srLabelDone, visual === 'active' && s.srLabelActive]}>
          {step.label}
        </Text>
        <Text style={s.srSub}>{visual === 'done' ? 'Verified' : visual === 'active' ? 'Up next' : 'Pending'}</Text>
      </View>
      {visual === 'done' && (
        <View style={s.srDoneBadge}><Text style={s.srDoneBadgeText}>✓</Text></View>
      )}
    </View>
  );
}

function ReviewRow({ visual }: { visual: Visual }) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  return (
    <View style={s.srWrap}>
      <View style={[s.srCircle, visual === 'done' && s.srCircleDone, visual === 'active' && s.srCircleReview]}>
        {visual === 'done'
          ? <Ionicons name="checkmark" size={14} color="#86efac" />
          : visual === 'active'
            ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#60a5fa' }} />
            : <Ionicons name="shield-checkmark-outline" size={14} color={brand.creamMuted} />}
      </View>
      <View style={s.srText}>
        <Text style={[s.srLabel, visual === 'done' && s.srLabelDone, visual === 'active' && s.srLabelReview]}>
          Admin review
        </Text>
        <Text style={s.srSub}>
          {visual === 'done' ? 'Card issued' : visual === 'active' ? 'Generating your card' : 'Pending'}
        </Text>
      </View>
    </View>
  );
}

function DetailRow({ icon, label, value, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; last?: boolean }) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  return (
    <View style={[s.drRow, !last && s.drBorder]}>
      <View style={s.drIconWrap}>
        <Ionicons name={icon} size={16} color={brand.creamSub} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={s.drLabel}>{label}</Text>
        <Text style={s.drValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Premium Card Presentation ───────────────────────────────────────────────

function PremiumCardSection({ card, s, brand }: { card: RuxstarCardData; s: ReturnType<typeof createStyles>; brand: BrandTokens }) {
  return (
    <View style={s.cardSection}>
      <View style={s.cardGlowWrap}>
        <View style={s.cardGlow} />
        <View style={s.cardInner}>
          <RuxstarCard card={card} />
        </View>
      </View>
      <View style={s.tierRow}>
        <Text style={s.tierLabel}>Ruxstar Verified Member</Text>
        <View style={s.verifiedBadge}>
          <View style={s.verifiedDot} />
          <Text style={s.verifiedText}>Verified</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CardScreen() {
  const insets      = useSafeAreaInsets();
  const token       = useAuthStore((s) => s.token);
  const kycStatus   = useKycStore((s) => s.status);
  const fetchStatus = useKycStore((s) => s.fetchStatus);
  const { brand }   = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const [card,        setCard]        = useState<RuxstarCardData | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError,   setCardError]   = useState('');
  const [refreshing,  setRefreshing]  = useState(false);
  const [statusReady, setStatusReady] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStep = (statusReady && kycStatus) ? nextKycStep(kycStatus) : null;
  const isVerified  = currentStep === 'verified';
  const inReview    = currentStep === 'pending_review';
  const isRejected  = currentStep === 'rejected';
  const done        = completedCount(kycStatus);

  const progress      = isVerified ? 100 : inReview ? 75 : Math.round((done / TOTAL_STEPS) * 100);
  const stepsComplete = isVerified ? TOTAL_STEPS : inReview ? 3 : done;
  const reviewVisual: Visual = isVerified ? 'done' : inReview ? 'active' : 'pending';
  const activeStep = IDENTITY_STEPS.find((step) => step.id === currentStep);

  useEffect(() => {
    if (!token) return;
    setStatusReady(false);
    fetchStatus(token).catch(() => {}).finally(() => setStatusReady(true));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setCard(null); setCardError(''); }, [token]);

  useEffect(() => {
    if (!token || !isVerified || card) return;
    setCardLoading(true);
    KycService.getCard(token)
      .then(setCard)
      .catch((e) => setCardError(e instanceof Error ? e.message : 'Could not load card.'))
      .finally(() => setCardLoading(false));
  }, [token, isVerified]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token || !inReview) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => { fetchStatus(token).catch(() => {}); }, 15000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [token, inReview]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRefresh() {
    if (!token || refreshing) return;
    setRefreshing(true);
    try { await fetchStatus(token); } finally { setRefreshing(false); }
  }

  if (!statusReady) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <VendorHeader />
        <View style={s.center}>
          <ActivityIndicator color={brand.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (isVerified) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <VendorHeader />
        <ScrollView
          contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {cardLoading && (
            <View style={s.center}>
              <ActivityIndicator color={brand.primary} size="large" />
              <Text style={s.loadingText}>Loading your card…</Text>
            </View>
          )}
          {!cardLoading && cardError ? (
            <Animated.View entering={FadeInDown.delay(60)} style={s.errorWrap}>
              <Ionicons name="alert-circle-outline" size={28} color={brand.error} />
              <Text style={s.errorText}>{cardError}</Text>
              <Pressable style={s.retryBtn} onPress={() => {
                setCardError(''); setCardLoading(true);
                KycService.getCard(token!).then(setCard).catch((e) => setCardError(e.message)).finally(() => setCardLoading(false));
              }}>
                <Text style={s.retryText}>Try again</Text>
              </Pressable>
            </Animated.View>
          ) : null}
          {!cardLoading && !cardError && card && (
            <Animated.View entering={FadeInDown.delay(60)} style={{ gap: Spacing.three }}>
              <PremiumCardSection card={card} s={s} brand={brand} />

              <View style={s.detailsCard}>
                <View style={s.detailsHeader}>
                  <Ionicons name="lock-closed-outline" size={13} color={brand.creamMuted} />
                  <Text style={s.detailsHeaderText}>Identity Details</Text>
                </View>
                <View style={s.detailsBody}>
                  <DetailRow icon="person-outline"       label="Name"         value={card.name ?? '—'} />
                  <DetailRow icon="finger-print-outline" label="Aadhaar"      value={card.aadhaar ?? '—'} />
                  <DetailRow icon="card-outline"         label="PAN"          value={card.pan ?? '—'} />
                  <DetailRow icon="calendar-outline"     label="Member Since" value={formatDate(card.memberSince)} last />
                </View>
              </View>

              <View style={s.noteBox}>
                <Ionicons name="shield-checkmark-outline" size={14} color={brand.primary} />
                <Text style={s.noteText}>
                  Your identity is verified by DigiLocker & Ruxstar. This card is valid across all Ruxstar services.
                </Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <VendorHeader />
      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(60)}>

          <View style={s.progressHeader}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.kycLabel}>RUXSTAR CARD</Text>
              <Text style={s.kycTitle}>{inReview ? 'Generating your card' : 'Get your Ruxstar Card'}</Text>
              <Text style={s.kycSub}>
                {inReview ? 'Step 4 — admin is reviewing your details.' : 'Complete 3 identity checks, then admin review.'}
              </Text>
            </View>
            <View style={s.progressBadge}>
              <Text style={s.progressPct}>{progress}%</Text>
              <Text style={s.progressSteps}>{stepsComplete}/{TOTAL_STEPS}</Text>
            </View>
          </View>

          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${progress}%` as any }, inReview && { backgroundColor: '#60a5fa' }]} />
          </View>

          {isRejected && (
            <View style={s.rejectBanner}>
              <Ionicons name="warning-outline" size={20} color="#fca5a5" />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={s.rejectTitle}>Verification needs correction</Text>
                <Text style={s.rejectSub}>
                  {kycStatus?.message ?? 'Your submission was not approved. Fix the step below and resubmit.'}
                </Text>
              </View>
            </View>
          )}

          <View style={s.stepList}>
            {IDENTITY_STEPS.map((step, i) => (
              <StepRow
                key={step.id}
                step={step}
                visual={stepVisual(step.id, kycStatus, currentStep ?? '')}
                isLast={i === IDENTITY_STEPS.length - 1}
              />
            ))}
            <ReviewRow visual={reviewVisual} />
          </View>

          {activeStep && (
            <View style={s.ctaBox}>
              <View style={s.ctaHeader}>
                <View style={s.ctaIconWrap}>
                  <Ionicons name={activeStep.icon} size={18} color={brand.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.ctaStepLabel}>Step {IDENTITY_STEPS.findIndex((x) => x.id === activeStep.id) + 1} of {TOTAL_STEPS}</Text>
                  <Text style={s.ctaTitle}>Verify your {activeStep.label}</Text>
                </View>
              </View>
              <Pressable style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.8 }]} onPress={() => router.push(activeStep.route)}>
                <Text style={s.ctaBtnText}>{activeStep.btnLabel}</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </Pressable>
            </View>
          )}

          {inReview && (
            <View style={s.reviewBox}>
              <View style={s.reviewIconWrap}>
                <ActivityIndicator color="#60a5fa" size="small" />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.reviewTitle}>Admin is reviewing your submission</Text>
                <Text style={s.reviewSub}>This usually takes a few minutes. Your card will appear here once approved.</Text>
                <Pressable style={s.refreshRow} onPress={handleRefresh} disabled={refreshing}>
                  <Ionicons name={refreshing ? 'hourglass-outline' : 'sync-outline'} size={13} color={brand.creamMuted} />
                  <Text style={s.refreshText}>{refreshing ? 'Checking…' : 'Checking automatically every 15 s'}</Text>
                </Pressable>
              </View>
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
