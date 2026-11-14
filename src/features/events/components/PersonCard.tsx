import { StyleSheet, Text, View } from 'react-native';
import { InputField } from '@/components/ui/InputField';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import type { EventQuestion } from '@/types/events';
import type { PersonDraft } from '../lib/events';

interface PersonCardProps {
  person: PersonDraft;
  /** "Ticket 1 · General" or "Player 2". */
  heading: string;
  questions: EventQuestion[];
  errors: Record<string, string>;
  onChange: (next: PersonDraft) => void;
}

/** One ticket holder: the name the gate sees, a number for their ticket, and the organiser's questions. */
export function PersonCard({ person, heading, questions, errors, onChange }: PersonCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{heading}</Text>
      <InputField
        label="Name"
        value={person.name}
        onChangeText={(name) => onChange({ ...person, name })}
        maxLength={60}
        autoComplete="name"
        autoCapitalize="words"
        error={errors.name}
      />
      <InputField
        label="Mobile number"
        value={person.phone}
        onChangeText={(phone) => onChange({ ...person, phone })}
        keyboardType="phone-pad"
        maxLength={14}
        autoComplete="tel"
        hint="For their ticket. Only the organiser sees it."
        error={errors.phone}
      />
      {questions.map((q) => (
        <InputField
          key={q.id}
          label={q.required ? q.label : `${q.label} (optional)`}
          value={person.answers[q.id] ?? ''}
          onChangeText={(answer) => onChange({ ...person, answers: { ...person.answers, [q.id]: answer } })}
          maxLength={200}
          error={errors[q.id]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  heading: { ...Typography.bodyStrong, fontSize: 15, color: Brand.primarySoft },
});
