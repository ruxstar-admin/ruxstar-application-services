import { StyleSheet, Text, View } from 'react-native';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import type { GigPackage, GigTier } from '@/types/gigs';
import { TIER_LABEL, deliveryLine, sortedPackages } from '../lib/gigs';

/** A gig's packages side by side as tabs, with the picked one's price, what's included, days and revisions. */
export function PackagePicker({ packages, tier, onChange }: { packages: readonly GigPackage[]; tier: GigTier; onChange: (tier: GigTier) => void }) {
  const sorted = sortedPackages(packages);
  const picked = sorted.find((p) => p.tier === tier) ?? sorted[0];
  if (!picked) return null;
  return (
    <View style={styles.wrap}>
      {sorted.length > 1 ? <SegmentedTabs options={sorted.map((p) => ({ key: p.tier, label: TIER_LABEL[p.tier] }))} value={picked.tier} onChange={onChange} /> : null}
      <View style={styles.card}>
        <View style={styles.head}>
          <Text style={styles.name}>{picked.name}</Text>
          <Text style={styles.price}>{money(picked.price)}</Text>
        </View>
        <Text style={styles.line}>{deliveryLine(picked)}</Text>
        <Text style={styles.description}>{picked.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  card: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text, flex: 1 },
  price: { ...Typography.heading, color: Brand.primarySoft },
  line: { ...Typography.caption, color: Brand.textMuted },
  description: { ...Typography.body, fontSize: 15, lineHeight: 22, color: Brand.text, marginTop: Spacing.one },
});
