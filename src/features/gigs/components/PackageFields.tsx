import { StyleSheet, Text, View } from 'react-native';
import { InputField } from '@/components/ui/InputField';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { rupeeInput } from '@/features/vendor/lib/pod';
import type { GigsRules } from '@/types/gigs';
import type { PackageDraft } from '../lib/forms';
import { TIER_LABEL, priceRangeText } from '../lib/gigs';

/** One package of a gig being edited: its name, what's included, price, days and revisions. */
export function PackageFields({
  pack,
  rules,
  errors,
  onChange,
  onRemove,
}: {
  pack: PackageDraft;
  rules: Pick<GigsRules, 'minPrice' | 'maxPrice' | 'minDays' | 'maxDays' | 'maxRevisions'>;
  errors: Record<string, string | undefined>;
  onChange: (patch: Partial<PackageDraft>) => void;
  /** Only the last package can go, so the tiers stay in order. */
  onRemove: (() => void) | null;
}) {
  const err = (field: keyof PackageDraft) => errors[`${pack.tier}.${field}`];
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.tier}>{TIER_LABEL[pack.tier]}</Text>
        {onRemove ? <TextLink muted label="Remove" onPress={onRemove} /> : null}
      </View>
      <InputField label="Name (optional)" value={pack.name} onChangeText={(v) => onChange({ name: v })} maxLength={40} placeholder={TIER_LABEL[pack.tier]} error={err('name')} />
      <InputField
        label="What’s included"
        value={pack.description}
        onChangeText={(v) => onChange({ description: v })}
        multiline
        maxLength={600}
        showCount
        placeholder="Like “1 logo concept, PNG and SVG files”"
        error={err('description')}
      />
      <InputField
        label="Price (₹)"
        value={pack.price}
        onChangeText={(v) => onChange({ price: rupeeInput(v) })}
        keyboardType="decimal-pad"
        hint={priceRangeText(rules.minPrice, rules.maxPrice)}
        error={err('price')}
      />
      <View style={styles.pair}>
        <View style={styles.half}>
          <InputField
            label="Days to deliver"
            value={pack.deliveryDays}
            onChangeText={(v) => onChange({ deliveryDays: v.replace(/\D/g, '') })}
            keyboardType="number-pad"
            maxLength={3}
            error={err('deliveryDays')}
          />
        </View>
        <View style={styles.half}>
          <InputField
            label="Revisions"
            value={pack.revisions}
            onChangeText={(v) => onChange({ revisions: v.replace(/\D/g, '') })}
            keyboardType="number-pad"
            maxLength={2}
            error={err('revisions')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tier: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  pair: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
});
