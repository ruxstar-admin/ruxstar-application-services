import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useStableHandler } from '@/hooks/use-stable-handler';
import { Feedback } from '@/lib/haptics';
import { Tick } from './Tick';

export interface RosterPerson {
  key: string;
  name: string;
  /** "Batch A · Class 6", "2 tickets · VIP". */
  subtitle?: string;
}

interface RosterProps {
  people: readonly RosterPerson[];
  /** Keys of the people ticked. */
  ticked: readonly string[];
  onChange: (ticked: string[]) => void;
  /** The word for a tick: "present" for attendance, "arrived" for check-ins. */
  mark?: string;
  disabled?: boolean;
}

/** Big rows with a tick box each and "Mark all present", for class attendance and check-in lists. */
export function Roster({ people, ticked, onChange, mark = 'present', disabled }: RosterProps) {
  const on = useMemo(() => new Set(ticked), [ticked]);
  const done = people.filter((p) => on.has(p.key)).length;
  const all = people.length > 0 && done === people.length;

  const toggle = useStableHandler((key: string) => {
    onChange(on.has(key) ? ticked.filter((k) => k !== key) : [...ticked, key]);
  });

  return (
    <View style={styles.list}>
      <View style={styles.head}>
        <Text style={styles.count} accessibilityLiveRegion="polite">{`${done} of ${people.length} ${mark}`}</Text>
        {people.length ? <Chip label={all ? 'Untick all' : `Mark all ${mark}`} disabled={disabled} onPress={() => onChange(all ? [] : people.map((p) => p.key))} /> : null}
      </View>
      {people.map((p) => (
        <RosterRow key={p.key} person={p} checked={on.has(p.key)} disabled={disabled} onToggle={toggle} />
      ))}
    </View>
  );
}

const RosterRow = memo(function RosterRow({ person, checked, disabled, onToggle }: { person: RosterPerson; checked: boolean; disabled?: boolean; onToggle: (key: string) => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={person.subtitle ? `${person.name}, ${person.subtitle}` : person.name}
      accessibilityState={{ checked, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        Feedback.select();
        onToggle(person.key);
      }}
      style={({ pressed }) => [styles.row, checked && styles.rowOn, pressed && styles.pressed]}
    >
      <Avatar name={person.name} size={40} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {person.name}
        </Text>
        {person.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {person.subtitle}
          </Text>
        ) : null}
      </View>
      <Tick checked={checked} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  count: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 64,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  rowOn: { borderColor: Brand.primaryDeep },
  pressed: { opacity: 0.75 },
  text: { flex: 1, gap: 2 },
  name: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  subtitle: { ...Typography.caption, color: Brand.textMuted },
});
