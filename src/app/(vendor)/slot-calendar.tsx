/**
 * Slot Calendar
 * Week navigation · Day tabs · Resource filter · Block/Demand-price modes
 * Mirrors web /business/businesses/[id]/calendar
 *
 * Route: /(vendor)/slot-calendar?id=<businessId>&name=<businessName>
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import {
  listBusinessSlots,
  blockBusinessSlot,
  unblockBusinessSlot,
  setBusinessSlotPrice,
  clearBusinessSlotPrice,
  type BusinessSlot,
  type BusinessSlotsResponse,
  type SlotResource,
} from '@/services/vendor-business-service';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayLocal(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function weekRange(start: string): { from: string; to: string } {
  return { from: start, to: addDays(start, 6) };
}

function dayAbbr(dateStr: string, today: string): string {
  if (dateStr === today) return 'Today';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
}

function dayNum(dateStr: string): string {
  return String(new Date(`${dateStr}T00:00:00`).getDate());
}

function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const p = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${p}`;
}

function rangeLabel(from: string, to: string): string {
  const f = new Date(`${from}T00:00:00`);
  const t = new Date(`${to}T00:00:00`);
  const fLabel = f.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const tLabel = t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fLabel} – ${tLabel}`;
}

// ─── Slot chip helpers ────────────────────────────────────────────────────────

type CalendarMode = 'block' | 'price';

function slotColor(slot: BusinessSlot, base: number): {
  bg: string; border: string; text: string; sub: string;
} {
  const isDemand = slot.status === 'available' && slot.pricePerSlot > (slot.basePricePerSlot ?? base);
  switch (slot.status) {
    case 'available':
      return isDemand
        ? { bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.30)',  text: '#92400E', sub: '#B45309' }
        : { bg: 'rgba(22,163,74,0.06)',  border: 'rgba(22,163,74,0.25)',  text: Brand.success, sub: '#16A34A' };
    case 'blocked':
      return { bg: Brand.surface2,        border: Brand.border2,           text: Brand.creamSub, sub: Brand.creamMuted };
    case 'booked':
      return { bg: 'rgba(37,99,235,0.06)', border: 'rgba(37,99,235,0.20)', text: '#1D4ED8',  sub: '#3B82F6' };
    default:
      return { bg: Brand.surface1,        border: Brand.border1,           text: Brand.creamMuted, sub: Brand.creamMuted };
  }
}

function SlotSkeleton() {
  return (
    <View style={sk.grid}>
      {Array.from({ length: 12 }).map((_, i) => (
        <View key={i} style={sk.chip} />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SlotCalendarScreen() {
  const { id: businessId, name: businessName = 'Business' } = useLocalSearchParams<{
    id: string;
    name: string;
  }>();
  const token = useAuthStore((s) => s.token);

  const [rangeStart,   setRangeStart]   = useState(todayLocal());
  const [selectedDate, setSelectedDate] = useState(todayLocal());
  const [resourceId,   setResourceId]   = useState('');
  const [mode,         setMode]         = useState<CalendarMode>('block');
  const [data,         setData]         = useState<BusinessSlotsResponse | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [busySlotId,   setBusySlotId]   = useState('');
  const [error,        setError]        = useState('');

  // Demand price modal
  const [priceEdit,  setPriceEdit]  = useState<BusinessSlot | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [priceBusy,  setPriceBusy]  = useState(false);
  const [priceError, setPriceError] = useState('');

  const today  = todayLocal();
  const range  = useMemo(() => weekRange(rangeStart), [rangeStart]);
  const dates  = useMemo(() => {
    const list: string[] = [];
    let cur = range.from;
    while (cur <= range.to) { list.push(cur); cur = addDays(cur, 1); }
    return list;
  }, [range]);

  const resources      = data?.resources ?? [];
  const basePrice      = resources.find((r) => r.id === resourceId)?.pricePerSlot ?? data?.pricePerSlot ?? 0;
  const isFullDay      = data?.bookingMode === 'fullDay';
  const visibleResources = resourceId ? resources.filter((r) => r.id === resourceId) : resources;

  // Group slots by date → resourceId
  const slotsGrouped = useMemo(() => {
    const byDate = new Map<string, Map<string, BusinessSlot[]>>();
    for (const slot of data?.slots ?? []) {
      if (!byDate.has(slot.date)) byDate.set(slot.date, new Map());
      const byRes = byDate.get(slot.date)!;
      const list  = byRes.get(slot.resourceId) ?? [];
      list.push(slot);
      byRes.set(slot.resourceId, list);
    }
    for (const byRes of byDate.values()) {
      for (const list of byRes.values()) {
        list.sort((a, b) => a.startTime.localeCompare(b.startTime));
      }
    }
    return byDate;
  }, [data?.slots]);

  function getSlots(date: string, resId: string): BusinessSlot[] {
    return slotsGrouped.get(date)?.get(resId) ?? [];
  }

  // Day stats
  const dayStats = useMemo(() => {
    let available = 0, blocked = 0, booked = 0, demand = 0;
    for (const res of visibleResources) {
      for (const s of getSlots(selectedDate, res.id)) {
        if (s.status === 'available') {
          available++;
          if (s.pricePerSlot > (s.basePricePerSlot ?? basePrice)) demand++;
        } else if (s.status === 'blocked') blocked++;
        else if (s.status === 'booked') booked++;
      }
    }
    return { available, blocked, booked, demand };
  }, [visibleResources, selectedDate, slotsGrouped, basePrice]);

  const dayHasSlots = visibleResources.some((r) => getSlots(selectedDate, r.id).length > 0);

  // Load slots
  // Reset all state when switching to a different business
  useEffect(() => {
    const t = todayLocal();
    setRangeStart(t);
    setSelectedDate(t);
    setResourceId('');
    setData(null);
    setLoading(true);
    setError('');
    setPriceEdit(null);
  }, [businessId]);

  const load = useCallback(async (isRefresh = false) => {
    if (!token || !businessId) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const res = await listBusinessSlots(token, businessId, {
        from: range.from,
        to:   range.to,
        resourceId: resourceId || undefined,
      });
      setData(res);
      // Auto-select first resource
      if (res.resources.length > 0 && !resourceId) {
        setResourceId(res.resources[0].id);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load slots.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, businessId, range.from, range.to, resourceId]);

  useEffect(() => { load(); }, [load]);

  // Keep selectedDate in range when range changes
  useEffect(() => {
    if (selectedDate < range.from || selectedDate > range.to) {
      setSelectedDate(today >= range.from && today <= range.to ? today : range.from);
    }
  }, [range.from, range.to]);

  // Optimistic slot update
  function patchSlot(slot: BusinessSlot, patch: Partial<BusinessSlot>) {
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, slots: prev.slots.map((s) => s.id === slot.id ? { ...s, ...patch } : s) };
    });
  }

  async function toggleBlock(slot: BusinessSlot) {
    if (slot.status === 'booked' || busySlotId) return;
    setBusySlotId(slot.id);
    setError('');
    const next = slot.status === 'blocked' ? 'available' : 'blocked';
    try {
      if (slot.status === 'blocked') {
        await unblockBusinessSlot(token!, businessId!, { resourceId: slot.resourceId, startAt: slot.startAt });
      } else {
        await blockBusinessSlot(token!, businessId!, { resourceId: slot.resourceId, startAt: slot.startAt });
      }
      patchSlot(slot, { status: next });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not update slot.');
    } finally {
      setBusySlotId('');
    }
  }

  function onSlotPress(slot: BusinessSlot) {
    if (slot.status === 'booked' || busySlotId === slot.id) return;
    if (mode === 'price') {
      if (slot.status === 'available') {
        setPriceEdit(slot);
        setPriceInput(String(slot.pricePerSlot));
        setPriceError('');
      }
      return;
    }
    toggleBlock(slot);
  }

  async function saveDemandPrice() {
    if (!priceEdit || !token || !businessId) return;
    const price = Number(priceInput);
    const base  = priceEdit.basePricePerSlot ?? basePrice;
    if (!Number.isFinite(price) || price < base) {
      setPriceError(`Demand price must be ≥ ₹${base}.`);
      return;
    }
    setPriceBusy(true);
    setPriceError('');
    try {
      await setBusinessSlotPrice(token, businessId, {
        resourceId:   priceEdit.resourceId,
        startAt:      priceEdit.startAt,
        pricePerSlot: Math.round(price),
      });
      patchSlot(priceEdit, { pricePerSlot: Math.round(price), basePricePerSlot: base });
      setPriceEdit(null);
    } catch (e: unknown) {
      setPriceError(e instanceof Error ? e.message : 'Could not set price.');
    } finally {
      setPriceBusy(false);
    }
  }

  async function resetDemandPrice() {
    if (!priceEdit || !token || !businessId) return;
    const base = priceEdit.basePricePerSlot ?? basePrice;
    setPriceBusy(true);
    setPriceError('');
    try {
      await clearBusinessSlotPrice(token, businessId, {
        resourceId: priceEdit.resourceId,
        startAt:    priceEdit.startAt,
      });
      patchSlot(priceEdit, { pricePerSlot: base, basePricePerSlot: undefined });
      setPriceEdit(null);
    } catch (e: unknown) {
      setPriceError(e instanceof Error ? e.message : 'Could not reset price.');
    } finally {
      setPriceBusy(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.navigate('/(vendor)/businesses' as never)} hitSlop={8}>
          <Ionicons name="arrow-back" size={18} color={Brand.cream} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{businessName}</Text>
          {data && (
            <Text style={s.headerSub}>
              {isFullDay
                ? `Full-day · from ₹${basePrice}/day`
                : `${data.slotMinutes} min slots · from ₹${basePrice}`}
            </Text>
          )}
        </View>
        {/* Edit Setup — lets vendor re-configure slots/hours */}
        <Pressable
          style={s.editSetupBtn}
          onPress={() => router.push({ pathname: '/(vendor)/business-setup', params: { id: businessId, edit: '1' } } as never)}
          hitSlop={6}
        >
          <Ionicons name="create-outline" size={15} color={Brand.primary} />
        </Pressable>
        <Pressable style={s.refreshBtn} onPress={() => load(true)} disabled={loading || refreshing}>
          {refreshing
            ? <ActivityIndicator size="small" color={Brand.primary} />
            : <Ionicons name="refresh-outline" size={18} color={Brand.creamSub} />}
        </Pressable>
      </View>

      {/* Week navigation */}
      <View style={s.weekNav}>
        <Pressable
          style={[s.weekArrow, rangeStart <= today && s.weekArrowDisabled]}
          onPress={() => setRangeStart((s) => addDays(s, -7))}
          disabled={rangeStart <= today}
        >
          <Ionicons name="chevron-back" size={18} color={rangeStart <= today ? Brand.creamMuted : Brand.cream} />
        </Pressable>

        <Pressable
          style={s.weekLabelWrap}
          onPress={() => {
            setRangeStart(today);
            setSelectedDate(today);
            setPriceEdit(null);
          }}
        >
          <Text style={s.weekLabel}>{rangeLabel(range.from, range.to)}</Text>
          {rangeStart !== today && (
            <View style={s.todayJumpPill}>
              <Text style={s.todayJumpText}>Today</Text>
            </View>
          )}
        </Pressable>

        <Pressable style={s.weekArrow} onPress={() => setRangeStart((s) => addDays(s, 7))}>
          <Ionicons name="chevron-forward" size={18} color={Brand.cream} />
        </Pressable>
      </View>

      {/* Day grid — full-width 7 columns, easy to tap */}
      <View style={s.dayGrid}>
        {dates.map((date) => {
          const isSelected = date === selectedDate;
          const isToday    = date === today;
          const d = new Date(`${date}T00:00:00`);
          const abbr = d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2);
          return (
            <Pressable
              key={date}
              style={[s.dayCell, isSelected && s.dayCellActive]}
              onPress={() => { setSelectedDate(date); setPriceEdit(null); }}
            >
              <Text style={[s.dayCellAbbr, isSelected && s.dayCellAbbrActive]}>{abbr}</Text>
              <Text style={[s.dayCellNum, isSelected && s.dayCellNumActive]}>{dayNum(date)}</Text>
              <View style={[s.dayCellDot, isToday && s.dayCellDotToday, isSelected && isToday && s.dayCellDotTodayActive]} />
            </Pressable>
          );
        })}
      </View>

      {/* Controls: mode + resource filter */}
      <View style={s.controls}>
        {/* Mode — segmented control */}
        <View style={s.modeSegment}>
          <Pressable
            style={[s.modeSegItem, mode === 'block' && s.modeSegItemActive]}
            onPress={() => { setMode('block'); setPriceEdit(null); }}
          >
            <Ionicons
              name="ban-outline"
              size={12}
              color={mode === 'block' ? '#fff' : Brand.creamSub}
            />
            <Text style={[s.modeSegText, mode === 'block' && s.modeSegTextActive]}>Block</Text>
          </Pressable>
          <View style={s.modeSegDivider} />
          <Pressable
            style={[s.modeSegItem, mode === 'price' && s.modeSegItemPrice]}
            onPress={() => { setMode('price'); setPriceEdit(null); }}
          >
            <Ionicons
              name="trending-up-outline"
              size={12}
              color={mode === 'price' ? '#92400E' : Brand.creamSub}
            />
            <Text style={[s.modeSegText, mode === 'price' && s.modeSegTextPrice]}>Surge Price</Text>
          </Pressable>
        </View>

        {/* Resource filter — no "All" pill; first resource auto-selected on load */}
        {resources.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.resourceFilter}>
              {resources.map((r) => (
                <Pressable
                  key={r.id}
                  style={[s.resPill, resourceId === r.id && s.resPillActive]}
                  onPress={() => setResourceId(r.id)}
                >
                  <Text style={[s.resPillText, resourceId === r.id && s.resPillTextActive]}>
                    {r.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Error banner */}
      {error ? (
        <View style={s.errorBanner}>
          <Ionicons name="warning-outline" size={14} color={Brand.error} />
          <Text style={s.errorText}>{error}</Text>
          <Pressable onPress={() => setError('')} hitSlop={8}>
            <Ionicons name="close-outline" size={16} color={Brand.creamMuted} />
          </Pressable>
        </View>
      ) : null}

      {/* Stats row */}
      {!loading && data && (
        <View style={s.statsRow}>
          <View style={s.statChip}>
            <View style={[s.statDot, { backgroundColor: Brand.success }]} />
            <Text style={s.statText}>{dayStats.available} open</Text>
          </View>
          {dayStats.demand > 0 && (
            <View style={s.statChip}>
              <View style={[s.statDot, { backgroundColor: '#D97706' }]} />
              <Text style={s.statText}>{dayStats.demand} surge</Text>
            </View>
          )}
          <View style={s.statChip}>
            <View style={[s.statDot, { backgroundColor: Brand.creamMuted }]} />
            <Text style={s.statText}>{dayStats.blocked} blocked</Text>
          </View>
          <View style={s.statChip}>
            <View style={[s.statDot, { backgroundColor: '#2563EB' }]} />
            <Text style={s.statText}>{dayStats.booked} booked</Text>
          </View>
          <Text style={s.statHint}>
            {mode === 'block' ? '· Tap to block/unblock' : '· Tap to set surge'}
          </Text>
        </View>
      )}

      {/* Slot grid */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.slotContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Brand.primary} />
        }
      >
        {loading ? (
          <SlotSkeleton />
        ) : !dayHasSlots ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="moon-outline" size={28} color={Brand.creamMuted} />
            </View>
            <Text style={s.emptyTitle}>No slots this day</Text>
            <Text style={s.emptySub}>Closed or past hours for {dayAbbr(selectedDate, today)}</Text>
          </View>
        ) : (
          visibleResources.map((resource) => {
            const slots = getSlots(selectedDate, resource.id);
            if (!slots.length) return null;
            return (
              <View key={resource.id} style={s.resourceSection}>
                {resources.length > 1 && (
                  <View style={s.resourceHeader}>
                    <Ionicons name="cube-outline" size={12} color={Brand.creamMuted} />
                    <Text style={s.resourceLabel}>{resource.name}</Text>
                    <Text style={s.resourcePrice}>₹{resource.pricePerSlot}/slot</Text>
                  </View>
                )}
                <View style={s.slotGrid}>
                  {slots.map((slot) => {
                    const colors  = slotColor(slot, basePrice);
                    const isBusy  = busySlotId === slot.id;
                    const isDemand = slot.status === 'available' && slot.pricePerSlot > (slot.basePricePerSlot ?? basePrice);
                    const canTap  = slot.status !== 'booked' && !isBusy;
                    return (
                      <Pressable
                        key={slot.id}
                        style={[
                          s.slotChip,
                          { backgroundColor: colors.bg, borderColor: colors.border },
                          !canTap && s.slotChipDim,
                        ]}
                        onPress={() => onSlotPress(slot)}
                        disabled={!canTap}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color={colors.text} />
                        ) : (
                          <>
                            <Text style={[s.slotTime, { color: colors.text }]}>
                              {isFullDay ? 'Full day' : formatTime12(slot.startTime)}
                            </Text>
                            <Text style={[s.slotSub, { color: colors.sub }]}>
                              {slot.status === 'available'
                                ? isDemand
                                  ? `₹${slot.pricePerSlot} ↑`
                                  : `₹${slot.pricePerSlot}`
                                : slot.status === 'blocked'
                                  ? 'Blocked'
                                  : slot.status === 'booked'
                                    ? slot.booking?.customerName
                                      ? slot.booking.customerName.split(' ')[0]
                                      : 'Booked'
                                    : '—'}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Demand Price Modal */}
      <Modal
        visible={!!priceEdit}
        transparent
        animationType="slide"
        onRequestClose={() => setPriceEdit(null)}
      >
        <KeyboardAvoidingView
          style={modal.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={modal.backdrop} onPress={() => setPriceEdit(null)} />
          <View style={modal.sheet}>
            <View style={modal.handle} />
            <View style={modal.header}>
              <View style={modal.headerIcon}>
                <Ionicons name="trending-up-outline" size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modal.title}>Set Surge Price</Text>
                {priceEdit && (
                  <Text style={modal.sub}>
                    {priceEdit.resourceName} · {formatTime12(priceEdit.startTime)}
                  </Text>
                )}
              </View>
              <Pressable onPress={() => setPriceEdit(null)} hitSlop={12}>
                <Ionicons name="close" size={20} color={Brand.creamSub} />
              </Pressable>
            </View>

            {priceError ? (
              <View style={modal.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={Brand.error} />
                <Text style={modal.errorText}>{priceError}</Text>
              </View>
            ) : null}

            <Text style={modal.label}>
              Base price: ₹{priceEdit?.basePricePerSlot ?? basePrice} — surge must be ≥ this
            </Text>

            <View style={modal.inputRow}>
              <Text style={modal.rupee}>₹</Text>
              <TextInput
                style={modal.input}
                value={priceInput}
                onChangeText={(v) => { setPriceInput(v.replace(/\D/g, '')); setPriceError(''); }}
                keyboardType="numeric"
                placeholder="Enter surge price"
                placeholderTextColor={Brand.creamMuted}
                autoFocus
              />
            </View>

            <View style={modal.actions}>
              {priceEdit && priceEdit.pricePerSlot > (priceEdit.basePricePerSlot ?? basePrice) && (
                <Pressable
                  style={modal.resetBtn}
                  onPress={resetDemandPrice}
                  disabled={priceBusy}
                >
                  <Text style={modal.resetBtnText}>Reset to base</Text>
                </Pressable>
              )}
              <Pressable
                style={[modal.saveBtn, priceBusy && { opacity: 0.6 }]}
                onPress={saveDemandPrice}
                disabled={priceBusy}
              >
                {priceBusy
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={modal.saveBtnText}>Save Surge</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sk = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2, padding: Spacing.four },
  chip: { width: '22%', height: 52, backgroundColor: Brand.surface2, borderRadius: Radius.md },
});

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.bg },

  // Header
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two + 2, borderBottomWidth: 1, borderBottomColor: Brand.border1, gap: Spacing.two },
  backBtn:   { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Brand.surface1, borderWidth: 1, borderColor: Brand.border1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Brand.cream, letterSpacing: -0.2 },
  headerSub:   { fontSize: 11, color: Brand.creamSub, marginTop: 1 },
  editSetupBtn:{ width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Brand.primaryGlow, borderWidth: 1, borderColor: 'rgba(124,58,237,0.18)', alignItems: 'center', justifyContent: 'center' },
  refreshBtn:  { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Brand.surface1, borderWidth: 1, borderColor: Brand.border1, alignItems: 'center', justifyContent: 'center' },

  // Week nav
  weekNav:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 4, borderBottomWidth: 1, borderBottomColor: Brand.border1 },
  weekArrow:        { width: 34, height: 34, borderRadius: Radius.md, backgroundColor: Brand.surface1, borderWidth: 1, borderColor: Brand.border1, alignItems: 'center', justifyContent: 'center' },
  weekArrowDisabled:{ opacity: 0.4 },
  weekLabelWrap:    { flex: 1, alignItems: 'center', gap: 4 },
  weekLabel:        { fontSize: 13, fontWeight: '600', color: Brand.cream },
  todayJumpPill: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Brand.primaryGlow,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.20)',
  },
  todayJumpText: { fontSize: 10, fontWeight: '700', color: Brand.primary },

  // Day grid — full-width 7-column layout
  dayGrid: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Brand.border1,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    gap: 2,
    borderRightWidth: 1,
    borderRightColor: Brand.border1,
  },
  dayCellActive:     { backgroundColor: Brand.primary },
  dayCellAbbr:       { fontSize: 9, fontWeight: '600', color: Brand.creamMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  dayCellAbbrActive: { color: 'rgba(255,255,255,0.75)' },
  dayCellNum:        { fontSize: 17, fontWeight: '800', color: Brand.cream, lineHeight: 20 },
  dayCellNumActive:  { color: '#fff' },
  dayCellDot:           { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  dayCellDotToday:      { backgroundColor: Brand.primary },
  dayCellDotTodayActive:{ backgroundColor: '#fff' },

  // Controls
  controls:     { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: Spacing.two, borderBottomWidth: 1, borderBottomColor: Brand.border1 },

  // Mode — segmented control
  modeSegment: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: Brand.surface1,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.border1,
    overflow: 'hidden',
  },
  modeSegItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
  },
  modeSegItemActive: {
    backgroundColor: Brand.primary,
  },
  modeSegItemPrice: {
    backgroundColor: 'rgba(217,119,6,0.10)',
  },
  modeSegDivider: {
    width: 1,
    backgroundColor: Brand.border1,
  },
  modeSegText:      { fontSize: 12, fontWeight: '600', color: Brand.creamSub },
  modeSegTextActive:{ color: '#fff' },
  modeSegTextPrice: { color: '#92400E', fontWeight: '700' },
  resourceFilter: { flexDirection: 'row', gap: Spacing.one + 2 },
  resPill:       { paddingHorizontal: Spacing.two + 2, paddingVertical: 5, borderRadius: Radius.pill, borderWidth: 1, borderColor: Brand.border1, backgroundColor: Brand.surface1 },
  resPillActive: { backgroundColor: Brand.primaryGlow, borderColor: Brand.primary },
  resPillText:   { fontSize: 12, fontWeight: '500', color: Brand.creamSub },
  resPillTextActive: { color: Brand.primary, fontWeight: '700' },

  // Error
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: 'rgba(220,38,38,0.06)', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: 1, borderBottomColor: 'rgba(220,38,38,0.12)' },
  errorText:   { flex: 1, fontSize: 12, color: Brand.error },

  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: 1, borderBottomColor: Brand.border1 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statDot:  { width: 7, height: 7, borderRadius: 4 },
  statText: { fontSize: 11, fontWeight: '600', color: Brand.creamSub },
  statHint: { fontSize: 11, color: Brand.creamMuted },

  // Slot content
  slotContent: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, paddingBottom: 80, gap: Spacing.three },
  resourceSection: { gap: Spacing.two },
  resourceHeader:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  resourceLabel:   { fontSize: 11, fontWeight: '700', color: Brand.creamSub, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  resourcePrice:   { fontSize: 11, color: Brand.creamMuted },
  slotGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2 },
  slotChip:        { width: '22%', borderRadius: Radius.md, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 3 },
  slotChipDim:     { opacity: 0.7 },
  slotTime:        { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  slotSub:         { fontSize: 9, fontWeight: '600', textAlign: 'center' },

  // Empty state
  emptyState:   { alignItems: 'center', paddingTop: Spacing.six, gap: Spacing.two },
  emptyIconWrap:{ width: 64, height: 64, borderRadius: Radius.xl, backgroundColor: Brand.surface1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: Brand.cream },
  emptySub:     { fontSize: 13, color: Brand.creamSub },
});

