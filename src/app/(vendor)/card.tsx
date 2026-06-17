/**
 * Ruxstar Card Screen
 * • Mirrors web /business/kyc: inline step tracker → verified card
 * • Shows KYC progress with step statuses, progress bar, and active-step CTA
 * • When pending_review: auto-polls every 15 s
 * • When verified: shows the actual RuxstarCard + detail rows
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar,
  ActivityIndicator, ScrollView, Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useKycStore, nextKycStep } from '@/stores/kyc-store';
import { KycService, type RuxstarCardData, type VendorKycStatus } from '@/services/kyc-service';
import RuxstarCard from '@/components/vendor/RuxstarCard';

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

const TOTAL_STEPS = 4; // 3 identity + 1 admin review

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

function stepVisual(
  id: 'aadhaar' | 'pan' | 'face',
  kyc: VendorKycStatus | null,
  currentStep: string,
): Visual {
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

function StepRow({
  step, visual, isLast,
}: {
  step: typeof IDENTITY_STEPS[number];
  visual: Visual;
  isLast: boolean;
}) {
  return (
    <View style={sr.wrap}>
      {/* Connector line */}
      {!isLast && <View style={[sr.line, visual === 'done' && sr.lineDone]} />}

      {/* Circle */}
      <View style={[sr.circle, visual === 'done' && sr.circleDone, visual === 'active' && sr.circleActive]}>
        {visual === 'done' ? (
          <Ionicons name="checkmark" size={14} color="#86efac" />
        ) : (
          <Ionicons
            name={step.icon}
            size={14}
            color={visual === 'active' ? Brand.cream : Brand.creamMuted}
          />
        )}
      </View>

      {/* Text */}
      <View style={sr.text}>
        <Text style={[sr.label, visual === 'done' && sr.labelDone, visual === 'active' && sr.labelActive]}>
          {step.label}
        </Text>
        <Text style={sr.sub}>
          {visual === 'done' ? 'Verified' : visual === 'active' ? 'Up next' : 'Pending'}
        </Text>
      </View>

      {/* Done checkmark badge */}
      {visual === 'done' && (
        <View style={sr.doneBadge}>
          <Text style={sr.doneBadgeText}>✓</Text>
        </View>
      )}
    </View>
  );
}

function ReviewRow({ visual }: { visual: Visual }) {
  return (
    <View style={sr.wrap}>
      <View style={[
        sr.circle,
        visual === 'done'   && sr.circleDone,
        visual === 'active' && sr.circleReview,
      ]}>
        {visual === 'done' ? (
          <Ionicons name="checkmark" size={14} color="#86efac" />
        ) : visual === 'active' ? (
          <View style={sr.pulseDot} />
        ) : (
          <Ionicons name="shield-checkmark-outline" size={14} color={Brand.creamMuted} />
        )}
      </View>
      <View style={sr.text}>
        <Text style={[
          sr.label,
          visual === 'done'   && sr.labelDone,
          visual === 'active' && sr.labelReview,
        ]}>
          Admin review
        </Text>
        <Text style={sr.sub}>
          {visual === 'done' ? 'Card issued' : visual === 'active' ? 'Generating your card' : 'Pending'}
        </Text>
      </View>
    </View>
  );
}

