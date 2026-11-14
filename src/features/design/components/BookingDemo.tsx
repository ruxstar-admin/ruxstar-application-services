import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BookingBar, DateStrip, Legend, PeopleForm, RefundLine, Roster, SlotGrid, VendorBoard } from '@/components/booking';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { boardKey, type BoardCell, type BoardColumn, type BoardRow } from '@/lib/booking/board';
import { istDayKey } from '@/lib/booking/days';
import { replacePerson, type PersonFields } from '@/lib/booking/people';
import { clockText, keepSelection, selectionSummary, type Slot, type SlotState } from '@/lib/booking/slots';

const COURTS = [
  { key: 'c1', label: 'Court 1' },
  { key: 'c2', label: 'Court 2' },
] as const;
const TURF_REFUNDS = [
  { hoursBefore: 6, percent: 100 },
  { hoursBefore: 2, percent: 50 },
];
const MONDAYS = [1];
const QUESTIONS = [{ id: 'size', label: 'T-shirt size', required: false }];
const ME = { name: 'Ravi Kumar', mobile: '9876543210' };
const STUDENTS = ['Aarav Shah', 'Diya Rao', 'Kabir Singh', 'Meera Iyer', 'Rohan Das', 'Sara Khan'].map((name, i) => ({ key: `s${i}`, name, subtitle: `Batch A · Roll ${i + 1}` }));

const pad = (n: number) => String(n).padStart(2, '0');

function demoSlots(court: string, day: string): Slot[] {
  const seed = Number(day.slice(-2)) + (court === 'c2' ? 3 : 0);
  return Array.from({ length: 17 }, (_, i) => {
    const hour = 6 + i;
    const peak = hour >= 18 && hour < 22;
    const state: SlotState = (hour + seed) % 7 === 0 ? 'booked' : hour === 13 ? 'blocked' : (hour + seed) % 5 === 0 ? 'few' : peak ? 'peak' : 'free';
    return { key: `${pad(hour)}:00`, start: `${pad(hour)}:00`, end: `${pad(hour + 1)}:00`, price: peak ? 120_000 : 80_000, state, ...(state === 'few' ? { left: 1 } : {}) };
  });
}

const BOARD_ROWS: BoardRow[] = Array.from({ length: 20 }, (_, i) => ({ key: `r${i}`, label: `Court ${i + 1}`, subtitle: i % 2 ? 'Cricket nets' : 'Football 5-a-side' }));
const BOARD_COLS: BoardColumn[] = Array.from({ length: 30 }, (_, i) => {
  const start = `${pad(6 + Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`;
  return { key: start, label: clockText(start) };
});

function demoCells(): Record<string, BoardCell> {
  const cells: Record<string, BoardCell> = {};
  BOARD_ROWS.forEach((row, r) =>
    BOARD_COLS.forEach((col, c) => {
      const n = (r * 7 + c * 3) % 11;
      if (n === 0) cells[boardKey(row.key, col.key)] = { state: 'booked', label: 'Ravi' };
      else if (n === 4) cells[boardKey(row.key, col.key)] = { state: 'blocked', label: 'Walk-in' };
      else if (n === 7) cells[boardKey(row.key, col.key)] = { state: 'held' };
    }),
  );
  return cells;
}

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.part}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

/** Dev preview of every shared booking piece with sample data, for the gallery and Settings. */
export function BookingDemo() {
  const [day, setDay] = useState(() => istDayKey(Date.now()));
  const [court, setCourt] = useState<(typeof COURTS)[number]['key']>('c1');
  const [picked, setPicked] = useState<string[]>([]);
  const [paying, setPaying] = useState(false);
  const [people, setPeople] = useState<PersonFields[]>([
    { key: 'a', name: '', phone: '', answers: {} },
    { key: 'b', name: '', phone: '', answers: {} },
  ]);
  const [cells, setCells] = useState(demoCells);
  const [tapped, setTapped] = useState('Tap a cell');
  const [present, setPresent] = useState<string[]>([]);

  const slots = useMemo(() => demoSlots(court, day), [court, day]);
  const changeDay = (next: string) => {
    setDay(next);
    setPicked([]);
  };
  const changeCourt = (next: (typeof COURTS)[number]['key']) => {
    setCourt(next);
    setPicked([]);
  };
  const selected = keepSelection(slots, picked);
  const summary = selectionSummary(slots, selected);

  const pay = () => {
    setPaying(true);
    setTimeout(() => setPaying(false), 1500);
  };

  const onCell = (row: BoardRow, col: BoardColumn) => {
    const key = boardKey(row.key, col.key);
    const cell = cells[key];
    setTapped(`${row.label} · ${col.label} · ${cell ? cell.state : 'free'}`);
    if (!cell || cell.state === 'blocked') setCells((all) => ({ ...all, [key]: cell ? { state: 'free' } : { state: 'blocked', label: 'Walk-in' } }));
  };

  return (
    <>
      <Part title="Date strip (Mondays closed)">
        <View style={styles.bleed}>
          <DateStrip value={day} onChange={changeDay} closedWeekdays={MONDAYS} />
        </View>
      </Part>
      <Part title="Court chips + slot grid">
        <View style={styles.bleed}>
          <ChoiceChips options={COURTS} value={court} onChange={changeCourt} secondary />
        </View>
        <SlotGrid slots={slots} selected={selected} onChange={setPicked} />
        <Legend />
      </Part>
      <Part title="Refund line + booking bar (pinned at the bottom on real screens)">
        <View style={styles.frame}>
          <RefundLine tiers={TURF_REFUNDS} />
          <BookingBar summary={summary.text} total={summary.total} onPay={pay} loading={paying} />
        </View>
      </Part>
      <Part title="People form">
        <PeopleForm
          people={people}
          heading={(_, i) => `Player ${i + 1}`}
          questions={QUESTIONS}
          me={ME}
          onChangePerson={(next) => setPeople((all) => replacePerson(all, next))}
        />
      </Part>
      <Part title="Vendor board (20 × 30)">
        <Text style={styles.note}>{tapped}</Text>
        <VendorBoard rows={BOARD_ROWS} columns={BOARD_COLS} cells={cells} onCellPress={onCell} corner="Court" />
        <Legend items={['free', 'booked', 'held', 'blocked']} />
      </Part>
      <Part title="Roster">
        <Roster people={STUDENTS} ticked={present} onChange={setPresent} />
      </Part>
    </>
  );
}

const styles = StyleSheet.create({
  part: { gap: Spacing.two, marginTop: Spacing.four },
  title: { ...Typography.overline, color: Brand.textMuted },
  bleed: { marginHorizontal: -Spacing.three },
  frame: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.bg },
  note: { ...Typography.caption, color: Brand.textMuted },
});