const modal = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:    { backgroundColor: Brand.bg, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.six, gap: Spacing.three, borderWidth: 1, borderBottomWidth: 0, borderColor: Brand.border1 },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: Brand.border2, alignSelf: 'center', marginBottom: Spacing.two },
  header:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  headerIcon: { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: 'rgba(217,119,6,0.10)', alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: 16, fontWeight: '700', color: Brand.cream },
  sub:      { fontSize: 12, color: Brand.creamSub, marginTop: 1 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(220,38,38,0.06)', borderRadius: Radius.md, padding: Spacing.two },
  errorText:{ fontSize: 12, color: Brand.error, flex: 1 },
  label:    { fontSize: 12, color: Brand.creamSub },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Brand.border2, borderRadius: Radius.md, backgroundColor: Brand.surface1, paddingHorizontal: Spacing.three },
  rupee:    { fontSize: 16, color: Brand.creamSub, marginRight: 4 },
  input:    { flex: 1, fontSize: 18, fontWeight: '700', color: Brand.cream, paddingVertical: 14 },
  actions:  { flexDirection: 'row', gap: Spacing.two, justifyContent: 'flex-end' },
  resetBtn: { paddingHorizontal: Spacing.three, paddingVertical: 12, borderRadius: Radius.pill, borderWidth: 1, borderColor: Brand.border2 },
  resetBtnText: { fontSize: 13, fontWeight: '600', color: Brand.creamSub },
  saveBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#D97706', borderRadius: Radius.pill, paddingVertical: 14 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
