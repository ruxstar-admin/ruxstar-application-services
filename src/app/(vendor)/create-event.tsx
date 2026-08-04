/**
 * Create Event Wizard — 5 steps
 * Basics → Participation → Schedule → Entry Fee → Review
 *
 * Route: /(vendor)/create-event?businessId=<id>&businessName=<name>&typeId=<id>&typeLabel=<label>
 * Mirrors web components/vendor-event-wizard.tsx
 */

import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { DateTimeField } from '@/components/ui/DateTimePickers';
import {
  createVendorEvent,
  defaultEventKindForBusiness,
  combineDateTime,
  type EventKind,
  type EventFormat,
} from '@/services/vendor-event-service';

// ─── Step types ───────────────────────────────────────────────────────────────

type StepId = 'basics' | 'participation' | 'schedule' | 'entry' | 'review';

const STEPS: { id: StepId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'basics',        label: 'Basics',       icon: 'document-text-outline'   },
  { id: 'participation', label: 'Participation', icon: 'people-outline'          },
  { id: 'schedule',      label: 'Schedule',      icon: 'calendar-outline'        },
  { id: 'entry',         label: 'Entry Fee',     icon: 'cash-outline'            },
  { id: 'review',        label: 'Review',        icon: 'checkmark-circle-outline'},
];

const STEP_TITLES: Record<StepId, string> = {
  basics:        'Event details',
  participation: 'Who can join',
  schedule:      'When & where',
  entry:         'Entry fee',
  review:        'Rules & review',
};

const STEP_HINTS: Record<StepId, string> = {
  basics:        'Name your event and add a short description.',
  participation: 'Set capacity and eligibility.',
  schedule:      'Set the date, time and location.',
  entry:         'Charge an entry fee, or keep it free.',
  review:        'Add rules, then save as a draft.',
};

// ─── Shared field style ───────────────────────────────────────────────────────

const fieldStyle: object = {
  borderWidth:       1,
  borderColor:       Brand.border2,
  borderRadius:      Radius.md,
  paddingHorizontal: Spacing.three,
  paddingVertical:   11,
  fontSize:          14,
  color:             Brand.cream,
  backgroundColor:   Brand.surface1,
};

// ─── Format toggle ────────────────────────────────────────────────────────────

