import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { useCan, type Need } from '../access';

/** The API's own message when it sent one (they are written for people), otherwise a connection hint. */
export const errorText = (err: unknown) =>
  err instanceof ApiError && err.status > 0 && err.kind !== 'server' ? err.message : 'Could not reach Ruxstar. Check your connection and try again.';

/** A tab's root: the console name above the section title. */
export function ConsoleScreen({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <Text style={styles.overline}>Ruxstar console</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </SafeAreaView>
  );
}

export function Card({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  if (!onPress) return <View style={styles.card}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

export function Fact({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={[styles.factValue, warn && styles.warn]} selectable>
        {value}
      </Text>
    </View>
  );
}

export function Facts({ children }: { children: ReactNode }) {
  return <View style={styles.facts}>{children}</View>;
}

/** A tappable person or case: photo, two lines, a status on the right. Sits inside a `Card`. */
export function Row({
  name,
  avatarUrl,
  title,
  subtitle,
  right,
  onPress,
}: {
  name: string;
  avatarUrl?: string | null;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={() => {
        Feedback.tap();
        onPress?.();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar name={name || '?'} uri={avatarUrl ?? undefined} size={44} />
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.muted} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={Brand.textMuted} /> : null}
    </Pressable>
  );
}

export function Note({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'danger' }) {
  return (
    <View style={[styles.note, tone === 'danger' && styles.noteDanger]}>
      <Text style={[styles.noteText, tone === 'danger' && styles.dangerText]}>{children}</Text>
    </View>
  );
}

/** Renders children only when this person's access covers `need`. */
export function Needs({ need, children }: { need: Need; children: ReactNode }) {
  const allowed = useCan(need);
  const router = useRouter();
  if (allowed) return <>{children}</>;
  return (
    <SafeAreaView style={styles.container}>
      <EmptyState icon="lock-closed-outline" title="Not part of your access" message="Ask an admin if you need this section." actionLabel="Go back" onAction={() => router.back()} />
    </SafeAreaView>
  );
}

/** Under a paged list: a spinner while the next page loads, or a way to try again when it failed. */
export function ListFooter({ list }: { list: { loadingMore: boolean; moreFailed: boolean; loadMore: () => void } }) {
  if (list.loadingMore) return <ActivityIndicator color={Brand.primarySoft} style={consoleStyles.footer} />;
  if (!list.moreFailed) return null;
  return (
    <View style={[consoleStyles.footer, styles.center]}>
      <TextLink muted label="Couldn't load more. Tap to try again" onPress={list.loadMore} />
    </View>
  );
}

export function Section({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export { ReasonSheet } from '@/components/ui/ReasonSheet';

export const consoleStyles = StyleSheet.create({
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.two },
  pad: { paddingHorizontal: Spacing.three },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  footer: { paddingVertical: Spacing.three },
  muted: { ...Typography.caption, color: Brand.textMuted },
  body: { ...Typography.body, color: Brand.text },
});

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  container: { flex: 1, backgroundColor: Brand.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  overline: { ...Typography.overline, color: Brand.textMuted },
  title: { ...Typography.title, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  pressed: { opacity: 0.7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 52 },
  rowTitle: { ...Typography.bodyStrong, color: Brand.text },
  facts: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.three },
  fact: { width: '50%', paddingRight: Spacing.two, gap: 2 },
  factLabel: { ...Typography.caption, color: Brand.textMuted },
  factValue: { ...Typography.body, color: Brand.text },
  warn: { color: Brand.warning },
  note: { padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  noteDanger: { backgroundColor: 'rgba(255,69,58,0.12)' },
  noteText: { ...Typography.caption, color: Brand.text },
  dangerText: { color: Brand.error },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three },
  center: { alignItems: 'center' },
});
