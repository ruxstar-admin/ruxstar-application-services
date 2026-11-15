import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

export type Icon = keyof typeof Ionicons.glyphMap;

/** Section colours: the icon in its accent, on a soft wash of the same. */
export const TINT = {
  purple: { bg: 'rgba(180,92,242,0.18)', fg: Brand.primarySoft },
  blue: { bg: 'rgba(50,178,250,0.16)', fg: Brand.secondary },
  green: { bg: 'rgba(52,199,89,0.16)', fg: Brand.success },
  amber: { bg: 'rgba(255,176,32,0.16)', fg: Brand.warning },
} as const;
export type Tint = keyof typeof TINT;

export const GRID_GAP = Spacing.two;

/** One cell's width when `columns` cells and the gaps between them fill `available` points. */
export const cellWidth = (available: number, columns: number) => Math.floor((available - GRID_GAP * (columns - 1)) / columns);

/** A `TileCard`'s inner width: the screen less the list's side padding, and (unless flat) the card's own padding and border. */
export const tileCardInner = (screenWidth: number, flat?: boolean) => screenWidth - Spacing.three * 2 - (flat ? 0 : Spacing.three * 2 + 2);

/** A heading with a tinted icon over a grid: a rounded panel, or `flat` straight on the page with a divider above. */
export function TileCard({ title, icon, tint, flat, children }: { title: string; icon?: Icon; tint: Tint; flat?: boolean; children: ReactNode }) {
  return (
    <View style={flat ? styles.flat : styles.card}>
      <View style={styles.head} accessibilityRole="header">
        {icon ? (
          <View style={[styles.headIcon, { backgroundColor: TINT[tint].bg }]}>
            <Ionicons name={icon} size={16} color={TINT[tint].fg} />
          </View>
        ) : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.grid}>{children}</View>
    </View>
  );
}

/** A square icon card with a short label under it, like a payments app home. */
export function IconTile({ icon, label, tint, width, onPress }: { icon: Icon; label: string; tint: Tint; width: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed]}
    >
      <View style={[styles.tileBox, { height: Math.round(width * 0.82) }]}>
        <View style={[styles.tileIcon, { backgroundColor: TINT[tint].bg }]}>
          <Ionicons name={icon} size={22} color={TINT[tint].fg} />
        </View>
      </View>
      <Text style={styles.tileLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A card that opens a deeper screen: the area's icon and name, and one line on what is happening there. */
export function SectionTile({
  icon,
  label,
  line,
  tint,
  warn,
  width,
  onPress,
}: {
  icon: Icon;
  label: string;
  line?: string;
  tint: Tint;
  warn?: boolean;
  width: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={line ? `${label}: ${line}` : label}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.section, { width }, pressed && styles.pressed]}
    >
      <View style={[styles.tileIcon, { backgroundColor: TINT[tint].bg }]}>
        <Ionicons name={icon} size={22} color={TINT[tint].fg} />
      </View>
      <Text style={styles.sectionLabel} numberOfLines={2}>
        {label}
      </Text>
      {line ? (
        <Text style={[styles.metricLabel, warn && styles.warn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {line}
        </Text>
      ) : null}
    </Pressable>
  );
}

const VALUE_TONE = { plain: Brand.text, warn: Brand.warning, good: Brand.success, quiet: Brand.textMuted } as const;

/** Inside a `TileCard`: one number and what it counts. `warn` is for something waiting on Ruxstar. */
export function MetricTile({
  label,
  value,
  width,
  tone = 'plain',
  onPress,
}: {
  label: string;
  value: string;
  width: number;
  tone?: keyof typeof VALUE_TONE;
  onPress?: () => void;
}) {
  const body = (
    <>
      <Text style={[styles.value, { color: VALUE_TONE[tone] }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text style={styles.metricLabel} numberOfLines={2}>
        {label}
      </Text>
    </>
  );
  if (!onPress) {
    return (
      <View style={[styles.metric, { width }]} accessible accessibilityLabel={`${label}: ${value}`}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.metric, { width }, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.xl, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  flat: { gap: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  headIcon: { width: 28, height: 28, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.bodyStrong, color: Brand.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: GRID_GAP, rowGap: Spacing.three },
  pressed: { opacity: 0.7 },
  tile: { alignItems: 'center', gap: Spacing.two - 2 },
  tileBox: { alignSelf: 'stretch', borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  tileIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { ...Typography.caption, fontSize: 12, lineHeight: 16, color: Brand.text, textAlign: 'center' },
  metric: { gap: 2, paddingHorizontal: Spacing.two + 2, paddingVertical: Spacing.two + 2, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  value: { fontFamily: Typography.title.fontFamily, fontSize: 22 },
  metricLabel: { ...Typography.caption, fontSize: 12, lineHeight: 16, color: Brand.textMuted },
  section: { gap: Spacing.two, padding: Spacing.three, minHeight: 128, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  sectionLabel: { ...Typography.bodyStrong, color: Brand.text },
  warn: { color: Brand.warning, fontFamily: Typography.bodyStrong.fontFamily },
});