function DetailRow({
  icon, label, value, last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[dr.row, !last && dr.border]}>
      <View style={dr.iconWrap}>
        <Ionicons name={icon} size={16} color={Brand.creamSub} />
      </View>
      <View style={dr.textBlock}>
        <Text style={dr.label}>{label}</Text>
        <Text style={dr.value}>{value}</Text>
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

  const [card,        setCard]        = useState<RuxstarCardData | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError,   setCardError]   = useState('');
  const [refreshing,  setRefreshing]  = useState(false);
  // Gate: don't trust store until we've fetched fresh status for THIS user
  const [statusReady, setStatusReady] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived state — only valid after statusReady ───────────────────────────
  const currentStep = (statusReady && kycStatus) ? nextKycStep(kycStatus) : null;
  const isVerified  = currentStep === 'verified';
  const inReview    = currentStep === 'pending_review';
  const isRejected  = currentStep === 'rejected';
  const done        = completedCount(kycStatus);

  const progress = isVerified
    ? 100
    : inReview ? 75
    : Math.round((done / TOTAL_STEPS) * 100);

  const stepsComplete = isVerified ? TOTAL_STEPS : inReview ? 3 : done;

  const reviewVisual: Visual = isVerified ? 'done' : inReview ? 'active' : 'pending';

  const activeStep = IDENTITY_STEPS.find((s) => s.id === currentStep);

  // ── Initial load — always fetch fresh for the current user ───────────────
  useEffect(() => {
    if (!token) return;
    setStatusReady(false); // show spinner until fresh data arrives
    fetchStatus(token)
      .catch(() => {})
      .finally(() => setStatusReady(true));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reset card data when token changes (new user) ─────────────────────────
  useEffect(() => {
    setCard(null);
    setCardError('');
  }, [token]);

  // ── Load card when verified ────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !isVerified || card) return;
    setCardLoading(true);
    KycService.getCard(token)
      .then(setCard)
      .catch((e) => setCardError(e instanceof Error ? e.message : 'Could not load card.'))
      .finally(() => setCardLoading(false));
  }, [token, isVerified]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-poll while in review ──────────────────────────────────────────────
  useEffect(() => {
    if (!token || !inReview) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => {
      fetchStatus(token).catch(() => {});
    }, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token, inReview]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Manual refresh ─────────────────────────────────────────────────────────
  async function handleRefresh() {
    if (!token || refreshing) return;
    setRefreshing(true);
    try { await fetchStatus(token); } finally { setRefreshing(false); }
  }

  // ── Loading (no status yet) ────────────────────────────────────────────────
  if (!kycStatus) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />
        <ScreenHeader />
        <View style={s.center}>
          <ActivityIndicator color={Brand.primary} size="large" />
        </View>
      </View>
    );
  }

  // ── Verified: show card ────────────────────────────────────────────────────
  if (isVerified) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />
        <ScreenHeader verified />
        <ScrollView
          contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {cardLoading && (
            <View style={s.center}>
              <ActivityIndicator color={Brand.primary} size="large" />
              <Text style={s.loadingText}>Loading your card…</Text>
            </View>
          )}

          {!cardLoading && cardError ? (
            <Animated.View entering={FadeInDown.delay(60)} style={s.errorWrap}>
              <Ionicons name="alert-circle-outline" size={28} color={Brand.error} />
              <Text style={s.errorText}>{cardError}</Text>
              <Pressable style={s.retryBtn} onPress={() => {
                setCardError(''); setCardLoading(true);
                KycService.getCard(token!)
                  .then(setCard).catch((e) => setCardError(e.message)).finally(() => setCardLoading(false));
              }}>
                <Text style={s.retryText}>Try again</Text>
              </Pressable>
            </Animated.View>
          ) : null}

          {!cardLoading && !cardError && card && (
            <Animated.View entering={FadeInDown.delay(60)} style={s.cardWrap}>
              <RuxstarCard card={card} />

              <View style={s.detailsCard}>
                <DetailRow icon="person-outline"         label="Name"         value={card.name ?? '—'} />
                {/* <DetailRow icon="phone-portrait-outline" label="Mobile"       value={card.mobile ? `+91 ${card.mobile}` : '—'} /> */}
                <DetailRow icon="finger-print-outline"  label="Aadhaar"      value={card.aadhaar ?? '—'} />
                <DetailRow icon="card-outline"          label="PAN"           value={card.pan ?? '—'} />
                <DetailRow icon="calendar-outline"      label="Member Since"  value={formatDate(card.memberSince)} last />
              </View>

              <View style={s.noteBox}>
                <Ionicons name="shield-checkmark-outline" size={14} color={Brand.primary} />
                <Text style={s.noteText}>
                  Your identity is verified by DigiLocker & Ruxstar. This card is valid across all Ruxstar services.
                </Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Not verified: step progress view ──────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />
      <ScreenHeader />

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(60)}>

          {/* ── Header ──────────────────────────────────────────────── */}
          <View style={s.progressHeader}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.kycLabel}>RUXSTAR CARD</Text>
              <Text style={s.kycTitle}>
                {inReview ? 'Generating your card' : 'Get your Ruxstar Card'}
              </Text>
              <Text style={s.kycSub}>
                {inReview
                  ? 'Step 4 — admin is reviewing your details.'
                  : 'Complete 3 identity checks, then admin review.'}
              </Text>
            </View>
            <View style={s.progressBadge}>
              <Text style={s.progressPct}>{progress}%</Text>
              <Text style={s.progressSteps}>{stepsComplete}/{TOTAL_STEPS}</Text>
            </View>
          </View>

          {/* ── Progress bar ─────────────────────────────────────────── */}
          <View style={s.barTrack}>
            <View style={[
              s.barFill,
              { width: `${progress}%` as any },
              inReview && s.barFillReview,
            ]} />
          </View>

          {/* ── Rejection banner ─────────────────────────────────────── */}
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

          {/* ── Step list ────────────────────────────────────────────── */}
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

          {/* ── Active step CTA ──────────────────────────────────────── */}
          {activeStep && (
            <View style={s.ctaBox}>
              <View style={s.ctaHeader}>
                <View style={s.ctaIconWrap}>
                  <Ionicons name={activeStep.icon} size={18} color={Brand.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.ctaStepLabel}>
                    Step {IDENTITY_STEPS.findIndex((x) => x.id === activeStep.id) + 1} of {TOTAL_STEPS}
                  </Text>
                  <Text style={s.ctaTitle}>Verify your {activeStep.label}</Text>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.8 }]}
                onPress={() => router.push(activeStep.route)}
              >
                <Text style={s.ctaBtnText}>{activeStep.btnLabel}</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </Pressable>
            </View>
          )}

          {/* ── In-review panel ──────────────────────────────────────── */}
          {inReview && (
            <View style={s.reviewBox}>
              <View style={s.reviewIconWrap}>
                <ActivityIndicator color="#60a5fa" size="small" />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.reviewTitle}>Admin is reviewing your submission</Text>
                <Text style={s.reviewSub}>
                  This usually takes a few minutes. Your card will appear here once approved.
                </Text>
                <Pressable style={s.refreshRow} onPress={handleRefresh} disabled={refreshing}>
                  <Ionicons
                    name={refreshing ? 'hourglass-outline' : 'sync-outline'}
                    size={13}
                    color={Brand.creamMuted}
                  />
                  <Text style={s.refreshText}>
                    {refreshing ? 'Checking…' : 'Checking automatically every 15 s'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Screen Header ────────────────────────────────────────────────────────────

function ScreenHeader({ verified }: { verified?: boolean }) {
  return (
    <View style={s.header}>
      <Text style={s.headerTitle}>Ruxstar Card</Text>
      {verified && (
        <View style={s.verifiedChip}>
          <View style={s.verifiedDot} />
          <Text style={s.verifiedChipText}>Verified</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sr = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  line: {
    position: 'absolute',
    left: 16,
    top: 34,
    bottom: 0,
    width: 1,
    backgroundColor: Brand.border1,
  },
  lineDone: { backgroundColor: 'rgba(134,239,172,0.35)' },

  circle: {
    width: 33, height: 33,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Brand.border1,
    backgroundColor: Brand.surface2,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  circleDone:   { borderColor: 'rgba(134,239,172,0.40)', backgroundColor: 'rgba(134,239,172,0.10)' },
  circleActive: { borderColor: 'rgba(255,255,255,0.30)', backgroundColor: 'rgba(255,255,255,0.10)' },
  circleReview: { borderColor: 'rgba(96,165,250,0.40)',  backgroundColor: 'rgba(96,165,250,0.10)' },

  pulseDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#60a5fa',
  },

  text: { flex: 1, paddingTop: 4, gap: 2 },
  label:       { color: Brand.creamMuted, fontSize: 14, fontWeight: '600' },
  labelDone:   { color: '#86efac' },
  labelActive: { color: Brand.cream },
  labelReview: { color: '#93c5fd' },
  sub:         { color: Brand.creamMuted, fontSize: 11 },

  doneBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(134,239,172,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(134,239,172,0.25)',
    marginTop: 6,
  },
  doneBadgeText: { color: '#86efac', fontSize: 10, fontWeight: '700' },
});

const dr = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: Spacing.two },
  border:    { borderBottomWidth: 1, borderBottomColor: Brand.border1 },
  iconWrap:  {
    width: 32, height: 32, borderRadius: Radius.sm,
    backgroundColor: Brand.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  textBlock: { flex: 1, gap: 1 },
  label:     { color: Brand.creamMuted, fontSize: 11, letterSpacing: 0.3 },
  value:     { color: Brand.cream, fontSize: 14, fontWeight: '600', fontFamily: 'monospace' },
});

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Brand.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border1,
  },
  headerTitle:    { color: Brand.cream, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  verifiedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(134,239,172,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(134,239,172,0.25)',
  },
  verifiedDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: '#86efac' },
  verifiedChipText: { color: '#86efac', fontSize: 11, fontWeight: '700' },

  body: { padding: Spacing.four, gap: Spacing.four },
  loadingText: { color: Brand.creamSub, fontSize: 14 },

  // ── Progress header ──────────────────────────────────────────────────────
  progressHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, marginBottom: Spacing.two },
  kycLabel:  { color: Brand.creamMuted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  kycTitle:  { color: Brand.cream, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  kycSub:    { color: Brand.creamSub, fontSize: 13, lineHeight: 19 },
  progressBadge: { alignItems: 'flex-end', paddingTop: 2 },
  progressPct:   { color: Brand.cream, fontSize: 22, fontWeight: '800' },
  progressSteps: { color: Brand.creamMuted, fontSize: 11 },

  // ── Progress bar ─────────────────────────────────────────────────────────
  barTrack: {
    height: 4, borderRadius: 4,
    backgroundColor: Brand.surface2,
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  barFill: {
    height: '100%', borderRadius: 4,
    backgroundColor: Brand.primary,
  },
  barFillReview: { backgroundColor: '#60a5fa' },

  // ── Rejection banner ─────────────────────────────────────────────────────
  rejectBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two,
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  rejectTitle: { color: '#fca5a5', fontSize: 13, fontWeight: '700' },
  rejectSub:   { color: '#fca5a5', fontSize: 12, opacity: 0.75, lineHeight: 17 },

  // ── Step list ────────────────────────────────────────────────────────────
  stepList: {
    backgroundColor: Brand.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Brand.border1,
    padding: Spacing.three,
  },

  // ── Active step CTA ──────────────────────────────────────────────────────
  ctaBox: {
    backgroundColor: Brand.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Brand.border1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  ctaHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  ctaIconWrap: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: Brand.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaStepLabel: { color: Brand.creamMuted, fontSize: 10, fontWeight: '600', letterSpacing: 1.5 },
  ctaTitle:     { color: Brand.cream, fontSize: 15, fontWeight: '700' },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Brand.primary,
    paddingVertical: 14,
    borderRadius: Radius.pill,
  },
  ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // ── Review panel ─────────────────────────────────────────────────────────
  reviewBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two,
    backgroundColor: 'rgba(96,165,250,0.06)',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.20)',
    padding: Spacing.three,
  },
  reviewIconWrap: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: 'rgba(96,165,250,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  reviewTitle: { color: '#93c5fd', fontSize: 13, fontWeight: '700' },
  reviewSub:   { color: Brand.creamSub, fontSize: 12, lineHeight: 17 },
  refreshRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  refreshText: { color: Brand.creamMuted, fontSize: 11 },

  // ── Verified card ────────────────────────────────────────────────────────
  errorWrap: { alignItems: 'center', paddingTop: 40, gap: Spacing.two },
  errorText: { color: Brand.error, fontSize: 14, textAlign: 'center' },
  retryBtn:  {
    paddingHorizontal: Spacing.three, paddingVertical: 10,
    borderRadius: Radius.pill, borderWidth: 1, borderColor: Brand.border2,
  },
  retryText: { color: Brand.creamSub, fontSize: 14, fontWeight: '600' },

  cardWrap:    { gap: Spacing.three },
  detailsCard: {
    backgroundColor: Brand.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Brand.border1,
    paddingHorizontal: Spacing.three,
  },
  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Brand.primaryGlow,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.15)',
    padding: Spacing.three,
  },
  noteText: { color: Brand.creamSub, fontSize: 12, lineHeight: 18, flex: 1 },
});
