import { useState } from 'react';
import { InputField } from '@/components/ui/InputField';
import { formatAadhaar } from '@/features/kyc/lib/validators';
import type { FieldDef } from '@/features/kyc/lib/flows';

interface FieldsStepProps {
  fields: FieldDef[];
  answers: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

/** One or more labelled inputs. Errors appear only after a field has been left, so typing never flashes them. */
export function FieldsStep({ fields, answers, onChange }: FieldsStepProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  return (
    <>
      {fields.map((field, i) => {
        const value = answers[field.key] ?? '';
        const shown = field.key === 'aadhaar' ? formatAadhaar(value) : value;
        return (
          <InputField
            key={field.key}
            label={field.label}
            value={shown}
            onChangeText={(text) => onChange(field.key, field.clean(text))}
            onBlur={() => setTouched((prev) => ({ ...prev, [field.key]: true }))}
            placeholder={field.placeholder}
            keyboardType={field.keyboard}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus={i === 0}
            error={touched[field.key] && value.length > 0 && !field.isValid(value) ? field.error : undefined}
          />
        );
      })}
    </>
  );
}
