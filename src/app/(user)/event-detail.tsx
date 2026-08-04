/**
 * Event Detail & Registration Screen
 * Shows full event info + registration form (individual / team)
 * Route: /(user)/event-detail?id=<eventId>
 * Mirrors web app/customer/events/[id]/page.tsx
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  getPublicEvent,
  registerForEvent,
  type PublicEvent,
} from '@/services/booking-service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return 'Date to be announced';
  return new Date(iso).toLocaleString('en-IN', {
    weekday:  'long',
    day:      'numeric',
    month:    'long',
    hour:     '2-digit',
    minute:   '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day:      'numeric',
    month:    'short',
    year:     'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon, text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={14} color={Brand.creamMuted} />
      <Text style={s.infoText}>{text}</Text>
    </View>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ label }: { label: string }) {
  return (
    <View style={s.chip}>
      <Text style={s.chipText}>{label}</Text>
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
      <View style={[s.bone, { height: 14, width: '60%' }]} />
      <View style={[s.bone, { height: 80 }]} />
    </View>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────
// Only shown for FREE events — paid events navigate directly to orders via onVerify.

function SuccessScreen({
  event,
}: {
  event: PublicEvent;
}) {
  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <View style={s.successWrap}>
        <View style={s.successIcon}>
          <Text style={{ fontSize: 40 }}>✅</Text>
        </View>

        <Text style={s.successTitle}>{"You're registered! 🎉"}</Text>

        <Text style={s.successEvent} numberOfLines={2}>{event.title}</Text>

        {event.startAt ? (
          <Text style={s.successWhen}>{formatWhen(event.startAt)}</Text>
        ) : null}

        <View style={s.freeNotice}>
          <Ionicons name="checkmark-circle" size={16} color={Brand.success} />
          <Text style={s.freeNoticeText}>Your spot is confirmed. See you there!</Text>
        </View>

        <View style={s.successActions}>
          <Pressable
            style={s.primaryBtn}
            onPress={() => router.replace('/(user)/orders' as never)}
          >
            <Ionicons name="calendar-outline" size={16} color="#fff" />
            <Text style={s.primaryBtnText}>View my bookings</Text>
          </Pressable>
          <Pressable
            style={s.secondaryBtn}
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

export default function EventDetailScreen() {
  const { id: eventId = '' } = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);

  const [event,      setEvent]      = useState<PublicEvent | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState('');
  const [done,       setDone]       = useState(false);
  const [imgError,   setImgError]   = useState(false);

  // Registration form state
  const [teamName, setTeamName] = useState('');
  const [members,  setMembers]  = useState<string[]>([]);

  // Cashfree native payment
  const { startPayment, paying } = useCashfreePayment({
    onSuccess: (_bookingId) => {
      router.replace('/(user)/orders' as never);
    },
    onError: (msg) => {
      setFormError(msg);
      setSubmitting(false);
    },
  });

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setLoadError('');
    try {
      const ev = await getPublicEvent(eventId);
      setEvent(ev);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Could not load event.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const isTeam       = event?.format === 'team';
  const teamSize     = event?.teamSize ?? 1;
  const isFull       = event?.spotsLeft === 0;
  const isClosed     = event?.status !== 'published' && event?.status !== undefined;
  const isFree       = (event?.entryFee ?? 0) === 0;
  const isTournament = event?.kind === 'tournament';

  const memberInputs = useMemo(
    () => Array.from({ length: isTeam ? Math.max(1, teamSize) : 0 }, (_, i) => members[i] ?? ''),
    [isTeam, teamSize, members],
  );

  function updateMember(index: number, value: string) {
    setMembers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleRegister() {
    if (!event || !token) {
      if (!token) Alert.alert('Sign in required', 'Please sign in to register for events.');
      return;
    }
    setFormError('');
    if (isTeam && !teamName.trim()) {
      setFormError('Please enter a team name.');
      return;
    }
    setSubmitting(true);
    try {
      const participants = isTeam
        ? memberInputs.map((n) => ({ name: n.trim() })).filter((p) => p.name)
        : [];

      const result = await registerForEvent(token, eventId, {
        teamName:     isTeam ? teamName.trim() : undefined,
        participants: participants.length > 0 ? participants : undefined,
      });

      if (result.paymentRequired && result.paymentSessionId) {
        // Trigger native Cashfree payment sheet immediately
        startPayment({
          paymentSessionId: result.paymentSessionId,
          orderId:          result.orderId,
          bookingId:        result.registrationId,
          mode:             'sandbox', // backend determines actual mode
        });
        // submitting stays true until onVerify / onError fires
      } else {
        // Free event — registered successfully
        setDone(true);
        setSubmitting(false);
      }
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Could not register. Please try again.');
      setSubmitting(false);
    }
  }

  // ── Success ─────────────────────────────────────────────────────────────────

  // SuccessScreen is only shown for FREE events — paid events navigate to orders via onVerify
  if (done && event) {
    return <SuccessScreen event={event} />;
  }

  // ── Loading / Error ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.topBar}>
          <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={18} color={Brand.cream} />
          </Pressable>
        </View>
        <Skeleton />
      </SafeAreaView>
    );
  }

  if (loadError || !event) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.topBar}>
          <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={18} color={Brand.cream} />
          </Pressable>
        </View>
        <View style={s.centered}>
          <Text style={{ fontSize: 40 }}>🔍</Text>
          <Text style={s.errorTitle}>Event not available</Text>
          <Text style={s.errorSub}>{loadError || 'This event could not be found.'}</Text>
          <Pressable style={s.retryBtn} onPress={load}>
            <Ionicons name="refresh-outline" size={14} color="#fff" />
            <Text style={s.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Detail + Registration ────────────────────────────────────────────────────

  const chips: string[] = [];
  if (isTeam)                        chips.push(`Team of ${teamSize}`);
  else if (isTournament)             chips.push('Individual entry');
  if (event.skillLevel)              chips.push(event.skillLevel);
  if (event.ageCategory)             chips.push(event.ageCategory);
  if (event.genderCategory)          chips.push(event.genderCategory);

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* Cover */}
        <View style={s.coverWrap}>
          {event.coverUrl && !imgError ? (
            <Image
              source={{ uri: event.coverUrl }}
              style={s.cover}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={s.coverFallback}>
              <Text style={s.coverEmoji}>
                {isTournament ? '🏆' : '🎫'}
              </Text>
            </View>
          )}

          {/* Back button over cover */}
          <Pressable style={s.coverBackBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </Pressable>

          {/* Kind badge */}
          <View style={s.kindBadge}>
            <Text style={s.kindBadgeText}>
              {isTournament ? 'Tournament' : 'Event'}
            </Text>
          </View>

          {/* Entry fee badge */}
          <View style={[s.feeBadge, isFree && s.feeBadgeFree]}>
            <Text style={s.feeBadgeText}>
              {isFree ? 'Free' : `₹${event.entryFee.toLocaleString('en-IN')}`}
            </Text>
          </View>
        </View>

        <View style={s.body}>
          {/* Title + organiser */}
          <Text style={s.title}>{event.title}</Text>
          {event.tournamentType ? (
            <Text style={s.subTitle}>{event.tournamentType} · by {event.businessName}</Text>
          ) : (
            <Text style={s.subTitle}>by {event.businessName}</Text>
          )}

          {/* Info rows */}
          <View style={s.infoBlock}>
            <InfoRow icon="calendar-outline" text={formatWhen(event.startAt)} />
            {event.endAt && (
              <InfoRow icon="flag-outline"      text={`Ends ${formatDate(event.endAt)}`} />
            )}
            {event.venue ? (
              <InfoRow icon="location-outline"  text={event.venue} />
            ) : null}
            {event.registrationDeadline && (
              <InfoRow icon="time-outline" text={`Registration closes ${formatDate(event.registrationDeadline)}`} />
            )}
          </View>

          {/* Chips */}
          {chips.length > 0 && (
            <View style={s.chipRow}>
              {chips.map((c) => <Chip key={c} label={c} />)}
            </View>
          )}

          {/* Capacity */}
          {event.capacity != null && (
            <View style={s.capacityRow}>
              <Ionicons name="people-outline" size={13} color={Brand.creamMuted} />
              <Text style={s.capacityText}>
                {isFull
                  ? 'Sold out'
                  : `${event.spotsLeft ?? '?'} of ${event.capacity} spots left`}
              </Text>
            </View>
          )}

          {/* Description */}
          {event.description ? (
            <View style={s.section}>
              <Text style={s.sectionLabel}>About</Text>
              <Text style={s.sectionText}>{event.description}</Text>
            </View>
          ) : null}

          {/* Rules */}
          {event.rules ? (
            <View style={s.section}>
              <Text style={s.sectionLabel}>Rules & eligibility</Text>
              <Text style={s.sectionText}>{event.rules}</Text>
            </View>
          ) : null}

          {/* ── Registration box ──────────────────────────────────────────── */}
          <View style={s.regBox}>
            {/* Price header */}
            <View style={s.priceRow}>
              <Text style={s.price}>
                {isFree
                  ? 'Free entry'
                  : `₹${event.entryFee.toLocaleString('en-IN')}`}
              </Text>
              {!isFree && (
                <Text style={s.priceUnit}>
                  per {isTeam ? 'team' : 'entry'}
                </Text>
              )}
            </View>

            {/* Closed / Full states */}
            {isClosed ? (
              <View style={s.closedBanner}>
                <Ionicons name="lock-closed-outline" size={14} color={Brand.creamMuted} />
                <Text style={s.closedText}>Registration is closed.</Text>
              </View>
            ) : isFull ? (
              <View style={s.fullBanner}>
                <Ionicons name="close-circle-outline" size={14} color={Brand.error} />
                <Text style={s.fullText}>This event is full.</Text>
              </View>
            ) : (
              <>
                {/* Team form */}
                {isTeam && (
                  <View style={s.teamForm}>
                    <Text style={s.fieldLabel}>Team name <Text style={s.req}>*</Text></Text>
                    <TextInput
                      style={s.input}
                      placeholder="Your team's name"
                      placeholderTextColor={Brand.creamMuted}
                      value={teamName}
                      onChangeText={(v) => { setTeamName(v); setFormError(''); }}
                    />

                    <Text style={[s.fieldLabel, { marginTop: Spacing.two }]}>
                      Players (optional)
                    </Text>
                    {memberInputs.map((val, i) => (
                      <TextInput
                        key={i}
                        style={[s.input, { marginTop: Spacing.one + 2 }]}
                        placeholder={`Player ${i + 1}${i === 0 ? ' (captain)' : ''}`}
                        placeholderTextColor={Brand.creamMuted}
                        value={val}
                        onChangeText={(v) => updateMember(i, v)}
                      />
                    ))}
                  </View>
                )}

                {/* Error */}
                {formError ? (
                  <View style={s.formErr}>
                    <Ionicons name="alert-circle" size={14} color={Brand.error} />
                    <Text style={s.formErrText}>{formError}</Text>
                  </View>
                ) : null}

                {/* Register button */}
                <Pressable
                  style={[s.regBtn, (submitting || paying) && s.regBtnDisabled]}
                  onPress={handleRegister}
                  disabled={submitting || paying}
                >
                  {(submitting || paying) ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={s.regBtnText}>{paying ? 'Opening payment…' : 'Processing…'}</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons
                        name={isFree ? 'checkmark-circle-outline' : 'card-outline'}
                        size={18}
                        color="#fff"
                      />
                      <Text style={s.regBtnText}>
                        {isFree
                          ? 'Register for free'
                          : `Pay & register · ₹${event.entryFee.toLocaleString('en-IN')}`}
                      </Text>
                    </>
                  )}
                </Pressable>

                {!isFree && (
                  <Text style={s.payNote}>
                    <Ionicons name="shield-checkmark-outline" size={10} color={Brand.creamMuted} />
                    {'  '}Secure payment via Cashfree
                  </Text>
                )}
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
  screen:      { flex: 1, backgroundColor: Brand.bg },
  scrollContent: { paddingBottom: 40 },

  // Top bar (loading/error states)
  topBar:  { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  backBtn: { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Brand.surface1, borderWidth: 1, borderColor: Brand.border1, alignItems: 'center', justifyContent: 'center' },

  // Cover
  coverWrap:     { height: 220, position: 'relative' },
  cover:         { width: '100%', height: '100%' },
  coverFallback: { width: '100%', height: '100%', backgroundColor: Brand.primaryGlow, alignItems: 'center', justifyContent: 'center' },
  coverEmoji:    { fontSize: 64 },
  coverBackBtn:  { position: 'absolute', top: Spacing.three, left: Spacing.three, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  kindBadge:     { position: 'absolute', top: Spacing.three, right: Spacing.three, backgroundColor: 'rgba(0,0,0,0.50)', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  kindBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  feeBadge:      { position: 'absolute', bottom: Spacing.two, right: Spacing.two, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  feeBadgeFree:  { backgroundColor: 'rgba(22,163,74,0.85)' },
  feeBadgeText:  { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Body
  body:     { padding: Spacing.four, gap: Spacing.three },
  title:    { fontSize: 22, fontWeight: '800', color: Brand.cream, letterSpacing: -0.3, lineHeight: 28 },
  subTitle: { fontSize: 13, color: Brand.primary, fontWeight: '600' },

  // Info block
  infoBlock: { gap: Spacing.two },
  infoRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText:  { fontSize: 13, color: Brand.creamSub, flex: 1, lineHeight: 18 },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2 },
  chip:    { paddingHorizontal: Spacing.two + 2, paddingVertical: 5, borderRadius: Radius.pill, backgroundColor: Brand.surface1, borderWidth: 1, borderColor: Brand.border1 },
  chipText:{ fontSize: 11, fontWeight: '600', color: Brand.creamSub },

  // Capacity
  capacityRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  capacityText: { fontSize: 12, color: Brand.creamMuted },

  // Sections
  section:      { gap: 6 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Brand.cream },
  sectionText:  { fontSize: 13, color: Brand.creamSub, lineHeight: 20 },

  // Registration box
  regBox:   { backgroundColor: Brand.surface1, borderRadius: Radius.xl, borderWidth: 1, borderColor: Brand.border1, padding: Spacing.three, gap: Spacing.two, marginTop: Spacing.one },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  price:    { fontSize: 22, fontWeight: '800', color: Brand.success, letterSpacing: -0.4 },
  priceUnit:{ fontSize: 12, color: Brand.creamMuted },

  closedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Brand.surface2, borderRadius: Radius.md, padding: Spacing.two + 2 },
  closedText:   { fontSize: 13, color: Brand.creamSub },
  fullBanner:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(220,38,38,0.06)', borderRadius: Radius.md, padding: Spacing.two + 2, borderWidth: 1, borderColor: 'rgba(220,38,38,0.15)' },
  fullText:     { fontSize: 13, color: Brand.error },

  // Team form
  teamForm:   { gap: Spacing.one + 2 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Brand.creamSub },
  req:        { color: Brand.error },
  input: {
    borderWidth: 1, borderColor: Brand.border2, borderRadius: Radius.md,
    paddingHorizontal: Spacing.three, paddingVertical: 11,
    fontSize: 14, color: Brand.cream, backgroundColor: Brand.bg,
  },

  // Error
  formErr:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(220,38,38,0.06)', borderRadius: Radius.md, padding: Spacing.two, borderWidth: 1, borderColor: 'rgba(220,38,38,0.15)' },
  formErrText: { fontSize: 12, color: Brand.error, flex: 1 },

  // Register button
  regBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Brand.primary, borderRadius: Radius.lg, paddingVertical: 16, shadowColor: Brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  regBtnDisabled: { opacity: 0.6 },
  regBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  payNote:        { textAlign: 'center', fontSize: 11, color: Brand.creamMuted, lineHeight: 16 },

  // Centered states
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
  errorTitle: { fontSize: 16, fontWeight: '700', color: Brand.cream },
  errorSub:   { fontSize: 13, color: Brand.creamSub, textAlign: 'center' },
  retryBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Brand.primary, borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, marginTop: Spacing.one },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Skeleton
  bone: { backgroundColor: Brand.surface2, borderRadius: Radius.md },

  // Success
  successWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  successIcon:    { width: 80, height: 80, borderRadius: 40, backgroundColor: Brand.surface1, borderWidth: 1, borderColor: Brand.border1, alignItems: 'center', justifyContent: 'center' },
  successTitle:   { fontSize: 22, fontWeight: '800', color: Brand.cream, textAlign: 'center' },
  successEvent:   { fontSize: 15, fontWeight: '600', color: Brand.creamSub, textAlign: 'center' },
  successWhen:    { fontSize: 13, color: Brand.creamMuted, textAlign: 'center' },
  payNotice:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(217,119,6,0.06)', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(217,119,6,0.20)', padding: Spacing.three },
  payNoticeText:  { flex: 1, fontSize: 13, color: Brand.creamSub, lineHeight: 19 },
  payNoticeLink:  { color: Brand.primary, fontWeight: '700' },
  freeNotice:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(22,163,74,0.06)', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(22,163,74,0.20)', padding: Spacing.three },
  freeNoticeText: { fontSize: 13, color: Brand.creamSub },
  successActions:  { gap: Spacing.two, width: '100%', marginTop: Spacing.two },
  payBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Brand.success, borderRadius: Radius.lg, paddingVertical: 14, shadowColor: Brand.success, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  payBtnText:      { color: '#fff', fontWeight: '800', fontSize: 15 },
  primaryBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Brand.primary, borderRadius: Radius.lg, paddingVertical: 14 },
  primaryBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  secondaryBtn:    { alignItems: 'center', paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border1, backgroundColor: Brand.surface1 },
  secondaryBtnText:{ color: Brand.creamSub, fontWeight: '600', fontSize: 14 },
});
