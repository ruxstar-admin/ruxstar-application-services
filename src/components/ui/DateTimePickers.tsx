/**
 * DateField · TimeField · DateTimeField
 * 100% pure-JS pickers — no native modules, works in Expo Go.
 *
 * DateField  → bottom-sheet calendar grid (month view, prev/next)
 * TimeField  → bottom-sheet scrollable time-slot grid (HH:MM)
 * DateTimeField → label row + DateField + TimeField side-by-side
 */

import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Brand, Radius, Spacing } from '@/constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Date → "YYYY-MM-DD" local date string */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM-DD" → "26 Jun 2026" */
export function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[m - 1]} ${y}`;
}

/** Date → "HH:MM" 24-hour */
export function toHHMM(d: Date): string {
  return [d.getHours(), d.getMinutes()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

/** "HH:MM" → "9:30 AM" */
export function formatDisplayTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix  = h >= 12 ? 'PM' : 'AM';
  const hour12  = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

// ─── Shared bottom-sheet header ───────────────────────────────────────────────

function SheetHeader({
  title, onClose,
}: {
  title: string; onClose: () => void;
}) {
  return (
    <View style={sh.header}>
      <Text style={sh.title}>{title}</Text>
      <Pressable onPress={onClose} hitSlop={10} style={sh.closeBtn}>
        <Ionicons name="close" size={18} color={Brand.creamSub} />
      </Pressable>
    </View>
  );
}

// ─── Shared tappable field ────────────────────────────────────────────────────

function PickerField({
  icon, value, placeholder, onPress,
}: {
  icon:        keyof typeof Ionicons.glyphMap;
  value:       string;
  placeholder: string;
  onPress:     () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [p.field, pressed && p.fieldPressed]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={16} color={value ? Brand.primary : Brand.creamMuted} />
      <Text style={[p.fieldText, !value && p.placeholder]}>{value || placeholder}</Text>
      <Ionicons name="chevron-down" size={13} color={Brand.creamMuted} />
    </Pressable>
  );
}

// ─── DateField ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa'];

export type DateFieldProps = {
  label?:       string;
  value:        string;       // "YYYY-MM-DD" or ''
  onChange:     (v: string) => void;
  optional?:    boolean;
  minDate?:     Date;
  placeholder?: string;
};

export function DateField({
  label, value, onChange, optional, minDate, placeholder = 'Select date',
}: DateFieldProps) {
  const today  = new Date();
  const initD  = value ? (() => { const [y,m,d] = value.split('-').map(Number); return new Date(y, m-1, d); })()
                       : (minDate ?? today);

  const [open,      setOpen]      = useState(false);
  const [viewYear,  setViewYear]  = useState(initD.getFullYear());
  const [viewMonth, setViewMonth] = useState(initD.getMonth());

  function handleOpen() {
    const d = value ? (() => { const [y,m,dd] = value.split('-').map(Number); return new Date(y,m-1,dd); })()
                    : (minDate ?? today);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setOpen(true);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  // Build the 7-column grid (leading nulls = blank cells)
  const cells = useMemo(() => {
    const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    // Pad to complete last row
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [viewYear, viewMonth]);

  function isDisabled(day: number) {
    if (!minDate) return false;
    const cellDate = new Date(viewYear, viewMonth, day);
    const minDay   = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    return cellDate < minDay;
  }
  function isSelected(day: number) {
    if (!value) return false;
    const [sy, sm, sd] = value.split('-').map(Number);
    return sy === viewYear && sm - 1 === viewMonth && sd === day;
  }
  function isToday(day: number) {
    return today.getFullYear() === viewYear &&
           today.getMonth()    === viewMonth &&
           today.getDate()     === day;
  }

  const displayValue = value ? formatDisplayDate(value) : '';

  return (
    <View>
      {label ? (
        <Text style={p.label}>
          {label}
          {optional ? <Text style={p.optional}> (optional)</Text> : null}
        </Text>
      ) : null}

      <PickerField
        icon="calendar-outline"
        value={displayValue}
        placeholder={placeholder}
        onPress={handleOpen}
      />

      <Modal visible={open} transparent animationType="slide" statusBarTranslucent>
        <View style={sh.overlay}>
          <Pressable style={sh.backdrop} onPress={() => setOpen(false)} />
          <View style={sh.sheet}>
            <SheetHeader title={label ?? 'Select Date'} onClose={() => setOpen(false)} />

            {/* Month nav */}
            <View style={cal.monthRow}>
              <Pressable onPress={prevMonth} hitSlop={8} style={cal.monthNavBtn}>
                <Ionicons name="chevron-back" size={20} color={Brand.cream} />
              </Pressable>
              <Text style={cal.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
              <Pressable onPress={nextMonth} hitSlop={8} style={cal.monthNavBtn}>
                <Ionicons name="chevron-forward" size={20} color={Brand.cream} />
              </Pressable>
            </View>

            {/* Day-of-week headers */}
            <View style={cal.weekRow}>
              {DOW.map((d) => <Text key={d} style={cal.weekLabel}>{d}</Text>)}
            </View>

            {/* Day grid — 7 columns */}
            <View style={cal.grid}>
              {cells.map((day, i) => {
                if (day === null) return <View key={`e${i}`} style={cal.cell} />;
                const dis = isDisabled(day);
                const sel = isSelected(day);
                const tod = isToday(day);
                return (
                  <Pressable
                    key={day}
                    disabled={dis}
                    onPress={() => {
                      onChange(toDateKey(new Date(viewYear, viewMonth, day)));
                      setOpen(false);
                    }}
                    style={[
                      cal.cell,
                      sel && cal.cellSelected,
                      tod && !sel && cal.cellToday,
                      dis && cal.cellDisabled,
                    ]}
                  >
                    <Text style={[
                      cal.cellText,
                      sel && cal.cellTextSelected,
                      tod && !sel && cal.cellTextToday,
                      dis && cal.cellTextDisabled,
                    ]}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: 24 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── TimeField ────────────────────────────────────────────────────────────────

export type TimeFieldProps = {
  label?:         string;
  value:          string;       // "HH:MM" or ''
  onChange:       (v: string) => void;
  optional?:      boolean;
  placeholder?:   string;
  minuteInterval?: 5 | 10 | 15 | 20 | 30;
};

export function TimeField({
  label, value, onChange, optional,
  placeholder = 'Select time',
  minuteInterval = 15,
}: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Generate all slots from 00:00 to 23:xx
  const slots = useMemo(() => {
    const r: { hhmm: string; display: string }[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += minuteInterval) {
        const hhmm = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        r.push({ hhmm, display: formatDisplayTime(hhmm) });
      }
    }
    return r;
  }, [minuteInterval]);

  // Index of current value — used for auto-scroll
  const selectedIndex = useMemo(
    () => slots.findIndex((s) => s.hhmm === value),
    [slots, value],
  );

  const COLS   = 3;
  const SLOT_H = 44;
  const ROW_GAP = 6;   // matches tp.listContent gap (Spacing.one + 2)
  const TOP_PAD = 8;   // matches tp.listContent padding (Spacing.two)

  function handleOpen() {
    setOpen(true);
    // Use scrollToOffset (avoids scrollToIndex out-of-range on virtual lists)
    if (selectedIndex >= 0) {
      const rowOffset = TOP_PAD + Math.floor(selectedIndex / COLS) * (SLOT_H + ROW_GAP);
      setTimeout(() => listRef.current?.scrollToOffset({ offset: rowOffset, animated: false }), 80);
    }
  }

  return (
    <View>
      {label ? (
        <Text style={p.label}>
          {label}
          {optional ? <Text style={p.optional}> (optional)</Text> : null}
        </Text>
      ) : null}

      <PickerField
        icon="time-outline"
        value={value ? formatDisplayTime(value) : ''}
        placeholder={placeholder}
        onPress={handleOpen}
      />

      <Modal visible={open} transparent animationType="slide" statusBarTranslucent>
        <View style={sh.overlay}>
          <Pressable style={sh.backdrop} onPress={() => setOpen(false)} />
          <View style={sh.sheet}>
            <SheetHeader title={label ?? 'Select Time'} onClose={() => setOpen(false)} />

            <FlatList
              ref={listRef}
              data={slots}
              keyExtractor={(item) => item.hhmm}
              numColumns={COLS}
              getItemLayout={(_, index) => ({
                length: SLOT_H,
                offset: TOP_PAD + Math.floor(index / COLS) * (SLOT_H + ROW_GAP),
                index,
              })}
              contentContainerStyle={tp.listContent}
              columnWrapperStyle={tp.row}
              style={{ maxHeight: 320 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = item.hhmm === value;
                return (
                  <Pressable
                    style={[tp.slot, active && tp.slotActive]}
                    onPress={() => { onChange(item.hhmm); setOpen(false); }}
                  >
                    <Text style={[tp.slotText, active && tp.slotTextActive]}>
                      {item.display}
                    </Text>
                  </Pressable>
                );
              }}
            />

            <View style={{ height: 20 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── DateTimeField ────────────────────────────────────────────────────────────

export type DateTimeFieldProps = {
  label:        string;
  date:         string;
  time:         string;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  optional?:    boolean;
  minDate?:     Date;
};

export function DateTimeField({
  label, date, time, onDateChange, onTimeChange, optional, minDate,
}: DateTimeFieldProps) {
  return (
    <View style={{ gap: Spacing.one + 2 }}>
      <Text style={p.label}>
        {label}
        {optional ? <Text style={p.optional}> (optional)</Text> : null}
      </Text>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <View style={{ flex: 1.55 }}>
          <DateField value={date} onChange={onDateChange} minDate={minDate} placeholder="Date" />
        </View>
        <View style={{ flex: 1 }}>
          <TimeField value={time} onChange={onTimeChange} minuteInterval={15} placeholder="Time" />
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// Field (tappable row)
const p = StyleSheet.create({
  label: {
    fontSize: 13, fontWeight: '600', color: Brand.creamSub,
    marginBottom: Spacing.one,
  },
  optional: { fontWeight: '400', color: Brand.creamMuted, fontSize: 12 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2,
    borderWidth: 1, borderColor: Brand.border2, borderRadius: Radius.md,
    paddingHorizontal: Spacing.three, paddingVertical: 11,
    backgroundColor: Brand.surface1,
  },
  fieldPressed: { opacity: 0.75 },
  fieldText:    { flex: 1, fontSize: 14, color: Brand.cream },
  placeholder:  { color: Brand.creamMuted },
});

// Bottom sheet
const sh = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: Brand.surface1,
    borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
    borderTopWidth: 1, borderTopColor: Brand.border1,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.three,
    borderBottomWidth: 1, borderBottomColor: Brand.border1,
  },
  title:    { flex: 1, fontSize: 15, fontWeight: '700', color: Brand.cream },
  closeBtn: { padding: 4 },
});

// Calendar grid
const cal = StyleSheet.create({
  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
  },
  monthNavBtn: {
    width: 36, height: 36, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Brand.surface2,
  },
  monthLabel: { fontSize: 15, fontWeight: '700', color: Brand.cream },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.one,
  },
  weekLabel: {
    flex: 1, textAlign: 'center',
    fontSize: 11, fontWeight: '700', color: Brand.creamMuted,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: Spacing.two,
  },
  cell: {
    width: '14.28%', aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.md,
  },
  cellSelected: { backgroundColor: Brand.primary },
  cellToday:    { backgroundColor: Brand.surface2 },
  cellDisabled: { opacity: 0.25 },
  cellText:     { fontSize: 14, fontWeight: '500', color: Brand.cream },
  cellTextSelected: { color: '#fff', fontWeight: '700' },
  cellTextToday:    { color: Brand.primary, fontWeight: '700' },
  cellTextDisabled: { color: Brand.creamMuted },
});

// Time slot grid
const tp = StyleSheet.create({
  listContent: { padding: Spacing.two, gap: Spacing.one + 2 },
  row:         { gap: Spacing.one + 2 },
  slot: {
    flex: 1, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.md, borderWidth: 1,
    borderColor: Brand.border1, backgroundColor: Brand.surface2,
  },
  slotActive:     { backgroundColor: Brand.primary, borderColor: Brand.primary },
  slotText:       { fontSize: 13, fontWeight: '500', color: Brand.creamSub },
  slotTextActive: { color: '#fff', fontWeight: '700' },
});
