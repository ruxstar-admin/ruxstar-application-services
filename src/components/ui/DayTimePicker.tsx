import { useMemo } from 'react';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { hourSlots, upcomingDays } from '@/lib/dates';

interface DayPickerProps {
  value: string | undefined;
  onChange: (day: string) => void;
  /** How many days from today to offer. */
  days?: number;
  /** Days before this `YYYY-MM-DD` are hidden (e.g. a check-out cannot precede check-in). */
  from?: string;
}

/** Horizontal strip of upcoming days; the value is a `YYYY-MM-DD` key. */
export function DayPicker({ value, onChange, days = 21, from }: DayPickerProps) {
  const options = useMemo(() => upcomingDays(days).filter((d) => !from || d.key >= from), [days, from]);
  return <ChoiceChips options={options} value={value as string} onChange={onChange} />;
}

interface TimePickerProps {
  value: string | undefined;
  onChange: (time: string) => void;
  startHour?: number;
  endHour?: number;
}

/** Horizontal strip of hourly slots; the value is `HH:00`. */
export function TimePicker({ value, onChange, startHour = 6, endHour = 22 }: TimePickerProps) {
  const options = useMemo(() => hourSlots(startHour, endHour), [startHour, endHour]);
  return <ChoiceChips options={options} value={value as string} onChange={onChange} />;
}
