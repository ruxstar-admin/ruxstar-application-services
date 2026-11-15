import { useMemo } from 'react';
import { SelectField } from '@/components/ui/SelectField';

interface KeyedSelectFieldProps {
  label: string;
  value: string;
  options: readonly { key: string; label: string }[];
  onChange: (key: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  /** How to show a value that isn't among the options, e.g. a saved day further ahead. */
  fallback?: (value: string) => string;
}

/** A day, a time or any keyed choice from a searchable sheet; labels go in, keys come out. */
export function KeyedSelectField({ label, value, options, onChange, error, hint, disabled, fallback }: KeyedSelectFieldProps) {
  const byLabel = useMemo(() => new Map(options.map((o) => [o.label, o.key])), [options]);
  const shown = options.find((o) => o.key === value)?.label ?? (value ? (fallback ? fallback(value) : value) : '');
  return (
    <SelectField
      label={label}
      value={shown}
      options={options.map((o) => o.label)}
      onChange={(l) => onChange(byLabel.get(l) ?? value)}
      placeholder="Choose"
      error={error}
      hint={hint}
      disabled={disabled}
    />
  );
}
