import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import type { Business } from '@/types/business';

interface OpenAllCardProps {
  openable: Business[];
  busy: boolean;
  onSetAll: (open: boolean) => void;
}

/** One switch for every business that can open. Mixed shows "2 of 3 open"; the switch then opens the rest. */
export function OpenAllCard({ openable, busy, onSetAll }: OpenAllCardProps) {
  const total = openable.length;
  const open = openable.filter((b) => b.open).length;
  const allOpen = total > 0 && open === total;

  if (!total) {
    return (
      <View style={styles.card}>
        <Ionicons name="storefront-outline" size={24} color={Brand.textMuted} />
        <View style={styles.text}>
          <Text style={styles.title}>Nothing to open yet</Text>
          <Text style={styles.subtitle}>Publish a business to open and close it here.</Text>
        </View>
      </View>
    );
  }

  const title = allOpen ? (total === 1 ? 'Open' : 'All open') : open === 0 ? (total === 1 ? 'Closed' : 'All closed') : `${open} of ${total} open`;
  const subtitle = allOpen ? 'Customers can order and book' : open === 0 ? 'Customers see your businesses as closed' : 'Turn on to open the rest';

  return (
    <View style={[styles.card, allOpen && styles.cardOpen]}>
      <View style={[styles.dot, { backgroundColor: allOpen ? Brand.success : open ? Brand.warning : Brand.textFaint }]} />
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {open > 0 && !allOpen ? <TextLink label="Close all" muted onPress={() => onSetAll(false)} /> : null}
      </View>
      {busy ? <ActivityIndicator size="small" color={Brand.textMuted} /> : null}
      <Switch
        value={allOpen}
        onValueChange={onSetAll}
        disabled={busy}
        trackColor={{ false: Brand.disabled, true: Brand.success }}
        thumbColor={Brand.text}
        accessibilityLabel={total === 1 ? 'Business open' : 'All businesses open'}
        style={styles.switch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  cardOpen: { borderColor: 'rgba(52,199,89,0.45)' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  text: { flex: 1, gap: 2, alignItems: 'flex-start' },
  title: { ...Typography.heading, color: Brand.text },
  subtitle: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  switch: { transform: [{ scale: 1.15 }] },
});
