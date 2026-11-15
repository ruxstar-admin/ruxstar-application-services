import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { Feedback } from '@/lib/haptics';

type Icon = keyof typeof Ionicons.glyphMap;

/** An icon and a line or two, in a facts card. */
export function Fact({ icon, title, detail }: { icon: Icon; title: string; detail?: string | null }) {
  return (
    <View style={styles.fact}>
      <View style={styles.factIcon}>
        <Ionicons name={icon} size={18} color={Brand.primarySoft} />
      </View>
      <View style={styles.factText}>
        <Text style={styles.factTitle}>{title}</Text>
        {detail ? <Text style={styles.small}>{detail}</Text> : null}
      </View>
    </View>
  );
}

export function Facts({ children }: { children: ReactNode }) {
  return <View style={styles.facts}>{children}</View>;
}

const NOTICE_ICON = { info: 'information-circle-outline', warning: 'alert-circle-outline', error: 'close-circle-outline', success: 'checkmark-circle-outline' } as const;
const NOTICE_COLOUR = { info: Brand.textMuted, warning: Brand.warning, error: Brand.error, success: Brand.success } as const;

/** A tinted line that tells about a change: cancelled, moved, taken down. */
export function Notice({ tone = 'info', text }: { tone?: keyof typeof NOTICE_ICON; text: string }) {
  return (
    <View style={styles.notice} accessibilityRole="text">
      <Ionicons name={NOTICE_ICON[tone]} size={20} color={NOTICE_COLOUR[tone]} />
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

/** A label and an amount on a price summary. */
export function PriceLine({ label, amount, strong, minus }: { label: string; amount: number; strong?: boolean; minus?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={strong ? styles.strong : styles.lineLabel}>{label}</Text>
      <Text style={strong ? styles.strong : styles.lineAmount}>{amount === 0 && !minus ? 'Free' : `${minus ? '− ' : ''}${money(amount)}`}</Text>
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export const Divider = () => <View style={styles.divider} />;

export function Section({ title }: { title: string }) {
  return (
    <Text style={styles.section} accessibilityRole="header">
      {title}
    </Text>
  );
}

/** A choice in a list with a round tick, for picking one batch or one demo class. */
export function PickCard({
  title,
  lines,
  right,
  picked,
  disabled,
  note,
  onPress,
}: {
  title: string;
  lines: string[];
  right?: string;
  picked: boolean;
  disabled?: boolean;
  /** Why it can't be picked, or a warning. */
  note?: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: picked, disabled: !!disabled }}
      accessibilityLabel={[title, ...lines, right, note].filter(Boolean).join(', ')}
      disabled={disabled}
      onPress={() => {
        Feedback.select();
        onPress();
      }}
      style={({ pressed }) => [styles.pick, picked && styles.pickOn, disabled && styles.off, pressed && styles.pressed]}
    >
      <Ionicons name={picked ? 'radio-button-on' : 'radio-button-off'} size={22} color={picked ? Brand.primarySoft : Brand.textMuted} />
      <View style={styles.pickText}>
        <Text style={styles.strong}>{title}</Text>
        {lines.map((l) => (
          <Text key={l} style={styles.small}>
            {l}
          </Text>
        ))}
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
      {right ? <Text style={styles.right}>{right}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fact: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  factIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,92,242,0.14)' },
  factText: { flex: 1, gap: 2, paddingTop: 2 },
  factTitle: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  facts: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  small: { ...Typography.caption, color: Brand.textMuted },
  notice: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  noticeText: { ...Typography.caption, fontSize: 14, color: Brand.text, flex: 1 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  lineLabel: { ...Typography.body, fontSize: 15, color: Brand.textMuted, flex: 1 },
  lineAmount: { ...Typography.body, fontSize: 15, color: Brand.text },
  strong: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Brand.border, marginVertical: Spacing.one },
  section: { ...Typography.overline, fontSize: 12, color: Brand.textMuted, marginTop: Spacing.three },
  pick: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    minHeight: 64,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  pickOn: { borderColor: Brand.primary },
  off: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  pickText: { flex: 1, gap: 2 },
  note: { ...Typography.caption, color: Brand.warning },
  right: { ...Typography.bodyStrong, fontSize: 15, color: Brand.primarySoft },
});
