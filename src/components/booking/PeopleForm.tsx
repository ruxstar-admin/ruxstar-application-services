import { Pressable, StyleSheet, Text, View } from 'react-native';
import { InputField } from '@/components/ui/InputField';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { isSameAsMe, type PersonFields, type PersonQuestion } from '@/lib/booking/people';
import { Feedback } from '@/lib/haptics';
import { Tick } from './Tick';

type Me = { name: string | null; mobile: string | null };

interface CardOptions {
  questions: readonly PersonQuestion[];
  /** Under the mobile field, e.g. "For their ticket. Only the organiser sees it." */
  phoneHint?: string;
  /** False for cards without a number, like young students. */
  withPhone?: boolean;
}

interface PersonCardProps<P extends PersonFields> extends CardOptions {
  person: P;
  /** "Ticket 1 · General", "Player 2", "Student 1". */
  heading: string;
  errors: Record<string, string>;
  onChange: (next: P) => void;
  /** Shows "Same as me", which fills or clears the name and number. */
  me?: Me;
}

/** One person: their name, a mobile number and the business's extra questions. */
export function PersonCard<P extends PersonFields>({ person, heading, questions, errors, onChange, me, phoneHint, withPhone = true }: PersonCardProps<P>) {
  const same = me ? isSameAsMe(person, me) : false;
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{heading}</Text>
      {me?.name ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Same as me"
          accessibilityHint="Fills in your own name and number"
          accessibilityState={{ checked: same }}
          onPress={() => {
            Feedback.select();
            onChange(same ? { ...person, name: '', phone: '' } : { ...person, name: me.name ?? '', phone: me.mobile ?? '' });
          }}
          style={styles.same}
        >
          <Tick checked={same} />
          <Text style={styles.sameText}>Same as me</Text>
        </Pressable>
      ) : null}
      <InputField
        label="Name"
        value={person.name}
        onChangeText={(name) => onChange({ ...person, name })}
        maxLength={60}
        autoComplete="name"
        autoCapitalize="words"
        error={errors.name}
      />
      {withPhone ? (
        <InputField
          label="Mobile number"
          value={person.phone}
          onChangeText={(phone) => onChange({ ...person, phone })}
          keyboardType="phone-pad"
          maxLength={14}
          autoComplete="tel"
          hint={phoneHint}
          error={errors.phone}
        />
      ) : null}
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

interface PeopleFormProps<P extends PersonFields> extends CardOptions {
  people: readonly P[];
  heading: (person: P, index: number) => string;
  /** One edited card; merge it with `replacePerson`. */
  onChangePerson: (next: P) => void;
  /** Errors for each card by index; leave out until the person presses Continue. */
  errors?: readonly Record<string, string>[];
  /** The signed-in person, for "Same as me" on the first card. */
  me?: Me;
}

const NONE: Record<string, string> = {};

/** One card per ticket, player, student or guest, with "Same as me" on the first when `me` is given. */
export function PeopleForm<P extends PersonFields>({ people, heading, onChangePerson, errors, me, ...options }: PeopleFormProps<P>) {
  return (
    <>
      {people.map((p, i) => (
        <PersonCard key={p.key} person={p} heading={heading(p, i)} errors={errors?.[i] ?? NONE} onChange={onChangePerson} me={i === 0 ? me : undefined} {...options} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  heading: { ...Typography.bodyStrong, fontSize: 15, color: Brand.primarySoft },
  same: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  sameText: { ...Typography.body, fontSize: 15, color: Brand.text },
});
