/**
 * Business Setup Wizard
 * Resources → Hours/Days → (Rules) → Photos → Review → Go Live
 * Mirrors web /business/businesses/[id]/setup
 *
 * Route: /(vendor)/business-setup?id=<businessId>
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import * as ImagePicker from 'expo-image-picker';

import { DarkBrand as Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { TimeField } from '@/components/ui/DateTimePickers';
import {
  getBusinessSetup,
  updateBusinessSetup,
  completeBusinessSetup,
  syncBusinessSetupPhotos,
  supportsSetup,
  supportsSlotSetup,
  isServiceType,
  priceLabel,
  resourceCopy,
  hasRulesStep,
  applyFullDayHours,
  SETUP_DAYS,
  DAY_SHORT,
  SLOT_MINUTES_OPTIONS,
  DEFAULT_WEEKLY_HOURS,
  defaultCommerceProfile,
  defaultCreatorProfile,
  type BusinessWithSetup,
  type BusinessResource,
  type BusinessStaff,
  type BusinessService,
  type WeeklyHours,
  type DayKey,
  type BookingMode,
  type CommerceProfile,
  type CreatorProfile,
} from '@/services/vendor-business-service';
import { getPrintCatalog } from '@/services/print-service';
import type { PrintCategory } from '@/types/print';
import {
  listVendorCommerceProducts,
  createCommerceProduct,
  deleteCommerceProduct,
  type CommerceProduct,
} from '@/services/commerce-service';

// ─── Step Types ───────────────────────────────────────────────────────────────

type StepId = 'photos' | 'resources' | 'hourly-slots' | 'full-day-days' | 'rules' | 'staff' | 'services' | 'review';

type SetupFlow = {
  steps:            StepId[];
  resourceLabel:    string;      // "Courts" / "Halls" / "Resources"
  showHallFields:   boolean;     // capacity + description on resource form
  hideSlotLength:   boolean;     // hide slot duration picker
  isServiceMode?:   boolean;     // salon / clinic / coaching
  staffNoun?:       string;      // "Staff" / "Doctors" / "Coaches"
  serviceNoun?:     string;      // "Services" / "Consultations" / "Sessions"
};

/**
 * Mirrors web resolveSetupFlow — returns the exact step order for each type+mode.
 * turf-hourly  : Photos → Hours & Slots → Courts → Review
 * turf-fullday : Rules → Photos → Days & Price → Spaces → Review
 * venue-hourly : Rules → Photos → Hours & Slots → Halls → Review
 * venue-fullday: Rules → Photos → Days & Price → Halls → Review
 * default      : Photos → Hours & Slots → Resources → Review
 */
function resolveSetupFlow(typeId: string, bookingMode: BookingMode): SetupFlow {
  const isFullDay = bookingMode === 'fullDay';

  if (typeId === 'turf' && !isFullDay) {
    return {
      steps:          ['photos', 'hourly-slots', 'resources', 'review'],
      resourceLabel:  'Courts',
      showHallFields: false,
      hideSlotLength: false,
    };
  }
  if (typeId === 'turf' && isFullDay) {
    return {
      steps:          ['rules', 'photos', 'full-day-days', 'resources', 'review'],
      resourceLabel:  'Spaces',
      showHallFields: false,
      hideSlotLength: true,
    };
  }
  if (typeId === 'venue' && !isFullDay) {
    return {
      steps:          ['rules', 'photos', 'hourly-slots', 'resources', 'review'],
      resourceLabel:  'Halls',
      showHallFields: true,
      hideSlotLength: false,
    };
  }
  if (typeId === 'venue' && isFullDay) {
    return {
      steps:          ['rules', 'photos', 'full-day-days', 'resources', 'review'],
      resourceLabel:  'Halls',
      showHallFields: true,
      hideSlotLength: true,
    };
  }
  // Service-mode types: salon / clinic / coaching
  if (isServiceType(typeId)) {
    const staffNoun   = typeId === 'clinic'   ? 'Doctors'
                      : typeId === 'coaching' ? 'Coaches'
                      : 'Staff';
    const serviceNoun = typeId === 'clinic'   ? 'Consultations'
                      : typeId === 'coaching' ? 'Sessions'
                      : 'Services';
    return {
      steps:          ['photos', 'hourly-slots', 'staff', 'services', 'review'],
      resourceLabel:  '',
      showHallFields: false,
      hideSlotLength: true,
      isServiceMode:  true,
      staffNoun,
      serviceNoun,
    };
  }

  // Default for all other appointment types
  return {
    steps:          ['photos', 'hourly-slots', 'resources', 'review'],
    resourceLabel:  resourceCopy(typeId).title,
    showHallFields: false,
    hideSlotLength: false,
  };
}

const STEP_LABELS: Record<StepId, string> = {
  'photos':        'Photos',
  'resources':     'Resources',   // overridden per flow (Courts / Halls / Spaces)
  'hourly-slots':  'Hours & Slots',
  'full-day-days': 'Open Days',
  'rules':         'Rules',
  'staff':         'Team',
  'services':      'Services',
  'review':        'Review',
};