function FormatToggle({
  format,
  onChange,
}: {
  format:   EventFormat;
  onChange: (f: EventFormat) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.two }}>
      {(['individual', 'team'] as EventFormat[]).map((f) => {
        const active = format === f;
        return (
          <Pressable
            key={f}
            style={[ft.btn, active && ft.btnActive]}
            onPress={() => onChange(f)}
          >
            <Text style={ft.icon}>{f === 'individual' ? '👤' : '👥'}</Text>
            <Text style={[ft.label, active && ft.labelActive]}>
              {f === 'individual' ? 'Individual' : 'Team'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const ft = StyleSheet.create({
  btn:       { flex: 1, alignItems: 'center', paddingVertical: Spacing.three, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Brand.border1, backgroundColor: Brand.surface1, gap: Spacing.one },
  btnActive: { borderColor: Brand.primary, backgroundColor: Brand.primaryGlow },
  icon:      { fontSize: 22 },
  label:     { fontSize: 13, fontWeight: '600', color: Brand.creamSub },
  labelActive: { color: Brand.primary },
});

// DateTimeField is imported from @/components/ui/DateTimePickers (replaces the
// old manual DateTimeRow that used two TextInput fields)

// ─── Review row ───────────────────────────────────────────────────────────────

function ReviewRow({ label: l, value }: { label: string; value: string }) {
  return (
    <View style={rv.row}>
      <Text style={rv.label}>{l}</Text>
      <Text style={rv.value}>{value || '—'}</Text>
    </View>
  );
}

const rv = StyleSheet.create({
  row:   { flexDirection: 'row', gap: Spacing.two, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Brand.border1 },
  label: { width: 96, fontSize: 12, color: Brand.creamMuted, flexShrink: 0 },
  value: { flex: 1, fontSize: 13, color: Brand.cream, fontWeight: '500' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CreateEventScreen() {
  const token = useAuthStore((s) => s.token);
  const {
    businessId   = '',
    businessName = '',
    typeId       = '',
    typeLabel    = '',
  } = useLocalSearchParams<{
    businessId:   string;
    businessName: string;
    typeId:       string;
    typeLabel:    string;
  }>();

  const kind:         EventKind = defaultEventKindForBusiness(typeId, typeLabel);
  const isTournament: boolean   = kind === 'tournament';

  // ── Form state ──────────────────────────────────────────────────────────────
  const [stepIndex,      setStepIndex]      = useState(0);
  const [busy,           setBusy]           = useState(false);
  const [error,          setError]          = useState('');

  // Basics
  const [tournamentType, setTournamentType] = useState(isTournament ? typeLabel : '');
  const [title,          setTitle]          = useState('');
  const [description,    setDescription]    = useState('');

  // Participation
  const [format,         setFormat]         = useState<EventFormat>('individual');
  const [teamSize,       setTeamSize]       = useState('');
  const [capacity,       setCapacity]       = useState('');
  const [skillLevel,     setSkillLevel]     = useState('');
  const [ageCategory,    setAgeCategory]    = useState('');
  const [genderCategory, setGenderCategory] = useState('');

  // Schedule
  const [startDate,   setStartDate]   = useState('');
  const [startTime,   setStartTime]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [endTime,     setEndTime]     = useState('');
  const [deadlineDate,setDeadlineDate]= useState('');
  const [deadlineTime,setDeadlineTime]= useState('');
  const [venue,       setVenue]       = useState('');

  // Entry fee
  const [entryFee, setEntryFee] = useState('');
  const isFree = !entryFee.trim() || Number(entryFee) === 0;

  // Review
  const [rules, setRules] = useState('');

  const scrollRef = useRef<ScrollView>(null);

  const currentStep = STEPS[stepIndex];
  const totalSteps  = STEPS.length;
  const progress    = (stepIndex + 1) / totalSteps;

  const isTeam = isTournament && format === 'team';

  // ── Validation ──────────────────────────────────────────────────────────────

  function validateStep(): string {
    const id = currentStep.id;
    if (id === 'basics' && !title.trim()) return 'Please add a title.';
    if (id === 'participation' && isTeam) {
      const ts = Number(teamSize);
      if (!teamSize.trim() || !Number.isFinite(ts) || ts < 1) {
        return 'Team tournaments require a team size.';
      }
    }
    if (id === 'schedule') {
      if (!startDate.trim()) return 'Please set a start date (YYYY-MM-DD).';
      if (!combineDateTime(startDate, startTime)) return 'Invalid start date — use YYYY-MM-DD format.';
    }
    if (id === 'entry') {
      const fee = Number(entryFee);
      if (entryFee.trim() && (!Number.isFinite(fee) || fee < 0)) {
        return 'Enter a valid entry fee (or leave blank for free).';
      }
    }
    return '';
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  function goBack() {
    setError('');
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      router.navigate('/(vendor)/businesses' as never);
    }
  }

  async function handleContinue() {
    const validationError = validateStep();
    if (validationError) { setError(validationError); return; }
    setError('');

    if (currentStep.id !== 'review') {
      setStepIndex((i) => i + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      return;
    }

    // ── Final submit ──
    if (!token || !businessId) return;
    setBusy(true);
    try {
      const startIso    = combineDateTime(startDate, startTime);
      const endIso      = combineDateTime(endDate, endTime);
      const deadlineIso = combineDateTime(deadlineDate, deadlineTime);

      await createVendorEvent(token, {
        businessId,
        kind,
        title:                title.trim(),
        description:          description.trim(),
        tournamentType:       tournamentType.trim(),
        format:               isTournament ? format : 'individual',
        teamSize:             isTeam && teamSize ? Number(teamSize) : null,
        capacity:             capacity ? Number(capacity) : null,
        entryFee:             entryFee ? Number(entryFee) : 0,
        venue:                venue.trim(),
        skillLevel:           skillLevel.trim(),
        ageCategory:          ageCategory.trim(),
        genderCategory:       genderCategory.trim(),
        rules:                rules.trim(),
        startAt:              startIso ?? undefined,
        endAt:                endIso,
        registrationDeadline: deadlineIso,
      });

      Alert.alert(
        isTournament ? 'Tournament Created! 🏆' : 'Event Created! 🎫',
        'Saved as a draft. Publish it from the web dashboard when you\'re ready.',
        [{ text: 'OK', onPress: () => router.replace('/(vendor)/businesses' as never) }],
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>

      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.iconBtn} onPress={goBack} disabled={busy} hitSlop={8}>
          <Ionicons name="arrow-back" size={18} color={Brand.cream} />
        </Pressable>

        <View style={s.headerCenter}>
          <View style={s.stepChip}>
            <Ionicons name={currentStep.icon} size={11} color={Brand.primary} />
            <Text style={s.stepChipText}>
              Step {stepIndex + 1} of {totalSteps} · {currentStep.label}
            </Text>
          </View>
          <Text style={s.headerTitle} numberOfLines={1}>
            {STEP_TITLES[currentStep.id]}
          </Text>
          <Text style={s.headerHint}>{STEP_HINTS[currentStep.id]}</Text>
          {businessName ? (
            <View style={s.businessTag}>
              <Text style={s.businessTagText}>
                {isTournament ? '🏆 Tournament' : '🎫 Event'}
                {businessName ? ` · ${businessName}` : ''}
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable style={s.iconBtn} onPress={() => router.navigate('/(vendor)/businesses' as never)} disabled={busy} hitSlop={8}>
          <Ionicons name="close" size={18} color={Brand.creamSub} />
        </Pressable>
      </View>

      {/* Progress bar + dots */}
      <View style={s.progressSection}>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
        <View style={s.dotRow}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[s.dot, i < stepIndex && s.dotDone, i === stepIndex && s.dotActive]}
            >
              {i < stepIndex && <Ionicons name="checkmark" size={8} color="#fff" />}
            </View>
          ))}
        </View>
      </View>

      {/* Error banner */}
      {error ? (
        <View style={s.errorBanner}>
          <View style={s.errorIconWrap}>
            <Ionicons name="alert-circle" size={15} color={Brand.error} />
          </View>
          <Text style={s.errorText}>{error}</Text>
          <Pressable onPress={() => setError('')} hitSlop={8}>
            <Ionicons name="close-circle-outline" size={16} color={Brand.creamMuted} />
          </Pressable>
        </View>
      ) : null}

      {/* Content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Step 1: Basics ───────────────────────────────────────────── */}
          {currentStep.id === 'basics' && (
            <View style={s.stepWrap}>
              {isTournament && (
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>Sport / game type</Text>
                  <TextInput
                    style={[fieldStyle, s.input]}
                    placeholder="Cricket, Football, Esports, Chess…"
                    placeholderTextColor={Brand.creamMuted}
                    value={tournamentType}
                    onChangeText={(v) => { setTournamentType(v); setError(''); }}
                  />
                  <Text style={s.hint}>Optional — which sport this tournament is for.</Text>
                </View>
              )}

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>
                  Title <Text style={s.required}>*</Text>
                </Text>
                <TextInput
                  style={[fieldStyle, s.input]}
                  placeholder={isTournament ? 'e.g. Summer Cricket Cup 2026' : 'e.g. Live Music Night'}
                  placeholderTextColor={Brand.creamMuted}
                  value={title}
                  onChangeText={(v) => { setTitle(v); setError(''); }}
                  returnKeyType="next"
                />
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Description</Text>
                <TextInput
                  style={[fieldStyle, s.input, s.multiline]}
                  placeholder="What's this about? What should participants expect?"
                  placeholderTextColor={Brand.creamMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  maxLength={2000}
                  textAlignVertical="top"
                />
                <Text style={s.charCount}>{description.length}/2000</Text>
              </View>
            </View>
          )}

          {/* ── Step 2: Participation ─────────────────────────────────────── */}
          {currentStep.id === 'participation' && (
            <View style={s.stepWrap}>
              {isTournament && (
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>Format</Text>
                  <FormatToggle format={format} onChange={setFormat} />
                </View>
              )}

              <View style={s.twoCol}>
                {isTeam && (
                  <View style={[s.fieldGroup, { flex: 1 }]}>
                    <Text style={s.fieldLabel}>
                      Players per team <Text style={s.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[fieldStyle, s.input]}
                      placeholder="e.g. 11"
                      placeholderTextColor={Brand.creamMuted}
                      value={teamSize}
                      onChangeText={(v) => { setTeamSize(v.replace(/\D/g, '')); setError(''); }}
                      keyboardType="numeric"
                    />
                  </View>
                )}
                <View style={[s.fieldGroup, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>
                    {isTournament ? (isTeam ? 'Max teams' : 'Max participants') : 'Max attendees'}
                  </Text>
                  <TextInput
                    style={[fieldStyle, s.input]}
                    placeholder="Unlimited"
                    placeholderTextColor={Brand.creamMuted}
                    value={capacity}
                    onChangeText={(v) => setCapacity(v.replace(/\D/g, ''))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {isTournament && (
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>Filters</Text>
                  <View style={s.twoCol}>
                    <TextInput
                      style={[fieldStyle, s.input, { flex: 1 }]}
                      placeholder="Skill level"
                      placeholderTextColor={Brand.creamMuted}
                      value={skillLevel}
                      onChangeText={setSkillLevel}
                    />
                    <TextInput
                      style={[fieldStyle, s.input, { flex: 1 }]}
                      placeholder="Age category"
                      placeholderTextColor={Brand.creamMuted}
                      value={ageCategory}
                      onChangeText={setAgeCategory}
                    />
                  </View>
                  <TextInput
                    style={[fieldStyle, s.input, { marginTop: Spacing.two }]}
                    placeholder="Gender category (Open / Men / Women / Mixed)"
                    placeholderTextColor={Brand.creamMuted}
                    value={genderCategory}
                    onChangeText={setGenderCategory}
                  />
                  <Text style={s.hint}>All optional — helps players find the right event.</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Step 3: Schedule ──────────────────────────────────────────── */}
          {currentStep.id === 'schedule' && (
            <View style={s.stepWrap}>
              <DateTimeField
                label="Starts"
                date={startDate}
                time={startTime}
                onDateChange={(v) => { setStartDate(v); setError(''); }}
                onTimeChange={(v) => { setStartTime(v); setError(''); }}
                minDate={new Date()}
              />

              <DateTimeField
                label="Ends"
                date={endDate}
                time={endTime}
                onDateChange={setEndDate}
                onTimeChange={setEndTime}
                optional
              />

              <DateTimeField
                label="Registration closes"
                date={deadlineDate}
                time={deadlineTime}
                onDateChange={setDeadlineDate}
                onTimeChange={setDeadlineTime}
                optional
              />

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Venue / location</Text>
                <TextInput
                  style={[fieldStyle, s.input]}
                  placeholder="Address or location name"
                  placeholderTextColor={Brand.creamMuted}
                  value={venue}
                  onChangeText={setVenue}
                />
              </View>

              <View style={s.infoBox}>
                <Ionicons name="information-circle-outline" size={13} color={Brand.primary} />
                <Text style={s.infoText}>Enter dates as YYYY-MM-DD and times as HH:MM (24-hour).</Text>
              </View>
            </View>
          )}

          {/* ── Step 4: Entry Fee ─────────────────────────────────────────── */}
          {currentStep.id === 'entry' && (
            <View style={s.stepWrap}>
              <View style={s.feeCard}>
                <View style={s.feeRow}>
                  <Text style={s.rupee}>₹</Text>
                  <TextInput
                    style={[fieldStyle, { flex: 1, paddingLeft: Spacing.two }]}
                    placeholder="0"
                    placeholderTextColor={Brand.creamMuted}
                    value={entryFee}
                    onChangeText={(v) => { setEntryFee(v.replace(/\D/g, '')); setError(''); }}
                    keyboardType="numeric"
                  />
                </View>
                <Text style={s.hint}>
                  Fee per {isTeam ? 'team' : 'entry'}. Leave blank or enter 0 for free entry.
                </Text>

                <View style={[s.feeBadge, isFree ? s.feeBadgeFree : s.feeBadgePaid]}>
                  <Ionicons
                    name={isFree ? 'gift-outline' : 'card-outline'}
                    size={14}
                    color={isFree ? Brand.success : Brand.primary}
                  />
                  <Text style={[s.feeBadgeText, isFree ? s.feeBadgeTextFree : s.feeBadgeTextPaid]}>
                    {isFree
                      ? 'Free entry — no payment required'
                      : `₹${Number(entryFee).toLocaleString('en-IN')} per ${isTeam ? 'team' : 'person'} — paid via Cashfree`}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Step 5: Review ────────────────────────────────────────────── */}
          {currentStep.id === 'review' && (
            <View style={s.stepWrap}>
              {/* Rules */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Rules & eligibility</Text>
                <TextInput
                  style={[fieldStyle, s.input, s.multiline]}
                  placeholder={'Eligibility, format rules, what to bring, code of conduct…'}
                  placeholderTextColor={Brand.creamMuted}
                  value={rules}
                  onChangeText={setRules}
                  multiline
                  maxLength={3000}
                  textAlignVertical="top"
                />
                <Text style={s.charCount}>{rules.length}/3000</Text>
              </View>

              {/* Summary card */}
              <View style={s.reviewCard}>
                <ReviewRow
                  label="Type"
                  value={`${isTournament ? 'Tournament' : 'Event'}${tournamentType ? ` · ${tournamentType}` : ''}`}
                />
                <ReviewRow label="Title"    value={title} />
                {isTournament && (
                  <ReviewRow
                    label="Format"
                    value={isTeam ? `Team of ${teamSize || '?'}` : 'Individual'}
                  />
                )}
                <ReviewRow
                  label="Capacity"
                  value={capacity ? capacity : 'Unlimited'}
                />
                {skillLevel    ? <ReviewRow label="Skill"  value={skillLevel}    /> : null}
                {ageCategory   ? <ReviewRow label="Age"    value={ageCategory}   /> : null}
                {genderCategory? <ReviewRow label="Gender" value={genderCategory}/> : null}
                <ReviewRow
                  label="When"
                  value={
                    startDate
                      ? `${startDate}${startTime ? ` at ${startTime}` : ''}`
                      : '—'
                  }
                />
                {venue ? <ReviewRow label="Venue" value={venue} /> : null}
                <ReviewRow
                  label="Entry fee"
                  value={
                    entryFee && Number(entryFee) > 0
                      ? `₹${Number(entryFee).toLocaleString('en-IN')}`
                      : 'Free'
                  }
                />
              </View>

              <View style={s.draftNote}>
                <Ionicons name="cloud-upload-outline" size={14} color={Brand.creamMuted} />
                <Text style={s.draftNoteText}>
                  Saved as a draft. Publish from the web dashboard when you're ready.
                </Text>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={s.footer}>
        <Pressable
          style={[s.continueBtn, busy && s.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={busy}
        >
          {busy ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={s.continueBtnText}>Creating…</Text>
            </>
          ) : currentStep.id === 'review' ? (
            <>
              <Ionicons name={isTournament ? 'trophy-outline' : 'ticket-outline'} size={18} color="#fff" />
              <Text style={s.continueBtnText}>
                {isTournament ? 'Create Tournament' : 'Create Event'}
              </Text>
            </>
          ) : (
            <>
              <Text style={s.continueBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.75)" />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: Brand.bg },

  // Header
  header:       { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.three, borderBottomWidth: 1, borderBottomColor: Brand.border1, gap: Spacing.two },
  headerCenter: { flex: 1, gap: 3 },
  stepChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: Brand.primaryGlow, borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: 4 },
  stepChipText: { fontSize: 11, fontWeight: '700', color: Brand.primary },
  headerTitle:  { fontSize: 18, fontWeight: '800', color: Brand.cream, letterSpacing: -0.2 },
  headerHint:   { fontSize: 12, color: Brand.creamSub, lineHeight: 17 },
  businessTag:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  businessTagText: { fontSize: 11, color: Brand.creamMuted },
  iconBtn:      { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Brand.surface1, borderWidth: 1, borderColor: Brand.border1, alignItems: 'center', justifyContent: 'center', marginTop: 2 },

  // Progress
  progressSection: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: Brand.border1 },
  progressTrack: { height: 3, backgroundColor: Brand.surface2, borderRadius: 2 },
  progressFill:  { height: 3, backgroundColor: Brand.primary, borderRadius: 2 },
  dotRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.two },
  dot:           { width: 18, height: 18, borderRadius: 9, backgroundColor: Brand.surface2, borderWidth: 1.5, borderColor: Brand.border1, alignItems: 'center', justifyContent: 'center' },
  dotActive:     { backgroundColor: Brand.primary, borderColor: Brand.primary, width: 22, height: 22, borderRadius: 11 },
  dotDone:       { backgroundColor: Brand.success, borderColor: Brand.success },

  // Error banner
  errorBanner:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: 'rgba(220,38,38,0.06)', borderBottomWidth: 1, borderBottomColor: 'rgba(220,38,38,0.15)', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  errorIconWrap:{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(220,38,38,0.10)', alignItems: 'center', justifyContent: 'center' },
  errorText:    { color: Brand.error, fontSize: 12, flex: 1, lineHeight: 17 },

  // Scroll content
  content:  { padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.four },
  stepWrap: { gap: Spacing.four },

  // Fields
  fieldGroup:  { gap: Spacing.one + 2 },
  fieldLabel:  { fontSize: 12, fontWeight: '600', color: Brand.creamSub, letterSpacing: 0.1 },
  optionalTag: { fontWeight: '400', color: Brand.creamMuted },
  required:    { color: Brand.error },
  input:       { fontSize: 14 },
  multiline:   { height: 120, paddingTop: 12 },
  twoCol:      { flexDirection: 'row', gap: Spacing.two },
  hint:        { fontSize: 11, color: Brand.creamMuted, lineHeight: 16 },
  charCount:   { fontSize: 11, color: Brand.creamMuted, textAlign: 'right' },

  // Info box
  infoBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Brand.primaryGlow, borderRadius: Radius.md, padding: Spacing.two + 2, borderWidth: 1, borderColor: 'rgba(124,58,237,0.12)' },
  infoText: { fontSize: 11, color: Brand.creamSub, flex: 1, lineHeight: 17 },

  // Entry fee
  feeCard:          { gap: Spacing.three, padding: Spacing.three, backgroundColor: Brand.surface1, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border1 },
  feeRow:           { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rupee:            { fontSize: 16, color: Brand.creamSub, paddingBottom: 1 },
  feeBadge:         { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.md, paddingHorizontal: Spacing.two + 2, paddingVertical: 8 },
  feeBadgeFree:     { backgroundColor: 'rgba(22,163,74,0.08)', borderWidth: 1, borderColor: 'rgba(22,163,74,0.20)' },
  feeBadgePaid:     { backgroundColor: Brand.primaryGlow, borderWidth: 1, borderColor: 'rgba(124,58,237,0.20)' },
  feeBadgeText:     { fontSize: 12, fontWeight: '600', flex: 1 },
  feeBadgeTextFree: { color: Brand.success },
  feeBadgeTextPaid: { color: Brand.primary },

  // Review
  reviewCard: { backgroundColor: Brand.surface1, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border1, overflow: 'hidden', paddingHorizontal: Spacing.three },
  draftNote:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Brand.surface2, borderRadius: Radius.md, padding: Spacing.two + 2 },
  draftNoteText: { fontSize: 11, color: Brand.creamMuted, flex: 1, lineHeight: 17 },

  // Footer
  footer:              { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderTopWidth: 1, borderTopColor: Brand.border1, backgroundColor: Brand.bg },
  continueBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Brand.primary, borderRadius: Radius.lg, paddingVertical: 16, shadowColor: Brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  continueBtnDisabled: { opacity: 0.6 },
  continueBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
});
