/**
 * Creator Offer Detail & Booking Screen
 * Route: /(user)/creator-offer?id=<offerId>
 * Mirrors web app/customer/creator/[offerId]/page.tsx — a customer discovers
 * a creator's shoutout/collab/appearance offer (surfaced on the home feed)
 * and pays to book it.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useCashfreePayment } from '@/utils/cashfree-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import {
  bookCreatorOffer,
  getPublicCreatorOffer,
  type CreatorOffer,
} from '@/services/creator-offer-service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function kindLabel(kind: string): string {
  if (kind === 'shoutout')   return 'Shoutout';
  if (kind === 'appearance') return 'Appearance';
  return 'Collab';
}

function kindEmoji(kind: string): string {
  if (kind === 'shoutout')   return '📣';
  if (kind === 'appearance') return '🎤';
  return '✨';
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={14} color={Brand.creamMuted} />
      <Text style={s.infoText}>{text}</Text>
    </View>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <View style={{ gap: Spacing.three, padding: Spacing.four }}>
      <View style={[s.bone, { height: 200, borderRadius: Radius.xl }]} />
      <View style={[s.bone, { height: 24, width: '70%' }]} />
      <View style={[s.bone, { height: 14, width: '50%' }]} />
      <View style={[s.bone, { height: 80 }]} />
    </View>
  );
}

// ─── Success screen — only shown for FREE offers ─────────────────────────────
// Paid offers navigate to payment-status (which polls) via onVerify.

function SuccessScreen({ offer }: { offer: CreatorOffer }) {
  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <View style={s.successWrap}>
        <View style={s.successIcon}>
          <Text style={{ fontSize: 40 }}>✅</Text>
        </View>
        <Text style={s.successTitle}>Booking confirmed! 🎉</Text>
        <Text style={s.successEvent} numberOfLines={2}>{offer.title}</Text>
        <View style={s.freeNotice}>
          <Ionicons name="checkmark-circle" size={16} color={Brand.success} />
          <Text style={s.freeNoticeText}>{offer.businessName} will be in touch soon.</Text>
        </View>
        <View style={s.successActions}>
          <Pressable
            style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.replace('/(user)/orders' as never)}
          >
            <Ionicons name="calendar-outline" size={16} color="#fff" />
            <Text style={s.primaryBtnText}>View my bookings</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.replace('/(user)/index' as never)}
          >
            <Text style={s.secondaryBtnText}>Discover more</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CreatorOfferScreen() {
  const { id: offerId = '' } = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);

  const [offer,      setOffer]      = useState<CreatorOffer | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState('');
  const [done,       setDone]       = useState(false);
  const [imgError,   setImgError]   = useState(false);
  const [brief,      setBrief]      = useState('');

  const { startPayment, paying } = useCashfreePayment({
    onSuccess: (bookingId) => {
      router.replace({ pathname: '/(user)/payment-status', params: { bookingId, kind: 'creator' } } as never);
    },
    onError: (msg) => {
      setFormError(msg);
      setSubmitting(false);
    },
  });

  const load = useCallback(async () => {
    if (!offerId) return;
    setLoading(true);
    setLoadError('');
    try {
      setOffer(await getPublicCreatorOffer(offerId));
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Could not load this offer.');
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  useEffect(() => { load(); }, [load]);

  const isFull = offer?.spotsLeft === 0;
  const isFree = (offer?.price ?? 0) <= 0;

  async function handleBook() {
    if (!offer) return;
    if (!token) { setFormError('Please sign in to book.'); return; }
    setFormError('');
    if (!brief.trim()) {
      setFormError('Describe what you need for this collab.');
      return;
    }
    setSubmitting(true);
    try {
      const { booking, payment } = await bookCreatorOffer(token, offerId, brief.trim());
      if (payment) {
        startPayment({
          paymentSessionId: payment.paymentSessionId,
          orderId:          payment.orderId,
          bookingId:        booking.id,
          mode:             payment.mode,
        });
        // submitting stays true until onVerify / onError fires
      } else {
        setDone(true);
        setSubmitting(false);
      }
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Could not start booking.');
      setSubmitting(false);
    }
  }

  // ── Success (free offers only) ────────────────────────────────────────────

  if (done && offer) {
    return <SuccessScreen offer={offer} />;
  }

  // ── Loading / Error ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.topBar}>
          <Pressable style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={18} color={Brand.cream} />
          </Pressable>
        </View>
        <Skeleton />
      </SafeAreaView>
    );
  }

  if (loadError || !offer) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.topBar}>
          <Pressable style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={18} color={Brand.cream} />
          </Pressable>
        </View>
        <View style={s.centered}>
          <Text style={{ fontSize: 40 }}>🔍</Text>
          <Text style={s.errorTitle}>Offer not available</Text>
          <Text style={s.errorSub}>{loadError || 'This offer could not be found.'}</Text>
          <Pressable style={({ pressed }) => [s.retryBtn, pressed && { opacity: 0.7 }]} onPress={load}>
            <Ionicons name="refresh-outline" size={14} color="#fff" />
            <Text style={s.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Detail + Booking ──────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <View style={s.coverWrap}>
          {offer.coverUrl && !imgError ? (
            <Image source={{ uri: offer.coverUrl }} style={s.cover} resizeMode="cover" onError={() => setImgError(true)} />
          ) : (
            <View style={s.coverFallback}>
              <Text style={s.coverEmoji}>{kindEmoji(offer.kind)}</Text>
            </View>
          )}

          <Pressable style={({ pressed }) => [s.coverBackBtn, pressed && { opacity: 0.7 }]} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </Pressable>

          <View style={s.kindBadge}>
            <Text style={s.kindBadgeText}>{kindLabel(offer.kind)}</Text>
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.title}>{offer.title}</Text>
          <Text style={s.subTitle}>by {offer.businessName}</Text>

          <View style={s.infoBlock}>
            {offer.platforms.length > 0 && (
              <InfoRow icon="share-social-outline" text={`Platforms: ${offer.platforms.join(', ')}`} />
            )}
            {offer.turnaroundDays != null && (
              <InfoRow
                icon="time-outline"
                text={`Typical turnaround: ${offer.turnaroundDays} day${offer.turnaroundDays === 1 ? '' : 's'}`}
              />
            )}
          </View>

          {offer.description ? (
            <View style={s.section}>
              <Text style={s.sectionLabel}>About</Text>
              <Text style={s.sectionText}>{offer.description}</Text>
            </View>
          ) : null}

          <View style={s.bookBox}>
            <View style={s.priceRow}>
              <Text style={s.price}>{isFree ? 'Free' : `₹${offer.price.toLocaleString('en-IN')}`}</Text>
              <Text style={s.priceUnit}>Pay securely via Ruxstar</Text>
            </View>

            {isFull ? (
              <View style={s.fullBanner}>
                <Ionicons name="close-circle-outline" size={14} color={Brand.error} />
                <Text style={s.fullText}>This offer is full right now.</Text>
              </View>
            ) : (
              <>
                <Text style={[s.fieldLabel, { marginTop: Spacing.one }]}>Your brief</Text>
                <TextInput
                  style={s.textarea}
                  placeholder="What should the creator deliver?"
                  placeholderTextColor={Brand.creamMuted}
                  value={brief}
                  onChangeText={(v) => { setBrief(v); setFormError(''); }}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                {formError ? (
                  <View style={s.formErr}>
                    <Ionicons name="alert-circle" size={14} color={Brand.error} />
                    <Text style={s.formErrText}>{formError}</Text>
                  </View>
                ) : null}

                <Pressable
                  style={({ pressed }) => [
                    s.bookBtn,
                    (submitting || paying) && s.bookBtnDisabled,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={handleBook}
                  disabled={submitting || paying}
                >
                  {(submitting || paying) ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={s.bookBtnText}>{paying ? 'Opening payment…' : 'Processing…'}</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name={isFree ? 'checkmark-circle-outline' : 'card-outline'} size={18} color="#fff" />
                      <Text style={s.bookBtnText}>{isFree ? 'Book for free' : 'Pay & book'}</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: Brand.bg },
  scrollContent: { paddingBottom: 40 },

  topBar:  { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  backBtn: { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Brand.surface1, borderWidth: 1, borderColor: Brand.border1, alignItems: 'center', justifyContent: 'center' },

  coverWrap:     { height: 200, position: 'relative' },
  cover:         { width: '100%', height: '100%' },
  coverFallback: { width: '100%', height: '100%', backgroundColor: Brand.primaryGlow, alignItems: 'center', justifyContent: 'center' },
  coverEmoji:    { fontSize: 60 },
  coverBackBtn:  { position: 'absolute', top: Spacing.three, left: Spacing.three, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  kindBadge:     { position: 'absolute', top: Spacing.three, right: Spacing.three, backgroundColor: 'rgba(0,0,0,0.50)', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  kindBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  body:     { padding: Spacing.four, gap: Spacing.three },
  title:    { fontSize: 22, fontWeight: '800', color: Brand.cream, letterSpacing: -0.3, lineHeight: 28 },
  subTitle: { fontSize: 13, color: Brand.primary, fontWeight: '600' },

  infoBlock: { gap: Spacing.two },
  infoRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText:  { fontSize: 13, color: Brand.creamSub, flex: 1, lineHeight: 18 },

  section:      { gap: 6 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Brand.cream },
  sectionText:  { fontSize: 13, color: Brand.creamSub, lineHeight: 20 },

  bookBox:  { backgroundColor: Brand.surface1, borderRadius: Radius.xl, borderWidth: 1, borderColor: Brand.border1, padding: Spacing.three, gap: Spacing.two, marginTop: Spacing.one },
  priceRow: { gap: 2 },
  price:    { fontSize: 22, fontWeight: '800', color: Brand.success, letterSpacing: -0.4 },
  priceUnit:{ fontSize: 12, color: Brand.creamMuted },

  fullBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(220,38,38,0.06)', borderRadius: Radius.md, padding: Spacing.two + 2, borderWidth: 1, borderColor: 'rgba(220,38,38,0.15)' },
  fullText:   { fontSize: 13, color: Brand.error },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: Brand.creamSub },
  textarea: {
    borderWidth: 1, borderColor: Brand.border2, borderRadius: Radius.md,
    paddingHorizontal: Spacing.three, paddingVertical: 11, minHeight: 96,
    fontSize: 14, color: Brand.cream, backgroundColor: Brand.bg,
  },

  formErr:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(220,38,38,0.06)', borderRadius: Radius.md, padding: Spacing.two, borderWidth: 1, borderColor: 'rgba(220,38,38,0.15)' },
  formErrText: { fontSize: 12, color: Brand.error, flex: 1 },

  bookBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Brand.primary, borderRadius: Radius.lg, paddingVertical: 16, shadowColor: Brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  bookBtnDisabled: { opacity: 0.6 },
  bookBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },

  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
  errorTitle: { fontSize: 16, fontWeight: '700', color: Brand.cream },
  errorSub:   { fontSize: 13, color: Brand.creamSub, textAlign: 'center' },
  retryBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Brand.primary, borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, marginTop: Spacing.one },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  bone: { backgroundColor: Brand.surface2, borderRadius: Radius.md },

  successWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  successIcon:    { width: 80, height: 80, borderRadius: 40, backgroundColor: Brand.surface1, borderWidth: 1, borderColor: Brand.border1, alignItems: 'center', justifyContent: 'center' },
  successTitle:   { fontSize: 22, fontWeight: '800', color: Brand.cream, textAlign: 'center' },
  successEvent:   { fontSize: 15, fontWeight: '600', color: Brand.creamSub, textAlign: 'center' },
  freeNotice:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(22,163,74,0.06)', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(22,163,74,0.20)', padding: Spacing.three },
  freeNoticeText: { fontSize: 13, color: Brand.creamSub },
  successActions: { gap: Spacing.two, width: '100%', marginTop: Spacing.two },
  primaryBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Brand.primary, borderRadius: Radius.lg, paddingVertical: 14 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  secondaryBtn:   { alignItems: 'center', paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border1, backgroundColor: Brand.surface1 },
  secondaryBtnText: { color: Brand.creamSub, fontWeight: '600', fontSize: 14 },
});