const STEP_ICONS: Record<StepId, keyof typeof Ionicons.glyphMap> = {
  'photos':        'images-outline',
  'resources':     'cube-outline',
  'hourly-slots':  'time-outline',
  'full-day-days': 'calendar-outline',
  'rules':         'document-text-outline',
  'staff':         'people-outline',
  'services':      'list-outline',
  'review':        'checkmark-circle-outline',
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const p = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${p}`;
}

// ─── Shared field style ───────────────────────────────────────────────────────

const fieldStyle: object = {
  borderWidth: 1,
  borderColor: Brand.border2,
  borderRadius: Radius.md,
  paddingHorizontal: Spacing.three,
  paddingVertical: 11,
  fontSize: 14,
  color: Brand.cream,
  backgroundColor: Brand.surface1,
};

// ─── Step: Resources ──────────────────────────────────────────────────────────

/** Imperative handle so the wizard's Continue button can rescue an unsaved draft row. */
export type ResourcesStepHandle = {
  /**
   * Commits whatever is currently typed in the add-form, exactly as if the
   * vendor had pressed "+ Add" themselves. Vendors routinely fill the row
   * and tap the wizard's bottom "Continue" button instead of the row's own
   * "+ Add" button, then see a confusing "add at least one" error even
   * though they *did* fill everything in — this rescues that draft instead
   * of discarding it.
   * Returns 'empty' if there was nothing typed, 'invalid' if something was
   * typed but failed validation (error is left visible in the row), or
   * 'added' if the draft was successfully committed via onAdd.
   */
  commitDraft: () =>
    | { status: 'empty' | 'invalid' }
    | { status: 'added'; resource: Omit<BusinessResource, 'id'> };
};

const ResourcesStep = forwardRef<ResourcesStepHandle, {
  typeId:         string;
  bookingMode:    BookingMode;
  resourceLabel?: string;
  showHallFields: boolean;
  resources:      BusinessResource[];
  onAdd:          (r: Omit<BusinessResource, 'id'>) => string | null;
  onRemove:       (id: string) => void;
  onUpdate:       (id: string, patch: Partial<BusinessResource>) => void;
}>(function ResourcesStep({
  typeId,
  bookingMode,
  resourceLabel,
  showHallFields,
  resources,
  onAdd,
  onRemove,
  onUpdate,
}, ref) {
  const copy        = resourceCopy(typeId);
  const pLabel      = priceLabel(bookingMode);
  const showHalls   = showHallFields;
  const sectionTitle = resourceLabel ?? copy.title;

  const [name,  setName]  = useState('');
  const [price, setPrice] = useState('');
  const [cap,   setCap]   = useState('');
  const [desc,  setDesc]  = useState('');
  const [err,   setErr]   = useState('');

  function tryAdd(): { status: 'empty' | 'invalid' } | { status: 'added'; resource: Omit<BusinessResource, 'id'> } {
    if (!name.trim()) { setErr(''); return { status: 'empty' }; }
    const p = Number(price);
    if (!price.trim() || !Number.isFinite(p) || p < 0) { setErr('Enter a valid price.'); return { status: 'invalid' }; }
    const c = cap.trim() ? Number(cap) : undefined;
    if (c !== undefined && (!Number.isFinite(c) || c < 1)) { setErr('Enter a valid capacity.'); return { status: 'invalid' }; }
    const resource: Omit<BusinessResource, 'id'> = {
      name:  name.trim(),
      pricePerSlot: Math.round(p),
      ...(showHalls && c ? { capacity: c } : {}),
      ...(showHalls && desc.trim() ? { description: desc.trim() } : {}),
    };
    const errMsg = onAdd(resource);
    if (errMsg) { setErr(errMsg); return { status: 'invalid' }; }
    setName(''); setPrice(''); setCap(''); setDesc(''); setErr('');
    return { status: 'added', resource };
  }

  useImperativeHandle(ref, () => ({ commitDraft: tryAdd }));

  return (
    <View style={step.wrap}>
      <Text style={step.sectionTitle}>{sectionTitle}</Text>
      <Text style={step.sectionSub}>Add each bookable item with a price. You can edit names inline.</Text>

      {/* Add form */}
      <View style={step.addForm}>
        <TextInput
          style={[fieldStyle, step.input]}
          placeholder={copy.placeholder}
          placeholderTextColor={Brand.creamMuted}
          value={name}
          onChangeText={setName}
          returnKeyType="next"
        />
        <View style={step.priceRow}>
          <Text style={step.rupee}>₹</Text>
          <TextInput
            style={[fieldStyle, step.input, { flex: 1, paddingLeft: Spacing.two }]}
            placeholder={pLabel}
            placeholderTextColor={Brand.creamMuted}
            value={price}
            onChangeText={(v) => setPrice(v.replace(/\D/g, ''))}
            keyboardType="numeric"
          />
        </View>
        {showHalls && (
          <View style={{ gap: Spacing.one + 2 }}>
            <TextInput
              style={[fieldStyle, step.input]}
              placeholder={`Max capacity for this ${sectionTitle.toLowerCase().replace(/s$/, '')} (optional)`}
              placeholderTextColor={Brand.creamMuted}
              value={cap}
              onChangeText={(v) => setCap(v.replace(/\D/g, ''))}
              keyboardType="numeric"
            />
            <TextInput
              style={[fieldStyle, step.input]}
              placeholder="Description (optional)"
              placeholderTextColor={Brand.creamMuted}
              value={desc}
              onChangeText={setDesc}
            />
          </View>
        )}
        {err ? <Text style={step.inlineErr}>{err}</Text> : null}
        <Pressable
          style={step.addBtn}
          onPress={() => { if (tryAdd().status === 'empty') setErr('Name is required.'); }}
        >
          <Ionicons name="add" size={16} color={Brand.primary} />
          <Text style={step.addBtnText}>Add</Text>
        </Pressable>
      </View>

      {/* List */}
      {resources.length > 0 ? (
        <View style={step.resourceList}>
          {resources.map((r, i) => (
            <View key={r.id} style={[step.resourceItem, i < resources.length - 1 && step.resourceBorder]}>
              <View style={{ flex: 1, gap: 6 }}>
                <TextInput
                  style={[fieldStyle, step.input, { fontSize: 13 }]}
                  value={r.name}
                  onChangeText={(v) => onUpdate(r.id, { name: v })}
                  placeholder="Name"
                  placeholderTextColor={Brand.creamMuted}
                />
                <View style={step.priceRow}>
                  <Text style={step.rupee}>₹</Text>
                  <TextInput
                    style={[fieldStyle, step.input, { flex: 1, paddingLeft: Spacing.two, fontSize: 13 }]}
                    value={r.pricePerSlot != null ? String(r.pricePerSlot) : ''}
                    onChangeText={(v) => onUpdate(r.id, { pricePerSlot: v ? Math.round(Number(v)) : undefined })}
                    keyboardType="numeric"
                    placeholder={pLabel}
                    placeholderTextColor={Brand.creamMuted}
                  />
                </View>
              </View>
              <Pressable onPress={() => onRemove(r.id)} style={step.removeBtn} hitSlop={8}>
                <Ionicons name="trash-outline" size={15} color={Brand.error} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={step.emptyHint}>
          <Ionicons name="cube-outline" size={28} color={Brand.creamMuted} />
          <Text style={step.emptyHintText}>No items yet — add at least one above.</Text>
        </View>
      )}
    </View>
  );
});

// ─── Step: Hourly Slots ───────────────────────────────────────────────────────

function HourlySlotsStep({
  weeklyHours, slotMinutes, hideSlotLength = false,
  onToggleDay, onUniformHours, onSlotMinutesChange,
}: {
  weeklyHours:         WeeklyHours;
  slotMinutes:         number;
  hideSlotLength?:     boolean;
  onToggleDay:         (d: DayKey) => void;
  onUniformHours:      (open: string, close: string) => void;
  onSlotMinutesChange: (m: number) => void;
}) {
  const openDays = SETUP_DAYS.filter((d) => !weeklyHours[d].closed);
  const refDay   = openDays[0] ?? 'mon';

  return (
    <View style={step.wrap}>
      <Text style={step.sectionTitle}>{hideSlotLength ? 'Opening Hours' : 'Hours & Slot Duration'}</Text>
      <Text style={step.sectionSub}>
        {hideSlotLength
          ? 'Set your open/close time and which days you accept appointments.'
          : 'Set open/close time for all open days, then slot length.'}
      </Text>

      {/* Slot duration — hidden for services mode (salon/clinic/coaching) */}
      {!hideSlotLength && (
        <>
          <Text style={step.fieldLabel}>Slot duration</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.three }}>
            <View style={{ flexDirection: 'row', gap: Spacing.one + 2 }}>
              {SLOT_MINUTES_OPTIONS.map((m) => (
                <Pressable
                  key={m}
                  style={[step.pill, m === slotMinutes && step.pillActive]}
                  onPress={() => onSlotMinutesChange(m)}
                >
                  <Text style={[step.pillText, m === slotMinutes && step.pillTextActive]}>
                    {m < 60 ? `${m}m` : `${m / 60}h`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {/* Open/close time — native time pickers */}
      <Text style={step.fieldLabel}>Hours (applies to all open days)</Text>
      <View style={step.timeRow}>
        <View style={{ flex: 1 }}>
          <TimeField
            value={weeklyHours[refDay].open}
            onChange={(v) => onUniformHours(v, weeklyHours[refDay].close)}
            placeholder="Open"
            minuteInterval={15}
          />
        </View>
        <Text style={step.timeSep}>to</Text>
        <View style={{ flex: 1 }}>
          <TimeField
            value={weeklyHours[refDay].close}
            onChange={(v) => onUniformHours(weeklyHours[refDay].open, v)}
            placeholder="Close"
            minuteInterval={15}
          />
        </View>
      </View>

      {/* Day toggles */}
      <Text style={[step.fieldLabel, { marginTop: Spacing.three }]}>Open days</Text>
      <View style={step.dayRow}>
        {SETUP_DAYS.map((day) => {
          const isOpen = !weeklyHours[day].closed;
          return (
            <Pressable
              key={day}
              style={[step.dayBtn, isOpen && step.dayBtnActive]}
              onPress={() => onToggleDay(day)}
            >
              <Text style={[step.dayBtnText, isOpen && step.dayBtnTextActive]}>
                {DAY_SHORT[day]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={step.dayHint}>
        {openDays.length === 0 ? 'Select at least one day.' : `${openDays.length} day${openDays.length > 1 ? 's' : ''} open`}
      </Text>
    </View>
  );
}

// ─── Step: Full Day Days ──────────────────────────────────────────────────────

function FullDayDaysStep({
  weeklyHours, onToggleDay,
}: {
  weeklyHours: WeeklyHours;
  onToggleDay: (d: DayKey) => void;
}) {
  const openCount = SETUP_DAYS.filter((d) => !weeklyHours[d].closed).length;
  return (
    <View style={step.wrap}>
      <Text style={step.sectionTitle}>Open Days</Text>
      <Text style={step.sectionSub}>Select which days customers can make full-day bookings.</Text>
      <View style={step.dayRow}>
        {SETUP_DAYS.map((day) => {
          const isOpen = !weeklyHours[day].closed;
          return (
            <Pressable
              key={day}
              style={[step.dayBtn, isOpen && step.dayBtnActive]}
              onPress={() => onToggleDay(day)}
            >
              <Text style={[step.dayBtnText, isOpen && step.dayBtnTextActive]}>
                {DAY_SHORT[day]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={step.dayHint}>
        {openCount === 0 ? 'Select at least one day.' : `${openCount} day${openCount > 1 ? 's' : ''} available`}
      </Text>
    </View>
  );
}

// ─── Step: Rules ──────────────────────────────────────────────────────────────

function RulesStep({
  maxGuests, venueRules, onMaxGuestsChange, onVenueRulesChange,
}: {
  maxGuests:          string;
  venueRules:         string;
  onMaxGuestsChange:  (v: string) => void;
  onVenueRulesChange: (v: string) => void;
}) {
  return (
    <View style={step.wrap}>
      <Text style={step.sectionTitle}>House Rules</Text>
      <Text style={step.sectionSub}>Optional rules shown to customers before they book.</Text>
      <Text style={step.fieldLabel}>Maximum guests allowed (venue-wide total)</Text>
      <Text style={[step.sectionSub, { marginTop: -6 }]}>
        This is a cap across your whole venue — separate from each hall&apos;s own capacity, set on the previous step.
      </Text>
      <TextInput
        style={[fieldStyle, step.input]}
        placeholder="e.g. 200"
        placeholderTextColor={Brand.creamMuted}
        value={maxGuests}
        onChangeText={(v) => onMaxGuestsChange(v.replace(/\D/g, ''))}
        keyboardType="numeric"
      />
      <Text style={[step.fieldLabel, { marginTop: Spacing.three }]}>Rules for customers</Text>
      <TextInput
        style={[fieldStyle, step.input, { height: 120, textAlignVertical: 'top', paddingTop: 12 }]}
        placeholder={'e.g. No outside catering.\nMusic off by 11 PM.\n₹5000 security deposit.'}
        placeholderTextColor={Brand.creamMuted}
        value={venueRules}
        onChangeText={onVenueRulesChange}
        multiline
        maxLength={2000}
      />
      <Text style={step.charCount}>{venueRules.length}/2000</Text>
    </View>
  );
}

// ─── Step: Photos ─────────────────────────────────────────────────────────────

type DisplayPhoto = { id: string; url: string; pending: boolean };

function PhotosStep({
  photos, busy, picking, onAdd, onRemove,
}: {
  photos:    DisplayPhoto[];
  busy:      boolean;
  picking?:  boolean;
  onAdd:     () => void;
  onRemove:  (photo: DisplayPhoto) => void;
}) {
  return (
    <View style={step.wrap}>
      <Text style={step.sectionTitle}>Gallery Photos</Text>
      <Text style={step.sectionSub}>
        Add sample work or shop photos (your thumbnail is already set). Up to 3 total.
      </Text>

      <View style={step.photoGrid}>
        {photos.map((photo) => (
          <View key={photo.id} style={step.photoCell}>
            <Image source={{ uri: photo.url }} style={step.photoImg} resizeMode="cover" />
            {photo.pending && (
              <View style={step.photoPendingDot} />
            )}
            <Pressable
              onPress={() => onRemove(photo)}
              disabled={busy}
              style={step.photoRemoveBtn}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
            </Pressable>
          </View>
        ))}
        {photos.length < 3 && (
          <Pressable style={step.photoAdd} onPress={onAdd} disabled={busy || picking}>
            {picking ? (
              <ActivityIndicator size="small" color={Brand.creamMuted} />
            ) : (
              <Ionicons name="camera-outline" size={26} color={Brand.creamMuted} />
            )}
            <Text style={step.photoAddText}>{picking ? 'Loading…' : '+ Add photo'}</Text>
          </Pressable>
        )}
      </View>

      <View style={step.photoNote}>
        <Ionicons name="information-circle-outline" size={13} color={Brand.primary} />
        <Text style={step.photoNoteText}>
          Photos help customers choose your business. High quality images improve bookings.
        </Text>
      </View>
    </View>
  );
}

// ─── Step: Staff ─────────────────────────────────────────────────────────────

function StaffStep({
  staffNoun = 'Staff',
  staffList,
  onAdd,
  onRemove,
}: {
  staffNoun?: string;
  staffList:  BusinessStaff[];
  onAdd:      (s: Omit<BusinessStaff, 'id'>) => void;
  onRemove:   (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [err,  setErr]  = useState('');

  function tryAdd() {
    if (!name.trim()) { setErr('Name is required.'); return; }
    onAdd({ name: name.trim(), role: role.trim() || undefined });
    setName(''); setRole(''); setErr('');
  }

  return (
    <View style={step.wrap}>
      <Text style={step.sectionTitle}>{staffNoun}</Text>
      <Text style={step.sectionSub}>
        Add team members who provide services. Customers can choose their preferred {staffNoun.toLowerCase().replace(/s$/, '')}.
      </Text>

      {/* Add form */}
      <View style={step.addForm}>
        <TextInput
          style={[fieldStyle, step.input]}
          placeholder={`${staffNoun.replace(/s$/, '')} name`}
          placeholderTextColor={Brand.creamMuted}
          value={name}
          onChangeText={(v) => { setName(v); setErr(''); }}
          returnKeyType="next"
        />
        <TextInput
          style={[fieldStyle, step.input]}
          placeholder={`Role / specialisation (optional)`}
          placeholderTextColor={Brand.creamMuted}
          value={role}
          onChangeText={setRole}
          returnKeyType="done"
        />
        {err ? <Text style={step.inlineErr}>{err}</Text> : null}
        <Pressable style={step.addBtn} onPress={tryAdd}>
          <Ionicons name="add" size={16} color={Brand.primary} />
          <Text style={step.addBtnText}>Add</Text>
        </Pressable>
      </View>

      {/* List */}
      {staffList.length > 0 ? (
        <View style={step.resourceList}>
          {staffList.map((s, i) => (
            <View
              key={s.id}
              style={[step.resourceItem, i < staffList.length - 1 && step.resourceBorder]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={step.staffName}>{s.name}</Text>
                {s.role ? <Text style={step.staffRole}>{s.role}</Text> : null}
              </View>
              <Pressable onPress={() => onRemove(s.id)} style={step.removeBtn} hitSlop={8}>
                <Ionicons name="trash-outline" size={15} color={Brand.error} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={step.emptyHint}>
          <Ionicons name="people-outline" size={28} color={Brand.creamMuted} />
          <Text style={step.emptyHintText}>No team members yet — add at least one above.</Text>
        </View>
      )}
    </View>
  );
}

// ─── Step: Services ───────────────────────────────────────────────────────────

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90, 120];

/** Same rescue pattern as ResourcesStepHandle — see its comment for why. */
export type ServicesStepHandle = {
  commitDraft: () =>
    | { status: 'empty' | 'invalid' }
    | { status: 'added'; service: Omit<BusinessService, 'id'> };
};

const ServicesStep = forwardRef<ServicesStepHandle, {
  serviceNoun?:   string;
  servicesList:   BusinessService[];
  staffList:      BusinessStaff[];
  bufferMinutes:  number;
  onAdd:          (s: Omit<BusinessService, 'id'>) => void;
  onRemove:       (id: string) => void;
  onBufferChange: (m: number) => void;
}>(function ServicesStep({
  serviceNoun = 'Services',
  servicesList,
  staffList,
  bufferMinutes,
  onAdd,
  onRemove,
  onBufferChange,
}, ref) {
  const [name,     setName]     = useState('');
  const [duration, setDuration] = useState(30);
  const [price,    setPrice]    = useState('');
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [err,      setErr]      = useState('');

  function toggleStaff(id: string) {
    setStaffIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function tryAdd(): { status: 'empty' | 'invalid' } | { status: 'added'; service: Omit<BusinessService, 'id'> } {
    if (!name.trim()) { setErr(''); return { status: 'empty' }; }
    const p = Number(price);
    if (!price.trim() || !Number.isFinite(p) || p < 0) { setErr('Enter a valid price.'); return { status: 'invalid' }; }
    const service: Omit<BusinessService, 'id'> = { name: name.trim(), durationMinutes: duration, price: Math.round(p), staffIds };
    onAdd(service);
    setName(''); setPrice(''); setStaffIds([]); setErr('');
    return { status: 'added', service };
  }

  useImperativeHandle(ref, () => ({ commitDraft: tryAdd }));

  return (
    <View style={step.wrap}>
      <Text style={step.sectionTitle}>{serviceNoun}</Text>
      <Text style={step.sectionSub}>
        Add the {serviceNoun.toLowerCase()} you offer with duration and price.
      </Text>

      {/* Buffer time */}
      <View style={step.addForm}>
        <Text style={step.fieldLabel}>Buffer time between bookings</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: Spacing.one + 2 }}>
            {[0, 5, 10, 15, 20, 30].map((m) => (
              <Pressable
                key={m}
                style={[step.pill, m === bufferMinutes && step.pillActive]}
                onPress={() => onBufferChange(m)}
              >
                <Text style={[step.pillText, m === bufferMinutes && step.pillTextActive]}>
                  {m === 0 ? 'None' : `${m}m`}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Add form */}
      <View style={step.addForm}>
        <TextInput
          style={[fieldStyle, step.input]}
          placeholder={`${serviceNoun.replace(/s$/, '')} name`}
          placeholderTextColor={Brand.creamMuted}
          value={name}
          onChangeText={(v) => { setName(v); setErr(''); }}
        />

        {/* Duration picker */}
        <Text style={step.fieldLabel}>Duration</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: Spacing.one + 2 }}>
            {DURATION_OPTIONS.map((m) => (
              <Pressable
                key={m}
                style={[step.pill, m === duration && step.pillActive]}
                onPress={() => setDuration(m)}
              >
                <Text style={[step.pillText, m === duration && step.pillTextActive]}>
                  {m < 60 ? `${m}m` : `${m / 60}h`}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Price */}
        <View style={step.priceRow}>
          <Text style={step.rupee}>₹</Text>
          <TextInput
            style={[fieldStyle, step.input, { flex: 1, paddingLeft: Spacing.two }]}
            placeholder="Price"
            placeholderTextColor={Brand.creamMuted}
            value={price}
            onChangeText={(v) => setPrice(v.replace(/\D/g, ''))}
            keyboardType="numeric"
          />
        </View>

        {/* Staff assignment */}
        {staffList.length > 0 && (
          <>
            <Text style={step.fieldLabel}>Assign to (optional)</Text>
            <View style={step.staffChips}>
              {staffList.map((s) => {
                const active = staffIds.includes(s.id);
                return (
                  <Pressable
                    key={s.id}
                    style={[step.staffChip, active && step.staffChipActive]}
                    onPress={() => toggleStaff(s.id)}
                  >
                    <Text style={[step.staffChipText, active && step.staffChipTextActive]}>
                      {s.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {err ? <Text style={step.inlineErr}>{err}</Text> : null}
        <Pressable
          style={step.addBtn}
          onPress={() => { if (tryAdd().status === 'empty') setErr('Service name is required.'); }}
        >
          <Ionicons name="add" size={16} color={Brand.primary} />
          <Text style={step.addBtnText}>Add</Text>
        </Pressable>
      </View>

      {/* List */}
      {servicesList.length > 0 ? (
        <View style={step.resourceList}>
          {servicesList.map((svc, i) => (
            <View
              key={svc.id}
              style={[step.resourceItem, i < servicesList.length - 1 && step.resourceBorder]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={step.staffName}>{svc.name}</Text>
                <Text style={step.staffRole}>
                  {svc.durationMinutes < 60 ? `${svc.durationMinutes}m` : `${svc.durationMinutes / 60}h`}
                  {'  ·  '}₹{svc.price.toLocaleString('en-IN')}
                </Text>
                {svc.staffIds.length > 0 && (
                  <Text style={step.staffRole}>
                    {svc.staffIds
                      .map((id) => staffList.find((x) => x.id === id)?.name)
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                )}
              </View>
              <Pressable onPress={() => onRemove(svc.id)} style={step.removeBtn} hitSlop={8}>
                <Ionicons name="trash-outline" size={15} color={Brand.error} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={step.emptyHint}>
          <Ionicons name="list-outline" size={28} color={Brand.creamMuted} />
          <Text style={step.emptyHintText}>No {serviceNoun.toLowerCase()} yet — add at least one above.</Text>
        </View>
      )}
    </View>
  );
});

// ─── Step: Review ─────────────────────────────────────────────────────────────

function ReviewStep({
  business, flow, resources, weeklyHours, slotMinutes, maxGuests, venueRules,
  photos, staffList, servicesList, editMode,
}: {
  business:     BusinessWithSetup;
  flow:         SetupFlow | null;
  resources:    BusinessResource[];
  weeklyHours:  WeeklyHours;
  slotMinutes:  number;
  maxGuests:    string;
  venueRules:   string;
  photos:       DisplayPhoto[];
  staffList:    BusinessStaff[];
  servicesList: BusinessService[];
  editMode:     boolean;
}) {
  const isServiceMode  = flow?.isServiceMode ?? false;
  const isFullDay      = business.setup?.bookingMode === 'fullDay';
  const openDays       = SETUP_DAYS.filter((d) => !weeklyHours[d].closed);
  const showRules      = !isServiceMode && hasRulesStep(business.typeId, isFullDay ? 'fullDay' : 'slots');
  const resourceLabel  = flow?.resourceLabel ?? resourceCopy(business.typeId).title;
  const staffNoun      = flow?.staffNoun   ?? 'Staff';
  const serviceNoun    = flow?.serviceNoun ?? 'Services';

  return (
    <View style={step.wrap}>
      <Text style={step.sectionTitle}>{editMode ? 'Review Changes' : 'Ready to Go Live?'}</Text>
      <Text style={step.sectionSub}>Check everything before publishing your business.</Text>

      {/* Hours + open days (all modes) */}
      <View style={review.card}>
        <View style={review.cardHeader}>
          <Ionicons name="time-outline" size={14} color={Brand.primary} />
          <Text style={review.cardTitle}>{isServiceMode ? 'Working Hours' : 'Booking'}</Text>
        </View>
        {!isServiceMode && (
          <Text style={review.cardValue}>
            {isFullDay ? 'Full-day bookings' : `Hourly · ${slotMinutes} min slots`}
          </Text>
        )}
        <View style={review.dayChips}>
          {openDays.length > 0 ? openDays.map((d) => (
            <View key={d} style={review.dayChip}>
              <Text style={review.dayChipText}>{DAY_SHORT[d]}</Text>
            </View>
          )) : (
            <Text style={review.warn}>No open days selected</Text>
          )}
        </View>
      </View>

      {/* Service mode: Staff */}
      {isServiceMode && (
        <View style={review.card}>
          <View style={review.cardHeader}>
            <Ionicons name="people-outline" size={14} color={Brand.primary} />
            <Text style={review.cardTitle}>{staffNoun} ({staffList.length})</Text>
          </View>
          {staffList.length > 0 ? staffList.map((s) => (
            <View key={s.id} style={review.resourceRow}>
              <Text style={review.resourceName}>{s.name}</Text>
              {s.role ? <Text style={review.resourcePrice}>{s.role}</Text> : null}
            </View>
          )) : (
            <Text style={review.warn}>No team members added</Text>
          )}
        </View>
      )}

      {/* Service mode: Services */}
      {isServiceMode && (
        <View style={review.card}>
          <View style={review.cardHeader}>
            <Ionicons name="list-outline" size={14} color={Brand.primary} />
            <Text style={review.cardTitle}>{serviceNoun} ({servicesList.length})</Text>
          </View>
          {servicesList.length > 0 ? servicesList.map((svc) => (
            <View key={svc.id} style={review.resourceRow}>
              <Text style={review.resourceName}>{svc.name}</Text>
              <Text style={review.resourcePrice}>
                {svc.durationMinutes < 60 ? `${svc.durationMinutes}m` : `${svc.durationMinutes / 60}h`}
                {'  ·  '}₹{svc.price.toLocaleString('en-IN')}
              </Text>
            </View>
          )) : (
            <Text style={review.warn}>No {serviceNoun.toLowerCase()} added</Text>
          )}
        </View>
      )}

      {/* Slot mode: Resources */}
      {!isServiceMode && (
        <View style={review.card}>
          <View style={review.cardHeader}>
            <Ionicons name="cube-outline" size={14} color={Brand.primary} />
            <Text style={review.cardTitle}>{resourceLabel} ({resources.length})</Text>
          </View>
          {resources.length > 0 ? resources.map((r) => (
            <View key={r.id} style={review.resourceRow}>
              <Text style={review.resourceName}>{r.name}</Text>
              <Text style={review.resourcePrice}>
                ₹{(r.pricePerSlot ?? 0).toLocaleString('en-IN')} {isFullDay ? '/day' : `/${slotMinutes}min`}
              </Text>
            </View>
          )) : (
            <Text style={review.warn}>No resources added</Text>
          )}
        </View>
      )}

      {/* Rules (venue/full-day only) */}
      {showRules && (maxGuests || venueRules.trim()) && (
        <View style={review.card}>
          <View style={review.cardHeader}>
            <Ionicons name="document-text-outline" size={14} color={Brand.primary} />
            <Text style={review.cardTitle}>Rules</Text>
          </View>
          {maxGuests ? (
            <Text style={review.cardValue}>Max guests: {maxGuests}</Text>
          ) : null}
          {venueRules.trim() ? (
            <Text style={review.ruleText} numberOfLines={3}>{venueRules}</Text>
          ) : null}
        </View>
      )}

      {/* Photos */}
      <View style={review.card}>
        <View style={review.cardHeader}>
          <Ionicons name="images-outline" size={14} color={Brand.primary} />
          <Text style={review.cardTitle}>Photos ({photos.length})</Text>
        </View>
        {photos.length > 0 ? (
          <View style={review.photoRow}>
            {photos.map((p) => (
              <Image key={p.id} source={{ uri: p.url }} style={review.photoThumb} resizeMode="cover" />
            ))}
          </View>
        ) : (
          <Text style={review.cardSub}>No gallery photos — thumbnail still shown.</Text>
        )}
      </View>

      {/* Surge pricing tip (slot mode only — feature lives in Slot Calendar, not this wizard) */}
      {!isServiceMode && (
        <View style={review.surgeNote}>
          <Ionicons name="trending-up-outline" size={15} color={Brand.primary} />
          <Text style={review.surgeNoteText}>
            Want to charge more for peak-demand slots? Set surge pricing anytime from
            {' '}<Text style={{ fontWeight: '700' }}>Slot Calendar → Surge Price</Text> once you&apos;re live.
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── POD Setup Flow ───────────────────────────────────────────────────────────

type PodStepId = 'photos' | 'products' | 'pricing' | 'review';

const POD_STEPS: PodStepId[] = ['photos', 'products', 'pricing', 'review'];

const POD_STEP_LABELS: Record<PodStepId, string> = {
  photos:   'Photos',
  products: 'Products & area',
  pricing:  'Pricing',
  review:   'Review',
};

const POD_STEP_ICONS: Record<PodStepId, keyof typeof Ionicons.glyphMap> = {
  photos:   'images-outline',
  products: 'print-outline',
  pricing:  'pricetag-outline',
  review:   'checkmark-circle-outline',
};

type PricingDraft = {
  enabled:        boolean;
  basePrice:      string;
  minQuantity:    string;
  turnaroundDays: string;
};

function makePricingDraft(cat: PrintCategory, existing?: import('@/types/print').CategoryPricing): PricingDraft {
  return {
    enabled:        existing?.enabled ?? true,
    basePrice:      existing?.basePrice != null ? String(existing.basePrice) : '0',
    minQuantity:    String(existing?.minQuantity ?? cat.minQuantity ?? 1),
    turnaroundDays: String(existing?.turnaroundDays ?? 3),
  };
}

function PodSetupFlow({
  business,
  token,
  editMode,
}: {
  business: BusinessWithSetup;
  token: string;
  editMode: boolean;
}) {
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadError,    setLoadError]    = useState('');
  const [catalog,      setCatalog]      = useState<PrintCategory[]>([]);
  const [stepIndex,    setStepIndex]    = useState(0);
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState('');
  const [pickingPhoto, setPickingPhoto] = useState(false);

  // Photos
  const [savedPhotos,   setSavedPhotos]   = useState<{ id: string; url: string }[]>(
    () => (business.setup?.photos ?? []).map((p) => ({ id: p.id, url: p.url })),
  );
  const [pendingPhotos, setPendingPhotos] = useState<{ id: string; url: string }[]>([]);
  const [removedIds,    setRemovedIds]    = useState<string[]>([]);

  // Products & area
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [cities,             setCities]             = useState<string[]>([]);
  const [serveAll,           setServeAll]           = useState(false);
  const [cityInput,          setCityInput]          = useState('');
  const [turnaroundDays,     setTurnaroundDays]     = useState('3');
  const [minOrderValue,      setMinOrderValue]      = useState('');
  const [notes,              setNotes]              = useState('');
  const [acceptingOrders,    setAcceptingOrders]    = useState(true);

  // Per-category pricing
  const [categoryPricing, setCategoryPricing] = useState<Record<string, PricingDraft>>({});

  const scrollRef = useRef<ScrollView>(null);

  const displayPhotos: DisplayPhoto[] = useMemo(() => [
    ...savedPhotos.filter((p) => !removedIds.includes(p.id)).map((p) => ({ ...p, pending: false })),
    ...pendingPhotos.map((p) => ({ ...p, pending: true })),
  ], [savedPhotos, pendingPhotos, removedIds]);

  const currentStep = POD_STEPS[stepIndex];
  const totalSteps  = POD_STEPS.length;
  const progress    = (stepIndex + 1) / totalSteps;

  useEffect(() => {
    async function load() {
      try {
        const cats = await getPrintCatalog();
        setCatalog(cats);
        // Pre-fill from already-loaded business.setup.printProfile
        const profile = business.setup?.printProfile;
        if (profile) {
          setSelectedCategories(profile.serviceCategories);
          setCities(profile.cities);
          setServeAll(profile.serveAll);
          setTurnaroundDays(String(profile.turnaroundDays || 3));
          setMinOrderValue(profile.minOrderValue ? String(profile.minOrderValue) : '');
          setAcceptingOrders(profile.acceptingOrders);
          setNotes(profile.notes);
          if (profile.pricing) {
            const drafts: Record<string, PricingDraft> = {};
            for (const cat of cats) {
              if (profile.pricing[cat.id]) {
                drafts[cat.id] = makePricingDraft(cat, profile.pricing[cat.id]);
              }
            }
            setCategoryPricing(drafts);
          }
        }
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load catalog');
      } finally {
        setLoadingSetup(false);
      }
    }
    void load();
  }, [business.id, business.setup]);

  async function addPhoto() {
    console.log('[POD Photos] addPhoto: requesting permission');
    setPickingPhoto(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[POD Photos] permission:', perm.status, '| granted:', perm.granted);
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access in Settings.');
        return;
      }

      console.log('[POD Photos] launching image picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.75,
        base64: true,
      });
      console.log('[POD Photos] picker result | canceled:', result.canceled, '| assets:', result.assets?.length ?? 0);

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const mime  = asset.mimeType ?? 'image/jpeg';
        console.log('[POD Photos] asset | mime:', mime, '| base64 length:', asset.base64?.length ?? 0, '| uri:', asset.uri);
        if (!asset.base64) {
          console.warn('[POD Photos] base64 is missing — cannot build data URI');
          Alert.alert('Photo error', 'Could not read image data. Please try a different photo.');
          return;
        }
        const dataUrl = `data:${mime};base64,${asset.base64}`;
        const id = `pending-${Date.now()}`;
        console.log('[POD Photos] queued pending photo | id:', id, '| dataUrl prefix:', dataUrl.slice(0, 50));
        setPendingPhotos((prev) => [...prev, { id, url: dataUrl }]);
      } else {
        console.log('[POD Photos] picker cancelled or no assets returned');
      }
    } catch (e: unknown) {
      console.error('[POD Photos] addPhoto threw:', e);
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not open photo picker.');
    } finally {
      setPickingPhoto(false);
    }
  }

  function removePhoto(photo: DisplayPhoto) {
    console.log('[POD Photos] removePhoto | id:', photo.id, '| pending:', photo.pending);
    if (photo.pending) {
      setPendingPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } else {
      setRemovedIds((prev) => [...prev, photo.id]);
    }
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function addCity() {
    const c = cityInput.trim();
    if (!c) return;
    if (!cities.includes(c)) setCities((prev) => [...prev, c]);
    setCityInput('');
  }

  function removeCity(c: string) {
    setCities((prev) => prev.filter((x) => x !== c));
  }

  function updatePricing(catId: string, patch: Partial<PricingDraft>) {
    setCategoryPricing((prev) => ({ ...prev, [catId]: { ...prev[catId], ...patch } }));
  }

  function goBack() {
    setError('');
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      router.navigate('/(vendor)/businesses' as never);
    }
  }

  async function handleContinue() {
    setError('');
    setBusy(true);
    try {
      if (currentStep === 'photos') {
        console.log('[POD Photos] handleContinue photos | pending:', pendingPhotos.length, '| removedIds:', removedIds.length);
        if (pendingPhotos.length > 0 || removedIds.length > 0) {
          console.log('[POD Photos] calling syncBusinessSetupPhotos | businessId:', business.id);
          try {
            const updated = await syncBusinessSetupPhotos(token, business.id, {
              images:    pendingPhotos.map((p) => p.url),
              removeIds: removedIds,
            });
            console.log('[POD Photos] syncBusinessSetupPhotos success | photos returned:', updated.setup?.photos?.length ?? 0);
            if (updated.setup) {
              setSavedPhotos(updated.setup.photos.map((p) => ({ id: p.id, url: p.url })));
              setPendingPhotos([]);
              setRemovedIds([]);
            } else {
              console.warn('[POD Photos] syncBusinessSetupPhotos returned no setup object');
            }
          } catch (uploadErr: unknown) {
            console.error('[POD Photos] syncBusinessSetupPhotos failed:', uploadErr);
            throw uploadErr;
          }
        } else {
          console.log('[POD Photos] no changes — skipping upload');
        }
      } else if (currentStep === 'products') {
        if (selectedCategories.length === 0) {
          setError('Select at least one product category.'); return;
        }
        if (!serveAll && cities.length === 0) {
          setError('Add at least one city or enable "Serve everywhere".'); return;
        }
        // Seed pricing drafts for newly selected categories
        setCategoryPricing((prev) => {
          const next = { ...prev };
          for (const id of selectedCategories) {
            if (!next[id]) {
              const cat = catalog.find((c) => c.id === id);
              if (cat) next[id] = makePricingDraft(cat);
            }
          }
          return next;
        });
      } else if (currentStep === 'review') {
        const days     = Math.max(1, parseInt(turnaroundDays, 10) || 3);
        const minOrder = Math.max(0, parseInt(minOrderValue,  10) || 0);
        const pricing: Record<string, import('@/types/print').CategoryPricing> = {};
        for (const id of selectedCategories) {
          const d = categoryPricing[id];
          if (d) {
            const base = Math.max(0, parseInt(d.basePrice, 10) || 0);
            pricing[id] = {
              enabled:        d.enabled,
              minQuantity:    Math.max(1, parseInt(d.minQuantity,    10) || 1),
              turnaroundDays: Math.max(1, parseInt(d.turnaroundDays, 10) || days),
              ...(base > 0 ? { basePrice: base } : {}),
            };
          }
        }
        // Save print profile via the unified setup endpoint (same as website)
        await updateBusinessSetup(token, business.id, {
          printProfile: {
            serviceCategories: selectedCategories,
            cities:            serveAll ? [] : cities,
            serveAll,
            turnaroundDays:    days,
            minOrderValue:     minOrder,
            notes:             notes.trim(),
            acceptingOrders,
            pricing,
          },
        });
        if (pendingPhotos.length > 0 || removedIds.length > 0) {
          await syncBusinessSetupPhotos(token, business.id, {
            images:    pendingPhotos.map((p) => p.url),
            removeIds: removedIds,
          });
        }
        if (!editMode) {
          await completeBusinessSetup(token, business.id);
        }
        Alert.alert(
          editMode ? 'Settings Saved' : 'Print Shop is Live!',
          editMode
            ? 'Your print shop profile has been updated.'
            : 'Your print shop is now set up and ready to accept orders.',
          [{ text: 'OK', onPress: () => router.navigate('/(vendor)/businesses' as never) }],
        );
        return;
      }
      setStepIndex((i) => i + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (loadingSetup) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <ScreenHeader title={business.name} onBack={() => router.navigate('/(vendor)/businesses' as never)} />
        <SetupSkeleton />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <ScreenHeader title={business.name} onBack={() => router.navigate('/(vendor)/businesses' as never)} />
        <View style={s.centered}>
          <View style={s.errorIconWrap}>
            <Ionicons name="cloud-offline-outline" size={36} color={Brand.creamMuted} />
          </View>
          <Text style={s.errorTitle}>Failed to load</Text>
          <Text style={s.errorSub}>{loadError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.iconBtn} onPress={goBack} disabled={busy} hitSlop={8}>
          <Ionicons name="arrow-back" size={18} color={Brand.cream} />
        </Pressable>
        <View style={s.headerCenter}>
          <View style={s.stepChip}>
            <Ionicons name={POD_STEP_ICONS[currentStep]} size={11} color={Brand.primary} />
            <Text style={s.stepChipText}>
              Step {stepIndex + 1} of {totalSteps} · {POD_STEP_LABELS[currentStep]}
            </Text>
          </View>
          <Text style={s.headerTitle} numberOfLines={1}>{business.name}</Text>
          <Text style={s.headerSub}>Print Shop Setup</Text>
        </View>
        <Pressable style={s.iconBtn} onPress={() => router.navigate('/(vendor)/businesses' as never)} disabled={busy} hitSlop={8}>
          <Ionicons name="close" size={18} color={Brand.creamSub} />
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress * 100}%` as never }]} />
      </View>

      {/* Error banner */}
      {error ? (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle" size={15} color={Brand.error} />
          <Text style={s.errorBannerText}>{error}</Text>
          <Pressable onPress={() => setError('')} hitSlop={8}>
            <Ionicons name="close-outline" size={16} color={Brand.creamMuted} />
          </Pressable>
        </View>
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Step 1: Photos ── */}
          {currentStep === 'photos' && (
            <PhotosStep
              photos={displayPhotos}
              busy={busy}
              picking={pickingPhoto}
              onAdd={addPhoto}
              onRemove={removePhoto}
            />
          )}

          {/* ── Step 2: Products & area ── */}
          {currentStep === 'products' && (
            <View style={step.wrap}>
              <Text style={step.sectionTitle}>Products & service area</Text>
              <Text style={step.sectionSub}>Pick the print categories you offer and the cities you serve.</Text>

              <View style={{ gap: Spacing.two }}>
                <Text style={step.fieldLabel}>What do you print?</Text>
                <Text style={pod.hintText}>Only orders in these categories will reach you.</Text>
                <View style={pod.categoryGrid}>
                  {catalog.map((cat) => {
                    const selected = selectedCategories.includes(cat.id);
                    return (
                      <Pressable
                        key={cat.id}
                        style={[pod.categoryChip, selected && pod.categoryChipSelected]}
                        onPress={() => toggleCategory(cat.id)}
                      >
                        <Text style={pod.categoryIcon}>{cat.icon}</Text>
                        <Text style={[pod.categoryLabel, selected && pod.categoryLabelSelected]} numberOfLines={2}>
                          {cat.label}
                        </Text>
                        {selected && <Ionicons name="checkmark" size={14} color={Brand.primary} />}
                      </Pressable>
                    );
                  })}
                  {catalog.length === 0 && (
                    <View style={step.emptyHint}>
                      <Ionicons name="cloud-offline-outline" size={24} color={Brand.creamMuted} />
                      <Text style={step.emptyHintText}>Could not load catalog. Check connection.</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Serve everywhere */}
              <Pressable style={pod.toggleRow} onPress={() => setServeAll((v) => !v)}>
                <View style={{ flex: 1 }}>
                  <Text style={pod.toggleLabel}>Serve everywhere</Text>
                  <Text style={pod.toggleSub}>Accept orders from any city (deliver pan-India).</Text>
                </View>
                <View style={[pod.toggle, serveAll && pod.toggleActive]}>
                  <View style={[pod.toggleThumb, serveAll && pod.toggleThumbActive]} />
                </View>
              </Pressable>

              {!serveAll && (
                <>
                  <View style={pod.cityInputRow}>
                    <TextInput
                      style={[fieldStyle, { flex: 1 }]}
                      placeholder="Type a city and press Add"
                      placeholderTextColor={Brand.creamMuted}
                      value={cityInput}
                      onChangeText={setCityInput}
                      onSubmitEditing={addCity}
                      returnKeyType="done"
                    />
                    <Pressable style={pod.cityAddBtn} onPress={addCity}>
                      <Text style={pod.cityAddText}>Add</Text>
                    </Pressable>
                  </View>
                  {cities.length > 0 && (
                    <View style={pod.cityChips}>
                      {cities.map((city) => (
                        <View key={city} style={pod.cityChip}>
                          <Text style={pod.cityChipText}>{city}</Text>
                          <Pressable onPress={() => removeCity(city)} hitSlop={6}>
                            <Ionicons name="close-circle" size={14} color={Brand.primary} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

              {/* Turnaround */}
              <View style={pod.fieldGroup}>
                <Text style={step.fieldLabel}>Typical turnaround (days)</Text>
                <TextInput
                  style={fieldStyle}
                  placeholder="3"
                  placeholderTextColor={Brand.creamMuted}
                  value={turnaroundDays}
                  onChangeText={(v) => setTurnaroundDays(v.replace(/\D/g, ''))}
                  keyboardType="numeric"
                />
              </View>

              {/* Min order value */}
              <View style={pod.fieldGroup}>
                <Text style={step.fieldLabel}>Minimum order value (₹)</Text>
                <View style={step.priceRow}>
                  <Text style={step.rupee}>₹</Text>
                  <TextInput
                    style={[fieldStyle, { flex: 1, paddingLeft: Spacing.two }]}
                    placeholder="0"
                    placeholderTextColor={Brand.creamMuted}
                    value={minOrderValue}
                    onChangeText={(v) => setMinOrderValue(v.replace(/\D/g, ''))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Notes */}
              <View style={pod.fieldGroup}>
                <Text style={step.fieldLabel}>Notes for customers (optional)</Text>
                <TextInput
                  style={[fieldStyle, { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                  placeholder="e.g. Bulk discounts available. Design help offered."
                  placeholderTextColor={Brand.creamMuted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
              </View>
            </View>
          )}

          {/* ── Step 3: Pricing ── */}
          {currentStep === 'pricing' && (
            <View style={step.wrap}>
              <Text style={step.sectionTitle}>Product pricing</Text>
              <Text style={step.sectionSub}>
                Set a price for every product. Customers see these prices and pay directly — no more quotes.
              </Text>

              {selectedCategories.map((catId) => {
                const cat = catalog.find((c) => c.id === catId);
                if (!cat) return null;
                const draft = categoryPricing[catId] ?? makePricingDraft(cat);
                return (
                  <View key={catId} style={pod.pricingCard}>
                    {/* Card header */}
                    <View style={pod.pricingHeader}>
                      <Text style={pod.pricingIcon}>{cat.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={pod.pricingName}>{cat.label}</Text>
                        <Text style={pod.pricingModel}>
                          {cat.pricingModel === 'per_page' ? 'Priced per page' : 'Priced per unit'}
                        </Text>
                      </View>
                      <Pressable
                        style={[pod.offeredBadge, draft.enabled && pod.offeredBadgeActive]}
                        onPress={() => updatePricing(catId, { enabled: !draft.enabled })}
                      >
                        <Text style={[pod.offeredText, draft.enabled && pod.offeredTextActive]}>
                          {draft.enabled ? 'Offered' : 'Paused'}
                        </Text>
                      </Pressable>
                    </View>

                    {draft.enabled && (
                      <View style={pod.pricingFields}>
                        {/* Base price */}
                        <View style={pod.pricingRow}>
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text style={step.fieldLabel}>
                              Base price (₹ per {cat.pricingModel === 'per_page' ? 'page' : 'unit'})
                            </Text>
                            <View style={step.priceRow}>
                              <Text style={step.rupee}>₹</Text>
                              <TextInput
                                style={[fieldStyle, { flex: 1, paddingLeft: Spacing.two }]}
                                placeholder="0"
                                placeholderTextColor={Brand.creamMuted}
                                value={draft.basePrice}
                                onChangeText={(v) => updatePricing(catId, { basePrice: v.replace(/\D/g, '') })}
                                keyboardType="numeric"
                              />
                            </View>
                          </View>
                        </View>

                        {/* Min qty + Turnaround row */}
                        <View style={pod.pricingTwoCol}>
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text style={step.fieldLabel}>Minimum quantity</Text>
                            <TextInput
                              style={fieldStyle}
                              placeholder={String(cat.minQuantity || 1)}
                              placeholderTextColor={Brand.creamMuted}
                              value={draft.minQuantity}
                              onChangeText={(v) => updatePricing(catId, { minQuantity: v.replace(/\D/g, '') })}
                              keyboardType="numeric"
                            />
                          </View>
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text style={step.fieldLabel}>Turnaround (days)</Text>
                            <TextInput
                              style={fieldStyle}
                              placeholder="3"
                              placeholderTextColor={Brand.creamMuted}
                              value={draft.turnaroundDays}
                              onChangeText={(v) => updatePricing(catId, { turnaroundDays: v.replace(/\D/g, '') })}
                              keyboardType="numeric"
                            />
                          </View>
                        </View>

                        {/* From price summary */}
                        {parseInt(draft.basePrice, 10) > 0 ? (
                          <Text style={pod.fromPrice}>
                            From ₹{parseInt(draft.basePrice, 10).toLocaleString('en-IN')} per {cat.pricingModel === 'per_page' ? 'page' : 'unit'}
                          </Text>
                        ) : (
                          <Text style={pod.fromPriceMuted}>From — per {cat.pricingModel === 'per_page' ? 'page' : 'unit'}</Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Step 4: Review ── */}
          {currentStep === 'review' && (
            <View style={step.wrap}>
              <Text style={step.sectionTitle}>Review & go live</Text>
              <Text style={step.sectionSub}>Go live to start receiving print orders.</Text>

              {/* Print categories */}
              <View style={review.card}>
                <View style={review.cardHeader}>
                  <Ionicons name="print-outline" size={14} color={Brand.primary} />
                  <Text style={review.cardTitle}>Print categories ({selectedCategories.length})</Text>
                </View>
                {selectedCategories.map((id) => {
                  const cat = catalog.find((c) => c.id === id);
                  return (
                    <Text key={id} style={review.cardSub}>
                      {cat?.icon}  {cat?.label ?? id}
                    </Text>
                  );
                })}
              </View>

              {/* Service area */}
              <View style={review.card}>
                <View style={review.cardHeader}>
                  <Ionicons name="location-outline" size={14} color={Brand.primary} />
                  <Text style={review.cardTitle}>Service area</Text>
                </View>
                <Text style={review.cardValue}>
                  {serveAll ? 'Everywhere (pan-India)' : (cities.join(', ') || '—')}
                </Text>
              </View>

              {/* Details */}
              <View style={review.card}>
                <View style={review.cardHeader}>
                  <Ionicons name="information-circle-outline" size={14} color={Brand.primary} />
                  <Text style={review.cardTitle}>Details</Text>
                </View>
                <Text style={review.cardSub}>Turnaround: {turnaroundDays || '3'} days</Text>
                {minOrderValue ? (
                  <Text style={review.cardSub}>
                    Min order: ₹{parseInt(minOrderValue, 10).toLocaleString('en-IN')}
                  </Text>
                ) : null}
                {notes.trim() ? <Text style={review.ruleText}>{notes}</Text> : null}
              </View>

              {/* Photos */}
              {displayPhotos.length > 0 && (
                <View style={review.card}>
                  <View style={review.cardHeader}>
                    <Ionicons name="images-outline" size={14} color={Brand.primary} />
                    <Text style={review.cardTitle}>Photos ({displayPhotos.length})</Text>
                  </View>
                  <View style={review.photoRow}>
                    {displayPhotos.map((p) => (
                      <Image key={p.id} source={{ uri: p.url }} style={review.photoThumb} resizeMode="cover" />
                    ))}
                  </View>
                </View>
              )}
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
              <Text style={s.continueBtnText}>Saving…</Text>
            </>
          ) : currentStep === 'review' ? (
            <>
              <Ionicons name="rocket-outline" size={18} color="#fff" />
              <Text style={s.continueBtnText}>{editMode ? 'Save Changes' : 'Go Live'}</Text>
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

// ─── Commerce Setup Flow ──────────────────────────────────────────────────────

type CommerceStepId = 'photos' | 'shop' | 'products' | 'review';

const COMMERCE_STEPS: CommerceStepId[] = ['photos', 'shop', 'products', 'review'];

const COMMERCE_STEP_LABELS: Record<CommerceStepId, string> = {
  photos:   'Photos',
  shop:     'Shop details',
  products: 'Products',
  review:   'Review',
};

const COMMERCE_STEP_ICONS: Record<CommerceStepId, keyof typeof Ionicons.glyphMap> = {
  photos:   'images-outline',
  shop:     'storefront-outline',
  products: 'pricetags-outline',
  review:   'checkmark-circle-outline',
};

function CommerceSetupFlow({
  business,
  token,
  editMode,
}: {
  business: BusinessWithSetup;
  token: string;
  editMode: boolean;
}) {
  const [stepIndex,    setStepIndex]    = useState(0);
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState('');
  const [pickingPhoto, setPickingPhoto] = useState(false);

  // Photos
  const [savedPhotos,   setSavedPhotos]   = useState<{ id: string; url: string }[]>(
    () => (business.setup?.photos ?? []).map((p) => ({ id: p.id, url: p.url })),
  );
  const [pendingPhotos, setPendingPhotos] = useState<{ id: string; url: string }[]>([]);
  const [removedIds,    setRemovedIds]    = useState<string[]>([]);

  // Shop details
  const [profile, setProfile] = useState<CommerceProfile>(
    () => business.setup?.commerceProfile ?? defaultCommerceProfile(),
  );
  const [minOrderInput, setMinOrderInput] = useState(
    () => (business.setup?.commerceProfile?.minOrderValue ? String(business.setup.commerceProfile.minOrderValue) : ''),
  );

  // Products
  const [products,     setProducts]     = useState<CommerceProduct[]>([]);
  const [loadingProds, setLoadingProds] = useState(true);
  const [prodName,     setProdName]     = useState('');
  const [prodPrice,    setProdPrice]    = useState('');
  const [prodStock,    setProdStock]    = useState('10');
  const [addingProd,   setAddingProd]   = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const displayPhotos: DisplayPhoto[] = useMemo(() => [
    ...savedPhotos.filter((p) => !removedIds.includes(p.id)).map((p) => ({ ...p, pending: false })),
    ...pendingPhotos.map((p) => ({ ...p, pending: true })),
  ], [savedPhotos, pendingPhotos, removedIds]);

  const currentStep = COMMERCE_STEPS[stepIndex];
  const totalSteps  = COMMERCE_STEPS.length;
  const progress    = (stepIndex + 1) / totalSteps;

  const loadProducts = useCallback(async () => {
    setLoadingProds(true);
    try {
      setProducts(await listVendorCommerceProducts(token, business.id));
    } catch {
      // non-fatal — vendor can retry by reopening this step
    } finally {
      setLoadingProds(false);
    }
  }, [token, business.id]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  async function addPhoto() {
    console.log('[Commerce Photos] addPhoto: requesting permission');
    setPickingPhoto(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[Commerce Photos] permission:', perm.status, '| granted:', perm.granted);
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access in Settings.');
        return;
      }
      console.log('[Commerce Photos] launching image picker');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75, base64: true });
      console.log('[Commerce Photos] picker result | canceled:', result.canceled, '| assets:', result.assets?.length ?? 0);
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const mime  = asset.mimeType ?? 'image/jpeg';
        console.log('[Commerce Photos] asset | mime:', mime, '| base64 length:', asset.base64?.length ?? 0, '| uri:', asset.uri);
        if (!asset.base64) {
          console.warn('[Commerce Photos] base64 is missing/empty — cannot build data URI');
          Alert.alert('Photo error', 'Could not read image data. Please try a different photo.');
          return;
        }
        const dataUrl = `data:${mime};base64,${asset.base64}`;
        const id = `pending-${Date.now()}`;
        console.log('[Commerce Photos] queued pending photo | id:', id, '| dataUrl prefix:', dataUrl.slice(0, 50));
        setPendingPhotos((prev) => [...prev, { id, url: dataUrl }]);
      } else {
        console.log('[Commerce Photos] picker cancelled or no assets returned');
      }
    } catch (e: unknown) {
      console.error('[Commerce Photos] addPhoto threw:', e);
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not open photo picker.');
    } finally {
      setPickingPhoto(false);
    }
  }

  function removePhoto(photo: DisplayPhoto) {
    if (photo.pending) setPendingPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    else setRemovedIds((prev) => [...prev, photo.id]);
  }

  async function addProduct() {
    const name = prodName.trim();
    if (!name) { setError('Enter a product name.'); return; }
    const price = Math.round(Number(prodPrice));
    if (!Number.isFinite(price) || price < 1) { setError('Price must be at least ₹1.'); return; }
    const stock = Math.round(Number(prodStock));
    if (!prodStock.trim() || !Number.isFinite(stock) || stock < 0) { setError('Stock must be 0 or more.'); return; }
    setAddingProd(true);
    setError('');
    try {
      const created = await createCommerceProduct(token, business.id, { name, price, stock });
      setProducts((prev) => [created, ...prev]);
      setProdName(''); setProdPrice(''); setProdStock('10');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not add product.');
    } finally {
      setAddingProd(false);
    }
  }

  function removeProduct(product: CommerceProduct) {
    Alert.alert('Remove product', `Remove "${product.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCommerceProduct(token, business.id, product.id);
            setProducts((prev) => prev.filter((p) => p.id !== product.id));
          } catch {
            Alert.alert('Error', 'Could not remove product.');
          }
        },
      },
    ]);
  }

  function goBack() {
    setError('');
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      router.navigate('/(vendor)/businesses' as never);
    }
  }

  async function handleContinue() {
    setError('');
    setBusy(true);
    try {
      if (currentStep === 'photos') {
        console.log('[Commerce Photos] handleContinue photos | pending:', pendingPhotos.length, '| removedIds:', removedIds.length);
        if (pendingPhotos.length > 0 || removedIds.length > 0) {
          console.log('[Commerce Photos] calling syncBusinessSetupPhotos | businessId:', business.id);
          try {
            const updated = await syncBusinessSetupPhotos(token, business.id, {
              images:    pendingPhotos.map((p) => p.url),
              removeIds: removedIds,
            });
            console.log('[Commerce Photos] syncBusinessSetupPhotos success | photos returned:', updated.setup?.photos?.length ?? 0);
            if (updated.setup) {
              setSavedPhotos(updated.setup.photos.map((p) => ({ id: p.id, url: p.url })));
              setPendingPhotos([]);
              setRemovedIds([]);
            } else {
              console.warn('[Commerce Photos] syncBusinessSetupPhotos returned no setup object');
            }
          } catch (uploadErr: unknown) {
            console.error('[Commerce Photos] syncBusinessSetupPhotos failed:', uploadErr);
            throw uploadErr;
          }
        } else {
          console.log('[Commerce Photos] no changes — skipping upload');
        }
      } else if (currentStep === 'shop') {
        const minOrderValue = Math.max(0, parseInt(minOrderInput, 10) || 0);
        const nextProfile = { ...profile, minOrderValue };
        setProfile(nextProfile);
        await updateBusinessSetup(token, business.id, { commerceProfile: nextProfile });
      } else if (currentStep === 'products') {
        if (products.length === 0) {
          setError('Add at least one product before continuing.');
          return;
        }
      } else if (currentStep === 'review') {
        if (products.length === 0) {
          setError('Add at least one product before going live.');
          setStepIndex(COMMERCE_STEPS.indexOf('products'));
          return;
        }
        if (pendingPhotos.length > 0 || removedIds.length > 0) {
          await syncBusinessSetupPhotos(token, business.id, {
            images:    pendingPhotos.map((p) => p.url),
            removeIds: removedIds,
          });
        }
        if (!editMode) {
          await completeBusinessSetup(token, business.id);
        }
        Alert.alert(
          editMode ? 'Settings Saved' : 'Shop is Live!',
          editMode
            ? 'Your shop profile has been updated.'
            : 'Your shop is now set up and ready to accept orders.',
          [{ text: 'OK', onPress: () => router.navigate('/(vendor)/businesses' as never) }],
        );
        return;
      }
      setStepIndex((i) => i + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.iconBtn} onPress={goBack} disabled={busy} hitSlop={8}>
          <Ionicons name="arrow-back" size={18} color={Brand.cream} />
        </Pressable>
        <View style={s.headerCenter}>
          <View style={s.stepChip}>
            <Ionicons name={COMMERCE_STEP_ICONS[currentStep]} size={11} color={Brand.primary} />
            <Text style={s.stepChipText}>
              Step {stepIndex + 1} of {totalSteps} · {COMMERCE_STEP_LABELS[currentStep]}
            </Text>
          </View>
          <Text style={s.headerTitle} numberOfLines={1}>{business.name}</Text>
          <Text style={s.headerSub}>Shop Setup</Text>
        </View>
        <Pressable style={s.iconBtn} onPress={() => router.navigate('/(vendor)/businesses' as never)} disabled={busy} hitSlop={8}>
          <Ionicons name="close" size={18} color={Brand.creamSub} />
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress * 100}%` as never }]} />
      </View>

      {/* Error banner */}
      {error ? (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle" size={15} color={Brand.error} />
          <Text style={s.errorBannerText}>{error}</Text>
          <Pressable onPress={() => setError('')} hitSlop={8}>
            <Ionicons name="close-outline" size={16} color={Brand.creamMuted} />
          </Pressable>
        </View>
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Step 1: Photos ── */}
          {currentStep === 'photos' && (
            <PhotosStep
              photos={displayPhotos}
              busy={busy}
              picking={pickingPhoto}
              onAdd={addPhoto}
              onRemove={removePhoto}
            />
          )}

          {/* ── Step 2: Shop details ── */}
          {currentStep === 'shop' && (
            <View style={step.wrap}>
              <Text style={step.sectionTitle}>Shop details</Text>
              <Text style={step.sectionSub}>Pickup notes and an optional minimum order value.</Text>

              <View style={pod.fieldGroup}>
                <Text style={step.fieldLabel}>Pickup & shop notes</Text>
                <TextInput
                  style={[fieldStyle, { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                  placeholder="e.g. Pickup Mon–Sat 10am–7pm from the counter. Bring your order ID."
                  placeholderTextColor={Brand.creamMuted}
                  value={profile.notes}
                  onChangeText={(v) => setProfile((p) => ({ ...p, notes: v }))}
                  multiline
                  maxLength={1000}
                />
              </View>

              <View style={pod.fieldGroup}>
                <Text style={step.fieldLabel}>Minimum order value (optional)</Text>
                <View style={step.priceRow}>
                  <Text style={step.rupee}>₹</Text>
                  <TextInput
                    style={[fieldStyle, { flex: 1, paddingLeft: Spacing.two }]}
                    placeholder="0"
                    placeholderTextColor={Brand.creamMuted}
                    value={minOrderInput}
                    onChangeText={(v) => setMinOrderInput(v.replace(/\D/g, ''))}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          )}

          {/* ── Step 3: Products ── */}
          {currentStep === 'products' && (
            <View style={step.wrap}>
              <Text style={step.sectionTitle}>Your products</Text>
              <Text style={step.sectionSub}>
                Add each item with a price and stock count. Customers order from this list.
              </Text>

              <View style={step.addForm}>
                <TextInput
                  style={[fieldStyle, step.input]}
                  placeholder="Product name"
                  placeholderTextColor={Brand.creamMuted}
                  value={prodName}
                  onChangeText={setProdName}
                />
                <View style={step.priceRow}>
                  <Text style={step.rupee}>₹</Text>
                  <TextInput
                    style={[fieldStyle, step.input, { flex: 1, paddingLeft: Spacing.two }]}
                    placeholder="Price"
                    placeholderTextColor={Brand.creamMuted}
                    value={prodPrice}
                    onChangeText={(v) => setProdPrice(v.replace(/\D/g, ''))}
                    keyboardType="numeric"
                  />
                </View>
                <TextInput
                  style={[fieldStyle, step.input]}
                  placeholder="Stock"
                  placeholderTextColor={Brand.creamMuted}
                  value={prodStock}
                  onChangeText={(v) => setProdStock(v.replace(/\D/g, ''))}
                  keyboardType="numeric"
                />
                <Pressable style={step.addBtn} onPress={addProduct} disabled={addingProd}>
                  {addingProd ? (
                    <ActivityIndicator size="small" color={Brand.primary} />
                  ) : (
                    <>
                      <Ionicons name="add" size={16} color={Brand.primary} />
                      <Text style={step.addBtnText}>Add product</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {loadingProds ? (
                <View style={step.emptyHint}>
                  <ActivityIndicator size="small" color={Brand.creamMuted} />
                </View>
              ) : products.length > 0 ? (
                <View style={step.resourceList}>
                  {products.map((p, i) => (
                    <View key={p.id} style={[step.resourceItem, i < products.length - 1 && step.resourceBorder]}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={step.staffName}>{p.name}</Text>
                        <Text style={step.staffRole}>
                          ₹{p.price.toLocaleString('en-IN')} · {p.stock} in stock
                        </Text>
                      </View>
                      <Pressable onPress={() => removeProduct(p)} style={step.removeBtn} hitSlop={8}>
                        <Ionicons name="trash-outline" size={15} color={Brand.error} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={step.emptyHint}>
                  <Ionicons name="cube-outline" size={28} color={Brand.creamMuted} />
                  <Text style={step.emptyHintText}>No products yet — add at least one to go live.</Text>
                </View>
              )}

              <Pressable
                style={pod.toggleRow}
                onPress={() => router.push('/(vendor)/products' as never)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={pod.toggleLabel}>Need photos or bulk edits?</Text>
                  <Text style={pod.toggleSub}>Manage full product details, images, and availability.</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Brand.creamMuted} />
              </Pressable>
            </View>
          )}

          {/* ── Step 4: Review ── */}
          {currentStep === 'review' && (
            <View style={step.wrap}>
              <Text style={step.sectionTitle}>Review & go live</Text>
              <Text style={step.sectionSub}>Go live so customers can order from your shop.</Text>

              <View style={review.card}>
                <View style={review.cardHeader}>
                  <Ionicons name="storefront-outline" size={14} color={Brand.primary} />
                  <Text style={review.cardTitle}>Shop details</Text>
                </View>
                <Text style={review.cardSub}>{profile.notes.trim() || 'No pickup notes'}</Text>
                {profile.minOrderValue > 0 && (
                  <Text style={review.cardValue}>
                    Min order ₹{profile.minOrderValue.toLocaleString('en-IN')}
                  </Text>
                )}
              </View>

              <View style={review.card}>
                <View style={review.cardHeader}>
                  <Ionicons name="pricetags-outline" size={14} color={Brand.primary} />
                  <Text style={review.cardTitle}>Products ({products.length})</Text>
                </View>
                {products.length > 0 ? products.slice(0, 5).map((p) => (
                  <Text key={p.id} style={review.cardSub}>
                    {p.name} · ₹{p.price.toLocaleString('en-IN')}
                  </Text>
                )) : (
                  <Text style={review.warn}>No products added</Text>
                )}
              </View>

              {displayPhotos.length > 0 && (
                <View style={review.card}>
                  <View style={review.cardHeader}>
                    <Ionicons name="images-outline" size={14} color={Brand.primary} />
                    <Text style={review.cardTitle}>Photos ({displayPhotos.length})</Text>
                  </View>
                  <View style={review.photoRow}>
                    {displayPhotos.map((p) => (
                      <Image key={p.id} source={{ uri: p.url }} style={review.photoThumb} resizeMode="cover" />
                    ))}
                  </View>
                </View>
              )}
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
              <Text style={s.continueBtnText}>Saving…</Text>
            </>
          ) : currentStep === 'review' ? (
            <>
              <Ionicons name="rocket-outline" size={18} color="#fff" />
              <Text style={s.continueBtnText}>{editMode ? 'Save Changes' : 'Go Live'}</Text>
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

// ─── Creator Setup Flow ───────────────────────────────────────────────────────

type CreatorStepId = 'photos' | 'profile' | 'review';

const CREATOR_STEPS: CreatorStepId[] = ['photos', 'profile', 'review'];

const CREATOR_STEP_LABELS: Record<CreatorStepId, string> = {
  photos:  'Photos',
  profile: 'Creator profile',
  review:  'Review',
};

const CREATOR_STEP_ICONS: Record<CreatorStepId, keyof typeof Ionicons.glyphMap> = {
  photos:  'images-outline',
  profile: 'person-circle-outline',
  review:  'checkmark-circle-outline',
};

function CreatorSetupFlow({
  business,
  token,
  editMode,
}: {
  business: BusinessWithSetup;
  token: string;
  editMode: boolean;
}) {
  const [stepIndex,    setStepIndex]    = useState(0);
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState('');
  const [pickingPhoto, setPickingPhoto] = useState(false);

  // Photos
  const [savedPhotos,   setSavedPhotos]   = useState<{ id: string; url: string }[]>(
    () => (business.setup?.photos ?? []).map((p) => ({ id: p.id, url: p.url })),
  );
  const [pendingPhotos, setPendingPhotos] = useState<{ id: string; url: string }[]>([]);
  const [removedIds,    setRemovedIds]    = useState<string[]>([]);

  // Creator profile
  const [profile, setProfile] = useState<CreatorProfile>(
    () => business.setup?.creatorProfile ?? defaultCreatorProfile(),
  );

  const scrollRef = useRef<ScrollView>(null);

  const displayPhotos: DisplayPhoto[] = useMemo(() => [
    ...savedPhotos.filter((p) => !removedIds.includes(p.id)).map((p) => ({ ...p, pending: false })),
    ...pendingPhotos.map((p) => ({ ...p, pending: true })),
  ], [savedPhotos, pendingPhotos, removedIds]);

  const currentStep = CREATOR_STEPS[stepIndex];
  const totalSteps  = CREATOR_STEPS.length;
  const progress    = (stepIndex + 1) / totalSteps;

  async function addPhoto() {
    console.log('[Creator Photos] addPhoto: requesting permission');
    setPickingPhoto(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[Creator Photos] permission:', perm.status, '| granted:', perm.granted);
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access in Settings.');
        return;
      }
      console.log('[Creator Photos] launching image picker');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75, base64: true });
      console.log('[Creator Photos] picker result | canceled:', result.canceled, '| assets:', result.assets?.length ?? 0);
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const mime  = asset.mimeType ?? 'image/jpeg';
        console.log('[Creator Photos] asset | mime:', mime, '| base64 length:', asset.base64?.length ?? 0, '| uri:', asset.uri);
        if (!asset.base64) {
          console.warn('[Creator Photos] base64 is missing/empty — cannot build data URI');
          Alert.alert('Photo error', 'Could not read image data. Please try a different photo.');
          return;
        }
        const dataUrl = `data:${mime};base64,${asset.base64}`;
        const id = `pending-${Date.now()}`;
        console.log('[Creator Photos] queued pending photo | id:', id, '| dataUrl prefix:', dataUrl.slice(0, 50));
        setPendingPhotos((prev) => [...prev, { id, url: dataUrl }]);
      } else {
        console.log('[Creator Photos] picker cancelled or no assets returned');
      }
    } catch (e: unknown) {
      console.error('[Creator Photos] addPhoto threw:', e);
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not open photo picker.');
    } finally {
      setPickingPhoto(false);
    }
  }

  function removePhoto(photo: DisplayPhoto) {
    if (photo.pending) setPendingPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    else setRemovedIds((prev) => [...prev, photo.id]);
  }

  function goBack() {
    setError('');
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      router.navigate('/(vendor)/businesses' as never);
    }
  }

  async function handleContinue() {
    setError('');
    setBusy(true);
    try {
      if (currentStep === 'photos') {
        console.log('[Creator Photos] handleContinue photos | pending:', pendingPhotos.length, '| removedIds:', removedIds.length);
        if (pendingPhotos.length > 0 || removedIds.length > 0) {
          console.log('[Creator Photos] calling syncBusinessSetupPhotos | businessId:', business.id);
          try {
            const updated = await syncBusinessSetupPhotos(token, business.id, {
              images:    pendingPhotos.map((p) => p.url),
              removeIds: removedIds,
            });
            console.log('[Creator Photos] syncBusinessSetupPhotos success | photos returned:', updated.setup?.photos?.length ?? 0);
            if (updated.setup) {
              setSavedPhotos(updated.setup.photos.map((p) => ({ id: p.id, url: p.url })));
              setPendingPhotos([]);
              setRemovedIds([]);
            } else {
              console.warn('[Creator Photos] syncBusinessSetupPhotos returned no setup object');
            }
          } catch (uploadErr: unknown) {
            console.error('[Creator Photos] syncBusinessSetupPhotos failed:', uploadErr);
            throw uploadErr;
          }
        } else {
          console.log('[Creator Photos] no changes — skipping upload');
        }
      } else if (currentStep === 'profile') {
        await updateBusinessSetup(token, business.id, { creatorProfile: profile });
      } else if (currentStep === 'review') {
        if (!profile.bio.trim()) {
          setError('Add a bio before going live.');
          setStepIndex(CREATOR_STEPS.indexOf('profile'));
          return;
        }
        if (!profile.niche.trim()) {
          setError('Add your niche before going live.');
          setStepIndex(CREATOR_STEPS.indexOf('profile'));
          return;
        }
        if (pendingPhotos.length > 0 || removedIds.length > 0) {
          await syncBusinessSetupPhotos(token, business.id, {
            images:    pendingPhotos.map((p) => p.url),
            removeIds: removedIds,
          });
        }
        if (!editMode) {
          await completeBusinessSetup(token, business.id);
        }
        Alert.alert(
          editMode ? 'Settings Saved' : 'Profile is Live!',
          editMode
            ? 'Your creator profile has been updated.'
            : 'Your creator profile is now live. Publish collab offers from your business.',
          [{ text: 'OK', onPress: () => router.navigate('/(vendor)/businesses' as never) }],
        );
        return;
      }
      setStepIndex((i) => i + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.iconBtn} onPress={goBack} disabled={busy} hitSlop={8}>
          <Ionicons name="arrow-back" size={18} color={Brand.cream} />
        </Pressable>
        <View style={s.headerCenter}>
          <View style={s.stepChip}>
            <Ionicons name={CREATOR_STEP_ICONS[currentStep]} size={11} color={Brand.primary} />
            <Text style={s.stepChipText}>
              Step {stepIndex + 1} of {totalSteps} · {CREATOR_STEP_LABELS[currentStep]}
            </Text>
          </View>
          <Text style={s.headerTitle} numberOfLines={1}>{business.name}</Text>
          <Text style={s.headerSub}>Creator Profile Setup</Text>
        </View>
        <Pressable style={s.iconBtn} onPress={() => router.navigate('/(vendor)/businesses' as never)} disabled={busy} hitSlop={8}>
          <Ionicons name="close" size={18} color={Brand.creamSub} />
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress * 100}%` as never }]} />
      </View>

      {/* Error banner */}
      {error ? (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle" size={15} color={Brand.error} />
          <Text style={s.errorBannerText}>{error}</Text>
          <Pressable onPress={() => setError('')} hitSlop={8}>
            <Ionicons name="close-outline" size={16} color={Brand.creamMuted} />
          </Pressable>
        </View>
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Step 1: Photos ── */}
          {currentStep === 'photos' && (
            <PhotosStep
              photos={displayPhotos}
              busy={busy}
              picking={pickingPhoto}
              onAdd={addPhoto}
              onRemove={removePhoto}
            />
          )}

          {/* ── Step 2: Creator profile ── */}
          {currentStep === 'profile' && (
            <View style={step.wrap}>
              <Text style={step.sectionTitle}>About you</Text>
              <Text style={step.sectionSub}>
                Customers book collabs and shoutouts — help them understand your brand.
              </Text>

              <View style={pod.fieldGroup}>
                <Text style={step.fieldLabel}>Bio</Text>
                <TextInput
                  style={[fieldStyle, { minHeight: 90, textAlignVertical: 'top', paddingTop: 10 }]}
                  placeholder="Who you are, what you create, and what makes your collabs special."
                  placeholderTextColor={Brand.creamMuted}
                  value={profile.bio}
                  onChangeText={(v) => setProfile((p) => ({ ...p, bio: v }))}
                  multiline
                  maxLength={2000}
                />
              </View>

              <View style={pod.fieldGroup}>
                <Text style={step.fieldLabel}>Niche</Text>
                <TextInput
                  style={fieldStyle}
                  placeholder="e.g. Fitness, comedy, education"
                  placeholderTextColor={Brand.creamMuted}
                  value={profile.niche}
                  onChangeText={(v) => setProfile((p) => ({ ...p, niche: v }))}
                  maxLength={120}
                />
              </View>

              <View style={pod.fieldGroup}>
                <Text style={step.fieldLabel}>Social links</Text>
                <View style={{ gap: Spacing.two }}>
                  <TextInput
                    style={fieldStyle}
                    placeholder="Instagram @handle or URL"
                    placeholderTextColor={Brand.creamMuted}
                    value={profile.socialLinks.instagram}
                    onChangeText={(v) => setProfile((p) => ({ ...p, socialLinks: { ...p.socialLinks, instagram: v } }))}
                  />
                  <TextInput
                    style={fieldStyle}
                    placeholder="YouTube channel URL"
                    placeholderTextColor={Brand.creamMuted}
                    value={profile.socialLinks.youtube}
                    onChangeText={(v) => setProfile((p) => ({ ...p, socialLinks: { ...p.socialLinks, youtube: v } }))}
                  />
                  <TextInput
                    style={fieldStyle}
                    placeholder="Other link (optional)"
                    placeholderTextColor={Brand.creamMuted}
                    value={profile.socialLinks.other}
                    onChangeText={(v) => setProfile((p) => ({ ...p, socialLinks: { ...p.socialLinks, other: v } }))}
                  />
                </View>
              </View>

              <Pressable
                style={pod.toggleRow}
                onPress={() => setProfile((p) => ({ ...p, acceptingBookings: !p.acceptingBookings }))}
              >
                <View style={{ flex: 1 }}>
                  <Text style={pod.toggleLabel}>Accepting new collab bookings</Text>
                </View>
                <View style={[pod.toggle, profile.acceptingBookings && pod.toggleActive]}>
                  <View style={[pod.toggleThumb, profile.acceptingBookings && pod.toggleThumbActive]} />
                </View>
              </Pressable>
            </View>
          )}

          {/* ── Step 3: Review ── */}
          {currentStep === 'review' && (
            <View style={step.wrap}>
              <Text style={step.sectionTitle}>Review & go live</Text>
              <Text style={step.sectionSub}>Go live, then publish collab offers from your business.</Text>

              <View style={review.card}>
                <View style={review.cardHeader}>
                  <Ionicons name="person-circle-outline" size={14} color={Brand.primary} />
                  <Text style={review.cardTitle}>{profile.niche || '—'}</Text>
                </View>
                <Text style={review.cardSub}>{profile.bio.trim() || 'No bio yet'}</Text>
              </View>

              {displayPhotos.length > 0 && (
                <View style={review.card}>
                  <View style={review.cardHeader}>
                    <Ionicons name="images-outline" size={14} color={Brand.primary} />
                    <Text style={review.cardTitle}>Photos ({displayPhotos.length})</Text>
                  </View>
                  <View style={review.photoRow}>
                    {displayPhotos.map((p) => (
                      <Image key={p.id} source={{ uri: p.url }} style={review.photoThumb} resizeMode="cover" />
                    ))}
                  </View>
                </View>
              )}
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
              <Text style={s.continueBtnText}>Saving…</Text>
            </>
          ) : currentStep === 'review' ? (
            <>
              <Ionicons name="rocket-outline" size={18} color="#fff" />
              <Text style={s.continueBtnText}>{editMode ? 'Save Changes' : 'Go Live'}</Text>
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SetupSkeleton() {
  return (
    <View style={sk.wrap}>
      {[88, 64, 88, 56].map((h, i) => (
        <View key={i} style={[sk.bone, { height: h }]} />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BusinessSetupScreen() {
  const { id: businessId, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const editMode = edit === '1';
  const token    = useAuthStore((s) => s.token);

  const [business,     setBusiness]     = useState<BusinessWithSetup | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState('');
  const [stepIndex,    setStepIndex]    = useState(0);
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState('');

  // Setup state
  const [resources,     setResources]     = useState<BusinessResource[]>([]);
  const [weeklyHours,   setWeeklyHours]   = useState<WeeklyHours>(DEFAULT_WEEKLY_HOURS);
  const [slotMinutes,   setSlotMinutes]   = useState(60);
  const [maxGuests,     setMaxGuests]     = useState('');
  const [venueRules,    setVenueRules]    = useState('');
  const [savedPhotos,   setSavedPhotos]   = useState<{ id: string; url: string }[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<{ id: string; url: string }[]>([]);
  const [removedIds,    setRemovedIds]    = useState<string[]>([]);
  // Service-mode state (salon / clinic / coaching)
  const [staffList,     setStaffList]     = useState<BusinessStaff[]>([]);
  const [servicesList,  setServicesList]  = useState<BusinessService[]>([]);
  const [bufferMinutes, setBufferMinutes] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const resourcesStepRef = useRef<ResourcesStepHandle>(null);
  const servicesStepRef = useRef<ServicesStepHandle>(null);

  // Derived
  const flow = useMemo(
    () => business ? resolveSetupFlow(business.typeId, business.setup?.bookingMode ?? 'slots') : null,
    [business],
  );
  const steps       = flow?.steps ?? [];
  const currentStep = steps[stepIndex] as StepId | undefined;
  const totalSteps  = steps.length;
  const progress    = totalSteps > 0 ? (stepIndex + 1) / totalSteps : 0;

  const displayPhotos: DisplayPhoto[] = useMemo(() => [
    ...savedPhotos.filter((p) => !removedIds.includes(p.id)).map((p) => ({ ...p, pending: false })),
    ...pendingPhotos.map((p) => ({ ...p, pending: true })),
  ], [savedPhotos, pendingPhotos, removedIds]);

  const openDays = SETUP_DAYS.filter((d) => !weeklyHours[d].closed);

  // Load business
  const load = useCallback(async () => {
    if (!token || !businessId) return;
    setLoading(true);
    setLoadError('');
    try {
      const b = await getBusinessSetup(token, businessId);
      setBusiness(b);
      if (b.setup) {
        setResources(b.setup.resources.map((r) => ({ ...r })));
        setWeeklyHours(b.setup.weeklyHours);
        setSlotMinutes(b.setup.slotMinutes);
        setMaxGuests(b.setup.maxGuests ? String(b.setup.maxGuests) : '');
        setVenueRules(b.setup.venueRules ?? '');
        setSavedPhotos(b.setup.photos.map((p) => ({ id: p.id, url: p.url })));
        // Service-mode fields
        if (b.setup.staff)        setStaffList(b.setup.staff.map((s) => ({ ...s })));
        if (b.setup.services)     setServicesList(b.setup.services.map((s) => ({ ...s })));
        if (b.setup.bufferMinutes != null) setBufferMinutes(b.setup.bufferMinutes);
      }
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load business');
    } finally {
      setLoading(false);
    }
  }, [token, businessId]);

  useEffect(() => { load(); }, [load]);

  function scrollTop() {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function goBack() {
    setError('');
    if (stepIndex > 0) { setStepIndex(stepIndex - 1); scrollTop(); }
    else router.navigate('/(vendor)/businesses' as never);
  }

  // Resource ops
  function addResource(r: Omit<BusinessResource, 'id'>): string | null {
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setResources((prev) => [...prev, { id, ...r }]);
    return null;
  }

  function removeResource(id: string) {
    setResources((prev) => prev.filter((r) => r.id !== id));
  }

  function updateResource(id: string, patch: Partial<BusinessResource>) {
    setResources((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  }

  // Hour ops
  function toggleDay(day: DayKey) {
    setWeeklyHours((h) => ({ ...h, [day]: { ...h[day], closed: !h[day].closed } }));
  }

  function setUniformHours(open: string, close: string) {
    setWeeklyHours((h) => {
      const next = { ...h };
      for (const day of SETUP_DAYS) {
        if (!next[day].closed) next[day] = { ...next[day], open, close };
      }
      return next;
    });
  }

  // Staff ops
  function addStaff(s: Omit<BusinessStaff, 'id'>) {
    const id = `local-staff-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setStaffList((prev) => [...prev, { id, ...s }]);
  }

  function removeStaff(id: string) {
    setStaffList((prev) => prev.filter((s) => s.id !== id));
    // Remove this staff from all services
    setServicesList((prev) =>
      prev.map((svc) => ({ ...svc, staffIds: svc.staffIds.filter((x) => x !== id) })),
    );
  }

  // Service ops
  function addService(s: Omit<BusinessService, 'id'>) {
    const id = `local-svc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setServicesList((prev) => [...prev, { id, ...s }]);
  }

  function removeService(id: string) {
    setServicesList((prev) => prev.filter((s) => s.id !== id));
  }

  // Photo ops
  async function addPhoto() {
    console.log('[Setup Photos] addPhoto: requesting permission');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log('[Setup Photos] permission:', perm.status, '| granted:', perm.granted);
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access in Settings.');
      return;
    }
    console.log('[Setup Photos] launching image picker');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      base64: true,
    });
    console.log('[Setup Photos] picker result | canceled:', result.canceled, '| assets:', result.assets?.length ?? 0);
    if (!result.canceled && result.assets?.[0]) {
      const asset  = result.assets[0];
      const mime   = asset.mimeType ?? 'image/jpeg';
      console.log('[Setup Photos] asset | mime:', mime, '| base64 length:', asset.base64?.length ?? 0, '| uri:', asset.uri);
      if (!asset.base64) {
        console.warn('[Setup Photos] base64 is missing/empty — cannot build data URI');
        Alert.alert('Photo error', 'Could not read image data. Please try a different photo.');
        return;
      }
      const dataUrl = `data:${mime};base64,${asset.base64}`;
      const id = `pending-${Date.now()}`;
      console.log('[Setup Photos] queued pending photo | id:', id, '| dataUrl prefix:', dataUrl.slice(0, 50));
      setPendingPhotos((prev) => [...prev, { id, url: dataUrl }]);
    } else {
      console.log('[Setup Photos] picker cancelled or no assets returned');
    }
  }

  function removePhoto(photo: DisplayPhoto) {
    if (photo.pending) {
      setPendingPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } else {
      setRemovedIds((prev) => [...prev, photo.id]);
    }
  }

  // Validate + save each step
  async function handleContinue() {
    if (!business || !token || !currentStep || !flow) return;
    setError('');
    setBusy(true);
    const isFullDayCurrent = business.setup?.bookingMode === 'fullDay';
    try {
      switch (currentStep) {
        case 'photos': {
          console.log('[Setup Photos] handleContinue photos | pending:', pendingPhotos.length, '| removedIds:', removedIds.length);
          if (pendingPhotos.length > 0 || removedIds.length > 0) {
            console.log('[Setup Photos] calling syncBusinessSetupPhotos | businessId:', business.id);
            try {
              const updated = await syncBusinessSetupPhotos(token, business.id, {
                images:    pendingPhotos.map((p) => p.url),
                removeIds: removedIds,
              });
              console.log('[Setup Photos] syncBusinessSetupPhotos success | photos returned:', updated.setup?.photos?.length ?? 0);
              if (updated.setup) {
                setSavedPhotos(updated.setup.photos.map((p) => ({ id: p.id, url: p.url })));
                setPendingPhotos([]);
                setRemovedIds([]);
              } else {
                console.warn('[Setup Photos] syncBusinessSetupPhotos returned no setup object');
              }
            } catch (uploadErr: unknown) {
              console.error('[Setup Photos] syncBusinessSetupPhotos failed:', uploadErr);
              throw uploadErr;
            }
          } else {
            console.log('[Setup Photos] no changes — skipping upload');
          }
          break;
        }
        case 'hourly-slots': {
          if (openDays.length === 0) { setError('Select at least one open day.'); return; }
          await updateBusinessSetup(token, business.id, { weeklyHours, slotMinutes });
          break;
        }
        case 'full-day-days': {
          if (openDays.length === 0) { setError('Select at least one open day.'); return; }
          await updateBusinessSetup(token, business.id, { weeklyHours: applyFullDayHours(weeklyHours) });
          break;
        }
        case 'resources': {
          const label = flow.resourceLabel;
          // Rescue a filled-in-but-not-yet-"+ Add"ed row instead of failing
          // with a confusing "add at least one" error the vendor thinks they
          // already resolved.
          const draft = resourcesStepRef.current?.commitDraft() ?? { status: 'empty' as const };
          if (draft.status === 'invalid') {
            setError(`Check the ${label.toLowerCase().replace(/s$/, '')} you were adding — it has an invalid value.`);
            return;
          }
          const effectiveResources = draft.status === 'added'
            ? [...resources, { id: `local-${Date.now()}-draft`, ...draft.resource }]
            : resources;
          if (effectiveResources.length === 0) {
            setError(`Add at least one ${label.toLowerCase().replace(/s$/, '')}.`); return;
          }
          if (effectiveResources.some((r) => r.pricePerSlot == null || r.pricePerSlot < 0)) {
            setError('Each item needs a valid price.'); return;
          }
          await updateBusinessSetup(token, business.id, { resources: effectiveResources });
          break;
        }
        case 'rules': {
          const guests = maxGuests.trim() ? Math.round(Number(maxGuests)) : null;
          if (guests != null && (!Number.isFinite(guests) || guests < 1)) {
            setError('Enter a valid guest count or leave blank.'); return;
          }
          await updateBusinessSetup(token, business.id, {
            maxGuests: guests,
            venueRules: venueRules.trim(),
          });
          break;
        }
        case 'staff': {
          if (staffList.length === 0) {
            const noun = flow?.staffNoun?.toLowerCase().replace(/s$/, '') ?? 'team member';
            setError(`Add at least one ${noun}.`); return;
          }
          await updateBusinessSetup(token, business.id, { staff: staffList });
          break;
        }
        case 'services': {
          const noun = flow?.serviceNoun?.toLowerCase() ?? 'service';
          // Same rescue as the resources step — see ResourcesStepHandle comment.
          const draft = servicesStepRef.current?.commitDraft() ?? { status: 'empty' as const };
          if (draft.status === 'invalid') {
            setError(`Check the ${noun.replace(/s$/, '')} you were adding — it has an invalid value.`);
            return;
          }
          const effectiveServices = draft.status === 'added'
            ? [...servicesList, { id: `local-${Date.now()}-draft`, ...draft.service }]
            : servicesList;
          if (effectiveServices.length === 0) {
            setError(`Add at least one ${noun}.`); return;
          }
          await updateBusinessSetup(token, business.id, { services: effectiveServices, bufferMinutes });
          break;
        }
        case 'review': {
          const isServiceMode = flow?.isServiceMode ?? false;
          if (isServiceMode) {
            // Service mode — save staff + services + hours together
            await updateBusinessSetup(token, business.id, {
              staff:         staffList,
              services:      servicesList,
              bufferMinutes,
              weeklyHours,
            });
          } else {
            // Slot / full-day mode — save resources + hours + rules together
            const guests = maxGuests.trim() ? Math.round(Number(maxGuests)) : null;
            await updateBusinessSetup(token, business.id, {
              resources,
              weeklyHours: isFullDayCurrent ? applyFullDayHours(weeklyHours) : weeklyHours,
              slotMinutes,
              maxGuests:   guests,
              venueRules:  venueRules.trim(),
            });
          }
          if (pendingPhotos.length > 0 || removedIds.length > 0) {
            await syncBusinessSetupPhotos(token, business.id, {
              images:    pendingPhotos.map((p) => p.url),
              removeIds: removedIds,
            });
          }
          if (!editMode) {
            await completeBusinessSetup(token, business.id);
          }
          Alert.alert(
            editMode ? 'Changes Saved' : 'Business is Live! 🎉',
            editMode ? 'Your setup has been updated.' : 'Your business is now accepting bookings.',
            [{ text: 'OK', onPress: () => router.navigate('/(vendor)/businesses' as never) }],
          );
          return;
        }
      }
      // Advance
      setStepIndex((i) => i + 1);
      scrollTop();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <ScreenHeader title="Business Setup" onBack={() => router.navigate('/(vendor)/businesses' as never)} />
        <SetupSkeleton />
      </SafeAreaView>
    );
  }

  if (loadError || !business) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <ScreenHeader title="Business Setup" onBack={() => router.navigate('/(vendor)/businesses' as never)} />
        <View style={s.centered}>
          <View style={s.errorIconWrap}>
            <Ionicons name="cloud-offline-outline" size={36} color={Brand.creamMuted} />
          </View>
          <Text style={s.errorTitle}>Failed to load</Text>
          <Text style={s.errorSub}>{loadError || 'Business not found.'}</Text>
          <Pressable style={s.retryBtn} onPress={load}>
            <Ionicons name="refresh-outline" size={14} color="#fff" />
            <Text style={s.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Print-on-demand module — dedicated POD setup wizard
  if (business.module === 'print') {
    return <PodSetupFlow business={business} token={token!} editMode={editMode} />;
  }

  // Commerce module — shop details + product catalog wizard
  if (business.module === 'commerce') {
    return <CommerceSetupFlow business={business} token={token!} editMode={editMode} />;
  }

  // Creator module — bio/niche/social profile wizard
  if (business.module === 'creator') {
    return <CreatorSetupFlow business={business} token={token!} editMode={editMode} />;
  }

  if (!supportsSetup(business)) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <ScreenHeader title={business.name} onBack={() => router.navigate('/(vendor)/businesses' as never)} />
        <View style={s.centered}>
          <View style={s.comingSoonWrap}>
            <Ionicons name="construct-outline" size={36} color={Brand.creamMuted} />
          </View>
          <Text style={s.errorTitle}>Setup coming soon</Text>
          <Text style={s.errorSub}>
            Your profile is saved. Booking setup for {business.typeLabel} will be available soon.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Events module — event creation wizard (Phase 4)
  if (!supportsSlotSetup(business)) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <ScreenHeader title={business.name} onBack={() => router.navigate('/(vendor)/businesses' as never)} />
        <View style={s.centered}>
          <View style={s.comingSoonWrap}>
            <Ionicons name="calendar-outline" size={36} color={Brand.primary} />
          </View>
          <Text style={s.errorTitle}>Events — Coming Soon</Text>
          <Text style={s.errorSub}>
            Event creation on mobile is coming in the next update.{'\n'}
            Create and manage events at ruxstar.com for now.
          </Text>
          <Pressable style={s.retryBtn} onPress={() => router.navigate('/(vendor)/businesses' as never)}>
            <Ionicons name="arrow-back" size={14} color="#fff" />
            <Text style={s.retryBtnText}>Back to businesses</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isFullDay = business.setup?.bookingMode === 'fullDay';

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.iconBtn} onPress={goBack} disabled={busy} hitSlop={8}>
          <Ionicons name="arrow-back" size={18} color={Brand.cream} />
        </Pressable>
        <View style={s.headerCenter}>
          <View style={s.stepChip}>
            {currentStep && <Ionicons name={STEP_ICONS[currentStep]} size={11} color={Brand.primary} />}
            <Text style={s.stepChipText}>
              Step {stepIndex + 1} of {totalSteps} · {
                currentStep === 'resources' && flow
                  ? flow.resourceLabel
                  : currentStep ? STEP_LABELS[currentStep] : ''
              }
            </Text>
          </View>
          <Text style={s.headerTitle} numberOfLines={1}>{business.name}</Text>
          <Text style={s.headerSub} numberOfLines={1}>
            {business.typeLabel}
            {flow?.isServiceMode ? ' · Services' : isFullDay ? ' · Full-day' : ' · Hourly slots'}
          </Text>
        </View>
        <Pressable style={s.iconBtn} onPress={() => router.navigate('/(vendor)/businesses' as never)} disabled={busy} hitSlop={8}>
          <Ionicons name="close" size={18} color={Brand.creamSub} />
        </Pressable>
      </View>

      {/* Progress */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>

      {/* Error banner */}
      {error ? (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle" size={15} color={Brand.error} />
          <Text style={s.errorBannerText}>{error}</Text>
          <Pressable onPress={() => setError('')} hitSlop={8}>
            <Ionicons name="close-outline" size={16} color={Brand.creamMuted} />
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
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 'photos' && (
            <PhotosStep
              photos={displayPhotos}
              busy={busy}
              onAdd={addPhoto}
              onRemove={removePhoto}
            />
          )}

          {currentStep === 'hourly-slots' && (
            <HourlySlotsStep
              weeklyHours={weeklyHours}
              slotMinutes={slotMinutes}
              hideSlotLength={flow?.hideSlotLength ?? false}
              onToggleDay={toggleDay}
              onUniformHours={setUniformHours}
              onSlotMinutesChange={setSlotMinutes}
            />
          )}

          {currentStep === 'full-day-days' && (
            <FullDayDaysStep weeklyHours={weeklyHours} onToggleDay={toggleDay} />
          )}

          {currentStep === 'resources' && (
            <ResourcesStep
              ref={resourcesStepRef}
              typeId={business.typeId}
              bookingMode={isFullDay ? 'fullDay' : 'slots'}
              resourceLabel={flow?.resourceLabel}
              showHallFields={flow?.showHallFields ?? false}
              resources={resources}
              onAdd={addResource}
              onRemove={removeResource}
              onUpdate={updateResource}
            />
          )}

          {currentStep === 'rules' && (
            <RulesStep
              maxGuests={maxGuests}
              venueRules={venueRules}
              onMaxGuestsChange={setMaxGuests}
              onVenueRulesChange={setVenueRules}
            />
          )}

          {currentStep === 'staff' && (
            <StaffStep
              staffNoun={flow?.staffNoun}
              staffList={staffList}
              onAdd={addStaff}
              onRemove={removeStaff}
            />
          )}

          {currentStep === 'services' && (
            <ServicesStep
              ref={servicesStepRef}
              serviceNoun={flow?.serviceNoun}
              servicesList={servicesList}
              staffList={staffList}
              bufferMinutes={bufferMinutes}
              onAdd={addService}
              onRemove={removeService}
              onBufferChange={setBufferMinutes}
            />
          )}

          {currentStep === 'review' && (
            <ReviewStep
              business={business}
              flow={flow}
              resources={resources}
              weeklyHours={weeklyHours}
              slotMinutes={slotMinutes}
              maxGuests={maxGuests}
              venueRules={venueRules}
              photos={displayPhotos}
              staffList={staffList}
              servicesList={servicesList}
              editMode={editMode}
            />
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
              <Text style={s.continueBtnText}>Saving…</Text>
            </>
          ) : currentStep === 'review' ? (
            <>
              <Ionicons name="rocket-outline" size={18} color="#fff" />
              <Text style={s.continueBtnText}>{editMode ? 'Save Changes' : 'Go Live'}</Text>
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

// ─── Screen Header ────────────────────────────────────────────────────────────

function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={s.simpleHeader}>
      <Pressable style={s.iconBtn} onPress={onBack} hitSlop={8}>
        <Ionicons name="arrow-back" size={18} color={Brand.cream} />
      </Pressable>
      <Text style={s.simpleHeaderTitle}>{title}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const step = StyleSheet.create({
  wrap:         { gap: Spacing.three },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Brand.cream, letterSpacing: -0.1 },
  sectionSub:   { fontSize: 13, color: Brand.creamSub, lineHeight: 18, marginTop: -Spacing.two },
  fieldLabel:   { fontSize: 12, fontWeight: '600', color: Brand.creamSub, letterSpacing: 0.1 },

  input:      { fontSize: 14 },
  priceRow:   { flexDirection: 'row', alignItems: 'center' },
  rupee:      { fontSize: 15, color: Brand.creamSub, marginRight: 4, paddingBottom: 2 },
  addForm:    { gap: Spacing.two, padding: Spacing.three, backgroundColor: Brand.surface1, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border1 },
  addBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: Spacing.three, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1, borderColor: Brand.primary },
  addBtnText: { fontSize: 13, fontWeight: '700', color: Brand.primary },
  inlineErr:  { fontSize: 12, color: Brand.error },

  resourceList:   { backgroundColor: Brand.surface1, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border1, overflow: 'hidden' },
  resourceItem:   { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.three },
  resourceBorder: { borderBottomWidth: 1, borderBottomColor: Brand.border1 },
  removeBtn:      { width: 32, height: 32, borderRadius: Radius.md, backgroundColor: 'rgba(220,38,38,0.06)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },

  emptyHint:     { alignItems: 'center', paddingVertical: Spacing.four, gap: Spacing.two },
  emptyHintText: { fontSize: 13, color: Brand.creamMuted, textAlign: 'center' },

  // Hours
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  timeSep: { fontSize: 12, color: Brand.creamSub },
  dayRow:  { flexDirection: 'row', gap: Spacing.one + 2 },
  dayBtn:  { flex: 1, alignItems: 'center', paddingVertical: Spacing.two + 2, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Brand.border1, backgroundColor: Brand.surface1 },
  dayBtnActive:     { backgroundColor: Brand.primary, borderColor: Brand.primary },
  dayBtnText:       { fontSize: 11, fontWeight: '700', color: Brand.creamMuted },
  dayBtnTextActive: { color: '#fff' },
  dayHint:          { fontSize: 12, color: Brand.creamSub, textAlign: 'center' },

  // Slot pills
  pill:         { paddingHorizontal: Spacing.three, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1, borderColor: Brand.border1, backgroundColor: Brand.surface1 },
  pillActive:   { backgroundColor: Brand.primary, borderColor: Brand.primary },
  pillText:     { fontSize: 13, fontWeight: '600', color: Brand.creamSub },
  pillTextActive: { color: '#fff' },

  // Rules
  charCount: { fontSize: 11, color: Brand.creamMuted, textAlign: 'right' },

  // Staff / Services
  staffName:         { fontSize: 14, fontWeight: '600', color: Brand.cream },
  staffRole:         { fontSize: 12, color: Brand.creamSub },
  staffChips:        { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2 },
  staffChip:         { paddingHorizontal: Spacing.two + 2, paddingVertical: 6, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Brand.border1, backgroundColor: Brand.surface1 },
  staffChipActive:   { backgroundColor: Brand.primaryGlow, borderColor: Brand.primary },
  staffChipText:     { fontSize: 12, fontWeight: '600', color: Brand.creamSub },
  staffChipTextActive: { color: Brand.primary },

  // Photos
  photoGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  photoCell:      { width: '30%', aspectRatio: 4 / 3, borderRadius: Radius.md, overflow: 'hidden', position: 'relative' },
  photoImg:       { width: '100%', height: '100%' },
  photoPendingDot: { position: 'absolute', top: 5, left: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.warning, borderWidth: 1, borderColor: '#fff' },
  photoRemoveBtn:  { position: 'absolute', top: 4, right: 4 },
  photoAdd:       { width: '30%', aspectRatio: 4 / 3, borderRadius: Radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Brand.border2, backgroundColor: Brand.surface1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoAddText:   { fontSize: 11, color: Brand.creamMuted, fontWeight: '500' },
  photoNote:      { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Brand.primaryGlow, borderRadius: Radius.md, padding: Spacing.two + 2, borderWidth: 1, borderColor: 'rgba(124,58,237,0.12)' },
  photoNoteText:  { fontSize: 11, color: Brand.creamSub, flex: 1, lineHeight: 17 },
});

const pod = StyleSheet.create({
  hintText: { fontSize: 12, color: Brand.creamSub, lineHeight: 17 },

  // Category grid
  categoryGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2 },
  categoryChip:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.two + 2, paddingVertical: Spacing.two + 2, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Brand.border1, backgroundColor: Brand.surface1, minWidth: '47%', flex: 1 },
  categoryChipSelected:  { borderColor: Brand.primary, backgroundColor: Brand.primaryGlow },
  categoryIcon:          { fontSize: 18 },
  categoryLabel:         { flex: 1, fontSize: 13, fontWeight: '500', color: Brand.creamSub },
  categoryLabelSelected: { color: Brand.cream, fontWeight: '700' },

  // Toggle switch
  toggleRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: Brand.surface1, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border1, padding: Spacing.three },
  toggleLabel:       { fontSize: 14, fontWeight: '600', color: Brand.cream },
  toggleSub:         { fontSize: 11, color: Brand.creamSub, marginTop: 2 },
  toggle:            { width: 44, height: 24, borderRadius: 12, backgroundColor: Brand.border2, padding: 2 },
  toggleActive:      { backgroundColor: Brand.primary },
  toggleThumb:       { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbActive: { transform: [{ translateX: 20 }] },

  // City input
  cityInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cityAddBtn:   { paddingHorizontal: Spacing.three, paddingVertical: 11, borderRadius: Radius.md, backgroundColor: Brand.surface1, borderWidth: 1, borderColor: Brand.border1 },
  cityAddText:  { fontSize: 13, fontWeight: '700', color: Brand.primary },
  cityChips:    { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2 },
  cityChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.two + 2, paddingVertical: 7, borderRadius: Radius.pill, backgroundColor: Brand.primaryGlow, borderWidth: 1, borderColor: 'rgba(124,58,237,0.20)' },
  cityChipText: { fontSize: 12, fontWeight: '600', color: Brand.primary },

  fieldGroup: { gap: Spacing.one + 2 },

  // Per-category pricing card
  pricingCard:    { backgroundColor: Brand.surface1, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border1, overflow: 'hidden' },
  pricingHeader:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderBottomWidth: 1, borderBottomColor: Brand.border1 },
  pricingIcon:    { fontSize: 22 },
  pricingName:    { fontSize: 14, fontWeight: '700', color: Brand.cream },
  pricingModel:   { fontSize: 11, color: Brand.creamMuted, marginTop: 1 },
  offeredBadge:       { paddingHorizontal: Spacing.two + 2, paddingVertical: 5, borderRadius: Radius.pill, borderWidth: 1, borderColor: Brand.border2, backgroundColor: Brand.surface2 },
  offeredBadgeActive: { borderColor: `${Brand.primary}50`, backgroundColor: Brand.primaryGlow },
  offeredText:        { fontSize: 11, fontWeight: '700', color: Brand.creamMuted },
  offeredTextActive:  { color: Brand.primary },
  pricingFields:  { padding: Spacing.three, gap: Spacing.two + 2 },
  pricingRow:     { gap: 4 },
  pricingTwoCol:  { flexDirection: 'row', gap: Spacing.two },
  fromPrice:      { fontSize: 12, fontWeight: '600', color: Brand.primary },
  fromPriceMuted: { fontSize: 12, color: Brand.creamMuted },
});

const review = StyleSheet.create({
  card:        { backgroundColor: Brand.surface1, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border1, padding: Spacing.three, gap: Spacing.two },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardTitle:   { fontSize: 11, fontWeight: '700', color: Brand.creamSub, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue:   { fontSize: 14, color: Brand.cream, fontWeight: '600' },
  cardSub:     { fontSize: 12, color: Brand.creamSub },
  warn:        { fontSize: 12, color: Brand.warning },
  dayChips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dayChip:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, backgroundColor: Brand.primaryGlow, borderWidth: 1, borderColor: 'rgba(124,58,237,0.20)' },
  dayChipText: { fontSize: 10, fontWeight: '700', color: Brand.primary },
  resourceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resourceName:  { fontSize: 13, color: Brand.cream, fontWeight: '500' },
  resourcePrice: { fontSize: 12, color: Brand.creamSub },
  ruleText:    { fontSize: 12, color: Brand.creamSub, lineHeight: 17 },
  photoRow:    { flexDirection: 'row', gap: Spacing.one + 2 },
  photoThumb:  { width: 52, height: 40, borderRadius: Radius.sm, borderWidth: 1, borderColor: Brand.border1 },
  surgeNote:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Brand.primaryGlow, borderRadius: Radius.md, padding: Spacing.two + 2, borderWidth: 1, borderColor: 'rgba(124,58,237,0.12)' },
  surgeNoteText: { fontSize: 11, color: Brand.creamSub, flex: 1, lineHeight: 16 },
});

const sk = StyleSheet.create({
  wrap: { padding: Spacing.four, gap: Spacing.three },
  bone: { backgroundColor: Brand.surface2, borderRadius: Radius.md },
});

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: Brand.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },

  // Header
  header:       { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.three, borderBottomWidth: 1, borderBottomColor: Brand.border1, gap: Spacing.two },
  headerCenter: { flex: 1, gap: 3 },
  stepChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: Brand.primaryGlow, borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: 4 },
  stepChipText: { fontSize: 11, fontWeight: '700', color: Brand.primary },
  headerTitle:  { fontSize: 16, fontWeight: '800', color: Brand.cream, letterSpacing: -0.2 },
  headerSub:    { fontSize: 12, color: Brand.creamSub },
  iconBtn:      { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Brand.surface1, borderWidth: 1, borderColor: Brand.border1, alignItems: 'center', justifyContent: 'center', marginTop: 2 },

  simpleHeader:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: Spacing.two, borderBottomWidth: 1, borderBottomColor: Brand.border1 },
  simpleHeaderTitle: { fontSize: 16, fontWeight: '700', color: Brand.cream, flex: 1 },

  // Progress
  progressTrack: { height: 3, backgroundColor: Brand.surface2 },
  progressFill:  { height: 3, backgroundColor: Brand.primary },
  // Error banner
  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: 'rgba(220,38,38,0.06)', borderBottomWidth: 1, borderBottomColor: 'rgba(220,38,38,0.15)', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  errorBannerText: { flex: 1, fontSize: 12, color: Brand.error, lineHeight: 17 },

  // Scroll
  scrollContent: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },

  // Footer
  footer:          { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderTopWidth: 1, borderTopColor: Brand.border1, backgroundColor: Brand.bg },
  continueBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Brand.primary, borderRadius: Radius.lg, paddingVertical: 16, shadowColor: Brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  continueBtnDisabled: { opacity: 0.6 },
  continueBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },

  // Error/empty states
  errorIconWrap:  { width: 72, height: 72, borderRadius: Radius.xl, backgroundColor: Brand.surface1, alignItems: 'center', justifyContent: 'center' },
  comingSoonWrap: { width: 72, height: 72, borderRadius: Radius.xl, backgroundColor: Brand.surface1, alignItems: 'center', justifyContent: 'center' },
  errorTitle:     { fontSize: 17, fontWeight: '700', color: Brand.cream },
  errorSub:       { fontSize: 13, color: Brand.creamSub, textAlign: 'center', lineHeight: 19 },
  retryBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Brand.primary, borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, marginTop: Spacing.one },
  retryBtnText:   { color: '#fff', fontWeight: '700', fontSize: 13 },
});
