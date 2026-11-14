/** One person on a booking card: a ticket holder, a player, a student or a guest. */
export interface PersonFields {
  key: string;
  name: string;
  phone: string;
  /** Answers to the business's extra questions, by question id. */
  answers: Record<string, string>;
}

/** An extra question the business asks for every person. */
export interface PersonQuestion {
  id: string;
  label: string;
  required: boolean;
}

const PHONE = /^[6-9]\d{9}$/;

/** A typed Indian mobile as 10 digits, without +91 or a leading 0. */
export const cleanPhone = (text: string) => text.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');

/** What's wrong on one person's card, by field, in words. Pass `phone: false` when the card has no number (young students). */
export function personErrors(person: PersonFields, questions: readonly PersonQuestion[], options: { phone?: boolean } = {}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (person.name.trim().length < 2) errors.name = 'Add their name as on an ID';
  if (options.phone !== false && !PHONE.test(cleanPhone(person.phone))) errors.phone = 'A 10-digit mobile number';
  for (const q of questions) if (q.required && !person.answers[q.id]?.trim()) errors[q.id] = 'Needed';
  return errors;
}

/** The list with one edited card swapped in by key: `setPeople((all) => replacePerson(all, next))`. */
export const replacePerson = <P extends PersonFields>(all: readonly P[], next: P): P[] => all.map((p) => (p.key === next.key ? next : p));

/** True when the card already holds the signed-in person's own name and number. */
export function isSameAsMe(person: Pick<PersonFields, 'name' | 'phone'>, me: { name: string | null; mobile: string | null }): boolean {
  if (!me.name?.trim()) return false;
  return person.name.trim() === me.name.trim() && cleanPhone(person.phone) === cleanPhone(me.mobile ?? '');
}
