/**
 * Customer Booking Screen
 * Route: /(user)/book?businessId=<id>
 *
 * UX flow:
 *   Select slot → footer summary → "Confirm" → confirmation sheet
 *   → "Pay / Confirm" → API call → Cashfree native payment sheet
 *
 * Sprint 3: fully theme-aware (dark/light), price breakdown in confirm sheet,
 *           optional guest-count input when venue has maxGuests set.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useCashfreePayment } from '@/utils/cashfree-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/auth-store';
import {
  getPublicBusiness,
  getPublicSlots,
  initiateCustomerBooking,
  businessEmoji,
  type PublicBusiness,
  type PublicSlot,
} from '@/services/booking-service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayLocal(): string {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function fmt12(hhmm: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const sfx = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${sfx}`;
}

function fmtDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
}

function fmtDateShort(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

type Service = NonNullable<PublicBusiness['services']>[number];
type Staff   = NonNullable<PublicBusiness['staff']>[number];

const SLIDE_W = Dimensions.get('window').width;

// ─── TopBar ───────────────────────────────────────────────────────────────────

function TopBar({ title }: { title: string }) {
  const { brand } = useTheme();
  return (
    <View style={[tb.bar, { borderBottomColor: brand.border1, backgroundColor: brand.bg }]}>
      <Pressable onPress={() => router.back()} hitSlop={8} style={[tb.backBtn, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
        <Ionicons name="chevron-back" size={20} color={brand.cream} />
      </Pressable>
      <Text style={[tb.title, { color: brand.cream }]} numberOfLines={1}>{title}</Text>
      <View style={{ width: 36 }} />
    </View>
  );
}

const tb = StyleSheet.create({
  bar:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title:   { flex: 1, fontSize: 15, fontWeight: '700', textAlign: 'center' },
});

// ─── Photo Carousel ───────────────────────────────────────────────────────────

function SlideItem({ url, fallbackEmoji }: { url: string; fallbackEmoji: string }) {
  const { brand } = useTheme();
  const [imgErr, setImgErr] = useState(false);
  return (
    <View style={[ph.slide, { backgroundColor: brand.surface1 }]}>
      {url && !imgErr ? (
        <Image source={{ uri: url }} style={ph.img} resizeMode="cover" onError={() => setImgErr(true)} />
      ) : (
        <View style={[ph.fallback, { backgroundColor: brand.primaryGlow }]}>
          <Text style={ph.emoji}>{fallbackEmoji}</Text>
        </View>
      )}
    </View>
  );
}

function PhotoCarousel({ urls, fallbackEmoji }: { urls: string[]; fallbackEmoji: string }) {
  const { brand } = useTheme();
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<FlatList>(null);

  if (urls.length === 0) {
    return (
      <View style={[ph.wrap, { backgroundColor: brand.surface1 }]}>
        <View style={[ph.fallback, { backgroundColor: brand.primaryGlow }]}>
          <Text style={ph.emoji}>{fallbackEmoji}</Text>
        </View>
      </View>
    );
  }

  const goTo = (idx: number) => {
    const next = Math.max(0, Math.min(idx, urls.length - 1));
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setActiveIdx(next);
  };

  return (
    <View style={[ph.wrap, { backgroundColor: brand.surface1 }]}>
      <FlatList
        ref={listRef}
        data={urls}
        keyExtractor={(item, i) => `${item}-${i}`}
        horizontal pagingEnabled showsHorizontalScrollIndicator={false} bounces={false}
        getItemLayout={(_, index) => ({ length: SLIDE_W, offset: SLIDE_W * index, index })}
        onViewableItemsChanged={({ viewableItems }) => {
          if (viewableItems.length > 0 && viewableItems[0].index != null) setActiveIdx(viewableItems[0].index);
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item }) => <SlideItem url={item} fallbackEmoji={fallbackEmoji} />}
      />
      {urls.length > 1 && (
        <>
          <Pressable style={[ph.arrow, ph.arrowL, activeIdx === 0 && ph.arrowHidden]} hitSlop={12} onPress={() => goTo(activeIdx - 1)}>
            <Ionicons name="chevron-back" size={18} color="#fff" />
          </Pressable>
          <Pressable style={[ph.arrow, ph.arrowR, activeIdx === urls.length - 1 && ph.arrowHidden]} hitSlop={12} onPress={() => goTo(activeIdx + 1)}>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </Pressable>
          <View style={ph.dots}>
            {urls.map((_, i) => (
              <View key={i} style={[ph.dot, i === activeIdx && ph.dotActive]} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const ph = StyleSheet.create({
  wrap:        { height: 220, position: 'relative', overflow: 'hidden' },
  slide:       { width: SLIDE_W, height: 220 },
  img:         { width: '100%', height: '100%' },
  fallback:    { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  emoji:       { fontSize: 64 },
  arrow:       { position: 'absolute', top: '50%', marginTop: -18, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.38)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  arrowL:      { left: 10 },
  arrowR:      { right: 10 },
  arrowHidden: { opacity: 0 },
  dots:        { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5, zIndex: 10 },
  dot:         { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive:   { backgroundColor: '#fff', width: 14 },
});

// ─── Service Row ──────────────────────────────────────────────────────────────

function ServiceRow({ svc, selected, onToggle }: { svc: Service; selected: boolean; onToggle: () => void }) {
  const { brand } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14, borderWidth: 1, gap: 8,
          borderColor: selected ? brand.primary : brand.border1,
          backgroundColor: selected ? brand.primaryGlow : brand.bg,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      onPress={onToggle}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: selected ? brand.primary : brand.cream }}>{svc.name}</Text>
        {svc.durationMinutes > 0 ? <Text style={{ fontSize: 11, color: brand.creamMuted }}>{svc.durationMinutes} min</Text> : null}
      </View>
      {selected && <Ionicons name="checkmark-circle" size={18} color={brand.primary} style={{ marginRight: 6 }} />}
      <Text style={{ fontSize: 14, fontWeight: '700', color: selected ? brand.primary : brand.creamSub }}>
        {svc.price > 0 ? `₹${svc.price.toLocaleString('en-IN')}` : 'Free'}
      </Text>
    </Pressable>
  );
}

// ─── Date Strip ───────────────────────────────────────────────────────────────

function DateStrip({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const { brand } = useTheme();
  const today = todayLocal();
  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 2 }}>
      {dates.map((d) => {
        const dt  = new Date(`${d}T00:00:00`);
        const sel = d === selected;
        const isT = d === today;
        const day = isT ? 'Today' : dt.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3);
        return (
          <Pressable
            key={d}
            style={({ pressed }) => ({
              alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9, borderRadius: 12,
              borderWidth: 1, minWidth: 48,
              borderColor: sel ? brand.primary : brand.border1,
              backgroundColor: sel ? brand.primary : pressed ? brand.surface2 : brand.bg,
            })}
            onPress={() => onSelect(d)}
          >
            <Text style={{ fontSize: 9, fontWeight: '600', color: sel ? 'rgba(255,255,255,0.75)' : brand.creamMuted }}>{day}</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', marginTop: 1, color: sel ? '#fff' : brand.cream }}>{String(dt.getDate())}</Text>
            {!isT && <Text style={{ fontSize: 9, marginTop: 1, color: sel ? 'rgba(255,255,255,0.65)' : brand.creamMuted }}>{dt.toLocaleDateString('en-IN', { month: 'short' }).slice(0, 3)}</Text>}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Slot Chip ────────────────────────────────────────────────────────────────

function SlotChip({ slot, selected, onPress }: { slot: PublicSlot; selected: boolean; onPress: () => void }) {
  const { brand } = useTheme();
  const avail = slot.status === 'available';
  return (
    <Pressable
      style={({ pressed }) => ({
        width: '30.5%', paddingVertical: 11, paddingHorizontal: 4, borderRadius: 12,
        borderWidth: 1, alignItems: 'center', gap: 3,
        borderColor: selected ? brand.primary : brand.border1,
        backgroundColor: selected ? brand.primary : avail ? brand.bg : brand.surface2,
        opacity: !avail ? 0.45 : pressed && avail && !selected ? 0.75 : 1,
      })}
      onPress={avail ? onPress : undefined}
      disabled={!avail}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: selected ? 'rgba(255,255,255,0.8)' : avail ? brand.success : brand.creamMuted }} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: selected ? '#fff' : avail ? brand.cream : brand.creamMuted }}>{fmt12(slot.startTime)}</Text>
      {slot.pricePerSlot > 0 && (
        <Text style={{ fontSize: 10, color: selected ? 'rgba(255,255,255,0.8)' : brand.creamSub }}>₹{slot.pricePerSlot.toLocaleString('en-IN')}</Text>
      )}
      {!avail && <Text style={{ fontSize: 9, color: brand.creamMuted, fontWeight: '500' }}>Booked</Text>}
    </Pressable>
  );
}

// ─── Price Breakdown ──────────────────────────────────────────────────────────

function PriceBreakdown({ price, brand }: { price: number; brand: ReturnType<typeof useTheme>['brand'] }) {
  if (price <= 0) {
    return (
      <View style={[pbd.box, { backgroundColor: 'rgba(22,163,74,0.06)', borderColor: 'rgba(22,163,74,0.20)' }]}>
        <Text style={[pbd.freeNote, { color: brand.success }]}>No payment required — pay at venue</Text>
      </View>
    );
  }
  return (
    <View style={[pbd.box, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
      <Text style={[pbd.heading, { color: brand.creamSub }]}>Price Breakdown</Text>
      <View style={pbd.row}>
        <Text style={[pbd.label, { color: brand.creamSub }]}>Booking amount</Text>
        <Text style={[pbd.val, { color: brand.cream }]}>₹{price.toLocaleString('en-IN')}</Text>
      </View>
      <View style={[pbd.divider, { backgroundColor: brand.border1 }]} />
      <View style={pbd.row}>
        <Text style={[pbd.totalLabel, { color: brand.cream }]}>Total</Text>
        <Text style={[pbd.totalVal, { color: brand.primary }]}>₹{price.toLocaleString('en-IN')}</Text>
      </View>
      <Text style={[pbd.note, { color: brand.creamMuted }]}>Inclusive of all applicable taxes</Text>
    </View>
  );
}

const pbd = StyleSheet.create({
  box:       { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  heading:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:     { fontSize: 13 },
  val:       { fontSize: 13, fontWeight: '600' },
  divider:   { height: 1, marginVertical: 4 },
  totalLabel:{ fontSize: 14, fontWeight: '700' },
  totalVal:  { fontSize: 18, fontWeight: '800' },
  note:      { fontSize: 11, marginTop: 2 },
  freeNote:  { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});

// ─── Confirm Sheet ────────────────────────────────────────────────────────────

function ConfirmSheet({
  visible, biz, selSlots, selDate, isFullDay, isServiceBiz, selServiceIds, guestCount, onClose, onConfirm,
}: {
  visible: boolean; biz: PublicBusiness; selSlots: PublicSlot[]; selDate: string;
  isFullDay: boolean; isServiceBiz: boolean; selServiceIds: string[]; guestCount: string;
  onClose: () => void; onConfirm: () => void;
}) {
  const { brand } = useTheme();
  const insets    = useSafeAreaInsets();
  const selSlot   = selSlots[0] ?? null;
  if (!selSlot) return null;

  const price        = selSlots.reduce((sum, s) => sum + s.pricePerSlot, 0);
  const serviceNames = selServiceIds.map((id) => biz.services?.find((s) => s.id === id)?.name).filter(Boolean).join(', ');
  const timeLabel    = isFullDay
    ? `Full Day · ${fmtDateShort(selDate)}`
    : selSlots.length > 1
      ? `${selSlots.length} slots · ${fmt12(selSlots[0].startTime)} – ${fmt12(selSlots[selSlots.length - 1].startTime)}`
      : `${fmt12(selSlot.startTime)}${selSlot.endTime ? ` – ${fmt12(selSlot.endTime)}` : ''}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={conf.overlay} onPress={onClose}>
        <Pressable style={[conf.sheet, { backgroundColor: brand.bg, paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
          <View style={[conf.handle, { backgroundColor: brand.border2 }]} />
          <Text style={[conf.title, { color: brand.cream }]}>Confirm your booking</Text>
          <Text style={[conf.subtitle, { color: brand.creamSub }]}>{biz.name}</Text>

          {/* Detail rows */}
          <View style={[conf.details, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
            <View style={conf.detailRow}>
              <View style={[conf.detailIcon, { backgroundColor: brand.primaryGlow }]}>
                <Ionicons name="calendar-outline" size={16} color={brand.primary} />
              </View>
              <Text style={[conf.detailText, { color: brand.cream }]}>{fmtDateLabel(selDate)}</Text>
            </View>
            <View style={conf.detailRow}>
              <View style={[conf.detailIcon, { backgroundColor: brand.primaryGlow }]}>
                <Ionicons name="time-outline" size={16} color={brand.primary} />
              </View>
              <Text style={[conf.detailText, { color: brand.cream }]}>{timeLabel}</Text>
            </View>
            {isServiceBiz && serviceNames ? (
              <View style={conf.detailRow}>
                <View style={[conf.detailIcon, { backgroundColor: brand.primaryGlow }]}>
                  <Ionicons name="cut-outline" size={16} color={brand.primary} />
                </View>
                <Text style={[conf.detailText, { color: brand.cream }]} numberOfLines={2}>{serviceNames}</Text>
              </View>
            ) : null}
            {selSlot.resourceName ? (
              <View style={conf.detailRow}>
                <View style={[conf.detailIcon, { backgroundColor: brand.primaryGlow }]}>
                  <Ionicons name="location-outline" size={16} color={brand.primary} />
                </View>
                <Text style={[conf.detailText, { color: brand.cream }]}>{selSlot.resourceName}</Text>
              </View>
            ) : null}
            {guestCount ? (
              <View style={conf.detailRow}>
                <View style={[conf.detailIcon, { backgroundColor: brand.primaryGlow }]}>
                  <Ionicons name="people-outline" size={16} color={brand.primary} />
                </View>
                <Text style={[conf.detailText, { color: brand.cream }]}>{guestCount} guests</Text>
              </View>
            ) : null}
          </View>

          {/* Price breakdown */}
          <PriceBreakdown price={price} brand={brand} />

          {/* Buttons */}
          <View style={[conf.btns, { marginTop: Spacing.three }]}>
            <Pressable
              style={({ pressed }) => [conf.cancelBtn, { backgroundColor: brand.surface1, borderColor: brand.border2, opacity: pressed ? 0.7 : 1 }]}
              onPress={onClose}
            >
              <Text style={[conf.cancelText, { color: brand.creamSub }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [conf.confirmBtn, { backgroundColor: brand.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={onConfirm}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={conf.confirmText}>
                {price > 0 ? `Pay ₹${price.toLocaleString('en-IN')}` : 'Confirm Booking'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const conf = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 14, gap: 0 },
  handle:      { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  title:       { fontSize: 18, fontWeight: '800', letterSpacing: -0.4, marginBottom: 2 },
  subtitle:    { fontSize: 13, marginBottom: 16 },
  details:     { gap: 12, borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 14 },
  detailRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailIcon:  { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detailText:  { fontSize: 14, flex: 1, fontWeight: '500' },
  btns:        { flexDirection: 'row', gap: 10 },
  cancelBtn:   { flex: 1, paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1 },
  cancelText:  { fontSize: 14, fontWeight: '700' },
  confirmBtn:  { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, borderRadius: Radius.md },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BookScreen() {
  const { brand } = useTheme();
  const insets    = useSafeAreaInsets();
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const token = useAuthStore((s) => s.token);

  const [biz,        setBiz]        = useState<PublicBusiness | null>(null);
  const [bizLoading, setBizLoading] = useState(true);
  const [bizError,   setBizError]   = useState('');
  const [selServiceIds, setSelServiceIds] = useState<string[]>([]);
  const [selStaffId,    setSelStaffId]    = useState('');
  const [selDate,   setSelDate]   = useState(todayLocal());
  const [resources, setResources] = useState<{ id: string; name: string; pricePerSlot: number }[]>([]);
  const [selRes,    setSelRes]    = useState('');
  const [slots,     setSlots]     = useState<PublicSlot[]>([]);
  const [slotsLoad, setSlotsLoad] = useState(false);
  const [slotsErr,  setSlotsErr]  = useState('');
  // Multiple slots can be picked at once (hourly grid only — see slotKey/toggleSlot).
  // fullDay and services bookings still behave as single-select.
  const [selSlots,  setSelSlots]  = useState<PublicSlot[]>([]);
  const [bookMode,  setBookMode]  = useState<'slots' | 'fullDay' | 'services'>('slots');
  const [showConfirm, setShowConfirm] = useState(false);
  const [guestCount,  setGuestCount]  = useState('');
  const [bookingProgress, setBookingProgress] = useState<{ done: number; total: number } | null>(null);

  // Bridges the callback-based native payment SDK to a promise so multiple
  // selected slots can be booked & paid for one at a time, in sequence.
  const paymentWaiterRef = useRef<{ resolve: () => void; reject: (msg: string) => void } | null>(null);

  const { startPayment, paying } = useCashfreePayment({
    onSuccess: () => { paymentWaiterRef.current?.resolve(); paymentWaiterRef.current = null; },
    onError:   (msg) => { paymentWaiterRef.current?.reject(msg); paymentWaiterRef.current = null; },
  });

  function payAndWait(args: Parameters<typeof startPayment>[0]): Promise<void> {
    return new Promise((resolve, reject) => {
      paymentWaiterRef.current = { resolve, reject };
      startPayment(args);
    });
  }

  function slotKey(slot: PublicSlot): string {
    return `${slot.resourceId ?? ''}__${slot.startAt}`;
  }

  function toggleSlot(slot: PublicSlot) {
    // fullDay / services bookings are still single-select — one appointment/day at a time.
    if (bookMode !== 'slots') { setSelSlots([slot]); return; }
    setSelSlots((prev) => {
      const key = slotKey(slot);
      const exists = prev.some((s) => slotKey(s) === key);
      if (exists) return prev.filter((s) => slotKey(s) !== key);
      return [...prev, slot].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
  }

  // ── Load business ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!businessId) return;
    setBiz(null); setBizLoading(true); setBizError('');
    setSelServiceIds([]); setSelStaffId('');
    setSelDate(todayLocal()); setResources([]); setSelRes('');
    setSlots([]); setSlotsLoad(false); setSlotsErr('');
    setSelSlots([]); setBookMode('slots'); setGuestCount('');

    getPublicBusiness(businessId)
      .then((b) => setBiz(b))
      .catch((e: unknown) => setBizError(e instanceof Error ? e.message : 'Failed to load.'))
      .finally(() => setBizLoading(false));
  }, [businessId]);

  const isServiceBiz = biz?.bookingMode === 'services';
  const isFullDay    = bookMode === 'fullDay';

  const eligibleStaff = useMemo((): Staff[] => {
    if (!biz?.staff?.length) return [];
    if (!isServiceBiz || selServiceIds.length === 0) return biz.staff;
    return biz.staff.filter((p) =>
      selServiceIds.every((sid) => {
        const svc = biz.services?.find((s) => s.id === sid);
        return !svc?.staffIds?.length || svc.staffIds.includes(p.id);
      }),
    );
  }, [biz, isServiceBiz, selServiceIds]);

  // ── Load slots ─────────────────────────────────────────────────────────────
  const loadSlots = useCallback(async () => {
    if (!businessId || !selDate) return;
    if (isServiceBiz && selServiceIds.length === 0) { setSlots([]); return; }
    setSlotsLoad(true); setSlotsErr(''); setSelSlots([]);
    try {
      const resp = await getPublicSlots(businessId, selDate, selRes || undefined,
        isServiceBiz ? { serviceIds: selServiceIds, staffId: selStaffId || undefined } : undefined);
      setSlots(resp.slots);
      setBookMode(resp.bookingMode ?? 'slots');
      if (resp.resources.length > 0) {
        setResources(resp.resources);
        if (!selRes) setSelRes(resp.resources[0].id);
      }
    } catch (e: unknown) {
      setSlotsErr(e instanceof Error ? e.message : 'Could not load slots.');
    } finally {
      setSlotsLoad(false);
    }
  }, [businessId, selDate, selRes, isServiceBiz, selServiceIds, selStaffId]);

  useEffect(() => { void loadSlots(); }, [loadSlots]);

  const visible = useMemo(() => {
    const res = selRes || (resources[0]?.id ?? '');
    return slots.filter((s) => s.date === selDate && (!res || s.resourceId === res)).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [slots, selDate, selRes, resources]);

  // ── Book ───────────────────────────────────────────────────────────────────
  // Each slot is its own booking + (if paid) its own payment session — the
  // backend has no "book N slots in one order" endpoint, so multi-slot
  // selection books them one at a time, waiting for each payment to finish
  // before starting the next. Stops immediately on failure so the vendor and
  // customer both see exactly which slots are actually booked.
  async function handleBook() {
    if (selSlots.length === 0 || !businessId || !token) return;

    let confirmedCount = 0;
    let lastResult: Awaited<ReturnType<typeof initiateCustomerBooking>> | null = null;
    setBookingProgress(selSlots.length > 1 ? { done: 0, total: selSlots.length } : null);

    try {
      for (const slot of selSlots) {
        const result = await initiateCustomerBooking(token, {
          businessId, startAt: slot.startAt, resourceId: slot.resourceId || undefined,
          serviceIds: isServiceBiz && selServiceIds.length ? selServiceIds : undefined,
          staffId:    isServiceBiz && selStaffId ? selStaffId : undefined,
        });
        if (result.paymentSessionId) {
          await payAndWait({ paymentSessionId: result.paymentSessionId, orderId: result.orderId, bookingId: result.bookingId, mode: result.mode });
        }
        lastResult = result;
        confirmedCount++;
        setBookingProgress((p) => p ? { ...p, done: confirmedCount } : null);
      }

      if (!lastResult) return;
      if (selSlots.length > 1) {
        Alert.alert(
          'Booking Confirmed!',
          `All ${confirmedCount} slots are booked.`,
          [{ text: 'View Bookings', onPress: () => router.replace('/(user)/orders' as never) }],
        );
      } else if (lastResult.paymentSessionId) {
        router.replace({ pathname: '/(user)/payment-status', params: { bookingId: lastResult.bookingId, kind: 'booking' } } as never);
      } else {
        Alert.alert(
          lastResult.status === 'confirmed' ? 'Booking Confirmed!' : 'Booking Received!',
          lastResult.status === 'confirmed'
            ? `Your slot is confirmed!\nID: ${lastResult.bookingId.slice(-6).toUpperCase()}`
            : `Booking received. Amount: ₹${lastResult.amount.toLocaleString('en-IN')} — pay at venue.\nID: ${lastResult.bookingId.slice(-6).toUpperCase()}`,
          [{ text: 'View Bookings', onPress: () => router.replace('/(user)/orders' as never) }],
        );
      }
      setSelSlots([]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Please try again.';
      Alert.alert(
        'Booking Failed',
        confirmedCount > 0
          ? `${confirmedCount} of ${selSlots.length} slots were booked before this failed: ${msg}`
          : msg,
        confirmedCount > 0
          ? [{ text: 'View Bookings', onPress: () => router.replace('/(user)/orders' as never) }]
          : undefined,
      );
    } finally {
      setBookingProgress(null);
    }
  }

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (bizLoading) {
    return (
      <SafeAreaView style={[g.screen, { backgroundColor: brand.bg }]} edges={['top']}>
        <TopBar title="Book" />
        <View style={g.center}><ActivityIndicator size="large" color={brand.primary} /></View>
      </SafeAreaView>
    );
  }

  if (bizError || !biz) {
    return (
      <SafeAreaView style={[g.screen, { backgroundColor: brand.bg }]} edges={['top']}>
        <TopBar title="Book" />
        <View style={g.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={brand.creamMuted} />
          <Text style={[g.errText, { color: brand.error }]}>{bizError || 'Business not found.'}</Text>
          <Pressable style={[g.retryBtn, { backgroundColor: brand.primary }]} onPress={() => router.back()}>
            <Text style={g.retryBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const photoUrls  = [...(biz.photos ?? []), ...(biz.coverUrl ? [biz.coverUrl] : [])].filter((v, i, a) => v && a.indexOf(v) === i);
  const emoji      = businessEmoji(biz);
  const totalPrice = selSlots.reduce((sum, s) => sum + s.pricePerSlot, 0);
  const canBook    = selSlots.length > 0 && !paying;
  const btnLabel   = paying
    ? (bookingProgress ? `Booking ${bookingProgress.done + 1} of ${bookingProgress.total}…` : 'Processing…')
    : isServiceBiz ? 'Book Appointment'
    : isFullDay    ? 'Book Full Day'
    : selSlots.length > 1 ? `Book ${selSlots.length} Slots`
    : 'Book This Slot';

  return (
    <SafeAreaView style={[g.screen, { backgroundColor: brand.bg }]} edges={['top', 'bottom']}>
      <TopBar title={biz.name} />

      <ConfirmSheet
        visible={showConfirm} biz={biz} selSlots={selSlots} selDate={selDate}
        isFullDay={isFullDay} isServiceBiz={isServiceBiz} selServiceIds={selServiceIds}
        guestCount={guestCount}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => { setShowConfirm(false); void handleBook(); }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={g.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <PhotoCarousel urls={photoUrls} fallbackEmoji={emoji} />

          {/* Business info */}
          <View style={g.infoBlock}>
            {(biz.categoryLabel || biz.typeLabel) ? (
              <Text style={[g.catBadge, { color: brand.primary }]}>
                {[biz.categoryLabel, biz.typeLabel].filter(Boolean).join(' · ').toUpperCase()}
              </Text>
            ) : null}
            <Text style={[g.bizName, { color: brand.cream }]}>{biz.name}</Text>
            {biz.address ? (
              <View style={g.addrRow}>
                <Ionicons name="location-outline" size={12} color={brand.creamMuted} />
                <Text style={[g.addrText, { color: brand.creamSub }]} numberOfLines={2}>{biz.address}</Text>
              </View>
            ) : null}
            {biz.description ? <Text style={[g.desc, { color: brand.creamSub }]} numberOfLines={3}>{biz.description}</Text> : null}
          </View>

          {/* Booking card */}
          <View style={[g.bookCard, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
            <Text style={[g.bookHeader, { color: brand.primary }]}>BOOK YOUR SLOT</Text>
            <Text style={[g.bookSub, { color: brand.creamMuted }]}>Pick a date &amp; time, then confirm</Text>

            {/* Guest count — only when venue declares maxGuests */}
            {biz.maxGuests ? (
              <View style={[g.section, { marginTop: 14 }]}>
                <Text style={[g.secLabel, { color: brand.creamSub }]}>
                  Estimated guests <Text style={{ fontWeight: '400', textTransform: 'none' }}>(optional · max {biz.maxGuests})</Text>
                </Text>
                <TextInput
                  style={[g.guestInput, { color: brand.cream, borderColor: brand.border2, backgroundColor: brand.bg }]}
                  placeholder="e.g. 200"
                  placeholderTextColor={brand.creamMuted}
                  keyboardType="number-pad"
                  value={guestCount}
                  onChangeText={setGuestCount}
                  maxLength={4}
                />
              </View>
            ) : null}

            {/* Services */}
            {isServiceBiz && (
              <View style={[g.section, { marginTop: 14 }]}>
                <Text style={[g.secLabel, { color: brand.creamSub }]}>Choose service(s)</Text>
                {biz.services && biz.services.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    {biz.services.map((svc) => (
                      <ServiceRow
                        key={svc.id} svc={svc} selected={selServiceIds.includes(svc.id)}
                        onToggle={() => { setSelServiceIds((p) => p.includes(svc.id) ? p.filter((s) => s !== svc.id) : [...p, svc.id]); setSelStaffId(''); setSelSlots([]); }}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={[g.noServices, { backgroundColor: brand.surface2 }]}>
                    <Text style={[g.noServicesText, { color: brand.creamMuted }]}>Services not listed yet.</Text>
                  </View>
                )}
              </View>
            )}

            {isServiceBiz && biz.services && biz.services.length > 0 && selServiceIds.length === 0 && (
              <View style={[g.pickHint, { backgroundColor: brand.primaryGlow }]}>
                <Ionicons name="hand-left-outline" size={13} color={brand.primary} />
                <Text style={[g.pickHintText, { color: brand.primary }]}>Pick a service to see available slots</Text>
              </View>
            )}

            {/* Staff */}
            {eligibleStaff.length > 0 && (!isServiceBiz || selServiceIds.length > 0) && (
              <View style={[g.section, { marginTop: 14 }]}>
                <Text style={[g.secLabel, { color: brand.creamSub }]}>Staff <Text style={{ fontWeight: '400', textTransform: 'none' }}>(optional)</Text></Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 2 }}>
                  {[{ id: '', name: 'Anyone available', role: undefined }, ...eligibleStaff].map((p) => (
                    <Pressable
                      key={p.id}
                      style={({ pressed }) => ({
                        paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill, borderWidth: 1, alignItems: 'center', minWidth: 90,
                        borderColor: selStaffId === p.id ? brand.primary : brand.border1,
                        backgroundColor: selStaffId === p.id ? brand.primary : brand.bg,
                        opacity: pressed ? 0.75 : 1,
                      })}
                      onPress={() => { setSelStaffId(p.id); setSelSlots([]); }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', textAlign: 'center', color: selStaffId === p.id ? '#fff' : brand.creamSub }}>{p.name}</Text>
                      {p.role ? <Text style={{ fontSize: 10, marginTop: 2, textAlign: 'center', color: selStaffId === p.id ? 'rgba(255,255,255,0.7)' : brand.creamMuted }}>{p.role}</Text> : null}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Date + slots */}
            {(!isServiceBiz || selServiceIds.length > 0) && (
              <>
                <View style={[g.section, { marginTop: 14 }]}>
                  <Text style={[g.secLabel, { color: brand.creamSub }]}>Choose a date</Text>
                  <DateStrip selected={selDate} onSelect={(d) => { setSelDate(d); setSelSlots([]); }} />
                </View>

                {resources.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 2, marginBottom: 4 }}>
                    {resources.map((r) => (
                      <Pressable
                        key={r.id}
                        style={({ pressed }) => ({
                          paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1,
                          borderColor: selRes === r.id ? brand.primary : brand.border1,
                          backgroundColor: selRes === r.id ? brand.primary : brand.bg,
                          opacity: pressed ? 0.75 : 1,
                        })}
                        onPress={() => { setSelRes(r.id); setSelSlots([]); }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: selRes === r.id ? '#fff' : brand.creamSub }}>{r.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}

                <View style={[g.dateHeaderRow, { marginTop: 12, marginBottom: 8 }]}>
                  <Ionicons name="calendar" size={13} color={brand.primary} />
                  <Text style={[g.dateLbl, { color: brand.cream }]}>{fmtDateLabel(selDate)}</Text>
                </View>

                {slotsLoad ? (
                  <View style={g.slotState}>
                    <ActivityIndicator color={brand.primary} size="small" />
                    <Text style={[g.slotStateText, { color: brand.creamSub }]}>Loading available slots…</Text>
                  </View>
                ) : slotsErr ? (
                  <View style={g.slotState}>
                    <Text style={[g.slotErrText, { color: brand.error }]}>{slotsErr}</Text>
                    <Pressable onPress={() => void loadSlots()}><Text style={[g.retryLink, { color: brand.primary }]}>Retry</Text></Pressable>
                  </View>
                ) : visible.length === 0 ? (
                  <View style={g.slotState}>
                    <Ionicons name="moon-outline" size={22} color={brand.creamMuted} />
                    <Text style={[g.slotStateText, { color: brand.creamSub }]}>No slots available for this date.</Text>
                  </View>
                ) : isFullDay ? (
                  <View style={{ gap: 9 }}>
                    {visible.map((slot) => {
                      const avail  = slot.status === 'available';
                      const active = selSlots[0]?.startAt === slot.startAt;
                      return (
                        <Pressable
                          key={slot.id || slot.startAt}
                          style={({ pressed }) => ({
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14, borderWidth: 1,
                            borderColor: active ? brand.primary : brand.border1,
                            backgroundColor: active ? brand.primary : brand.bg,
                            opacity: !avail ? 0.4 : pressed && avail ? 0.8 : 1,
                          })}
                          onPress={avail ? () => toggleSlot(slot) : undefined}
                          disabled={!avail}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name={avail ? 'sunny-outline' : 'ban-outline'} size={15} color={active ? '#fff' : avail ? brand.primary : brand.creamMuted} />
                            <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#fff' : avail ? brand.cream : brand.creamMuted }}>{slot.resourceName || 'Full Day'}</Text>
                          </View>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#fff' : brand.primary }}>
                            {!avail ? 'Booked' : slot.pricePerSlot > 0 ? `₹${slot.pricePerSlot.toLocaleString('en-IN')}` : 'Free'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <>
                    <View style={g.slotLegend}>
                      <View style={g.legendItem}><View style={[g.legendDot, { backgroundColor: brand.success }]} /><Text style={[g.legendText, { color: brand.creamMuted }]}>Available</Text></View>
                      <View style={g.legendItem}><View style={[g.legendDot, { backgroundColor: brand.surface2 }]} /><Text style={[g.legendText, { color: brand.creamMuted }]}>Booked</Text></View>
                    </View>
                    <Text style={[g.multiHint, { color: brand.creamMuted }]}>Tap to select — you can pick more than one slot.</Text>
                    <View style={g.slotGrid}>
                      {visible.map((slot) => (
                        <SlotChip
                          key={slot.id || slot.startAt} slot={slot}
                          selected={selSlots.some((s) => s.startAt === slot.startAt && s.resourceId === slot.resourceId)}
                          onPress={() => toggleSlot(slot)}
                        />
                      ))}
                    </View>
                  </>
                )}
              </>
            )}

            {/* Selection summary */}
            {selSlots.length === 1 && (
              <View style={[g.summary, { backgroundColor: 'rgba(22,163,74,0.06)', borderColor: 'rgba(22,163,74,0.20)' }]}>
                <Ionicons name="checkmark-circle" size={16} color={brand.success} />
                <View style={{ flex: 1 }}>
                  <Text style={[g.sumTime, { color: brand.cream }]}>
                    {isFullDay ? `Full Day · ${selDate}` : `${fmt12(selSlots[0].startTime)}${selSlots[0].endTime ? ` – ${fmt12(selSlots[0].endTime)}` : ''}`}
                  </Text>
                  {isServiceBiz && selServiceIds.length > 0 ? (
                    <Text style={[g.sumSvc, { color: brand.creamSub }]} numberOfLines={1}>
                      {selServiceIds.map((id) => biz.services?.find((s) => s.id === id)?.name).filter(Boolean).join(', ')}
                    </Text>
                  ) : null}
                  {!isServiceBiz && selSlots[0].resourceName ? <Text style={[g.sumSvc, { color: brand.creamSub }]}>{selSlots[0].resourceName}</Text> : null}
                </View>
                {selSlots[0].pricePerSlot > 0 && <Text style={[g.sumPrice, { color: brand.success }]}>₹{selSlots[0].pricePerSlot.toLocaleString('en-IN')}</Text>}
              </View>
            )}

            {selSlots.length > 1 && (
              <View style={[g.summary, { flexDirection: 'column', alignItems: 'stretch', backgroundColor: 'rgba(22,163,74,0.06)', borderColor: 'rgba(22,163,74,0.20)' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="checkmark-circle" size={16} color={brand.success} />
                  <Text style={[g.sumTime, { color: brand.cream, flex: 1 }]}>{selSlots.length} slots selected</Text>
                  <Text style={[g.sumPrice, { color: brand.success }]}>₹{totalPrice.toLocaleString('en-IN')}</Text>
                </View>
                <View style={g.multiChipRow}>
                  {selSlots.map((slot) => (
                    <Pressable
                      key={slotKey(slot)}
                      style={[g.multiChip, { borderColor: brand.border1, backgroundColor: brand.bg }]}
                      onPress={() => toggleSlot(slot)}
                    >
                      <Text style={[g.multiChipText, { color: brand.cream }]}>{fmt12(slot.startTime)}</Text>
                      <Ionicons name="close" size={12} color={brand.creamMuted} />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[g.footer, { borderTopColor: brand.border1, backgroundColor: brand.bg, paddingBottom: insets.bottom + 6 }]}>
        {selSlots.length > 0 && !paying && (
          <View style={g.footerStrip}>
            <View style={{ flex: 1 }}>
              <Text style={[g.footerStripTime, { color: brand.cream }]} numberOfLines={1}>
                {isFullDay
                  ? 'Full Day'
                  : selSlots.length > 1
                    ? `${selSlots.length} slots`
                    : `${fmt12(selSlots[0].startTime)}${selSlots[0].endTime ? ` – ${fmt12(selSlots[0].endTime)}` : ''}`}
              </Text>
              <Text style={[g.footerStripDate, { color: brand.creamSub }]}>{fmtDateShort(selDate)}</Text>
            </View>
            {totalPrice > 0
              ? <Text style={[g.footerStripPrice, { color: brand.primary }]}>₹{totalPrice.toLocaleString('en-IN')}</Text>
              : <Text style={[g.footerStripFree, { color: brand.success }]}>Free</Text>}
          </View>
        )}
        <Pressable
          style={({ pressed }) => [g.bookBtn, { backgroundColor: brand.primary }, !canBook && { opacity: 0.35 }, pressed && canBook && { opacity: 0.85 }]}
          onPress={() => { if (canBook) setShowConfirm(true); }}
          disabled={!canBook}
        >
          {paying ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />}
          <Text style={g.bookBtnText}>{btnLabel}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Shared static styles ─────────────────────────────────────────────────────

const g = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },

  infoBlock: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, gap: 4 },
  catBadge:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  bizName:   { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  addrRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 },
  addrText:  { flex: 1, fontSize: 12, lineHeight: 17 },
  desc:      { fontSize: 13, lineHeight: 18, marginTop: 6 },

  bookCard:   { margin: 12, marginTop: 10, borderRadius: Radius.lg, borderWidth: 1, padding: 16, gap: 2 },
  bookHeader: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  bookSub:    { fontSize: 12, marginBottom: 4 },

  section:  { gap: 8 },
  secLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },

  noServices:     { paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  noServicesText: { fontSize: 13, textAlign: 'center' },

  pickHint:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  pickHintText: { fontSize: 12, flex: 1 },

  dateHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateLbl:       { fontSize: 14, fontWeight: '700' },

  slotState:     { alignItems: 'center', gap: 8, paddingVertical: 24 },
  slotStateText: { fontSize: 13, textAlign: 'center' },
  slotErrText:   { fontSize: 13, textAlign: 'center' },
  retryLink:     { fontSize: 13, fontWeight: '600' },

  slotLegend: { flexDirection: 'row', gap: 14, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 11 },

  slotGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  multiHint: { fontSize: 11, marginBottom: 8 },

  summary:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 12, borderRadius: 14, borderWidth: 1, borderLeftWidth: 3 },
  sumTime:  { fontSize: 13, fontWeight: '700' },
  sumSvc:   { fontSize: 11, marginTop: 2 },
  sumPrice: { fontSize: 16, fontWeight: '800' },

  multiChipRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  multiChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.pill, borderWidth: 1 },
  multiChipText: { fontSize: 11, fontWeight: '600' },

  guestInput: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },

  footer: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, gap: 10 },
  footerStrip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  footerStripTime:  { fontSize: 14, fontWeight: '700' },
  footerStripDate:  { fontSize: 11, marginTop: 1 },
  footerStripPrice: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  footerStripFree:  { fontSize: 14, fontWeight: '700' },

  bookBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: Radius.md, paddingVertical: 15 },
  bookBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },

  errText:      { textAlign: 'center', fontSize: 13 },
  retryBtn:     { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 9 },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
