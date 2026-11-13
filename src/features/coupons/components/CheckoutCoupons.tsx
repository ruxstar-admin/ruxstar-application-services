import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import type { AppliedCoupon, CouponOffer } from '@/types/coupon';
import { cleanCode } from '../lib/coupons';

interface CheckoutCouponsProps {
  /** Null until the order is priced. */
  offers: CouponOffer[] | null;
  applied: AppliedCoupon | null;
  discount: number;
  /** Why the code the customer tried can't be used. */
  problem: string | null;
  onApply: (code: string) => void;
  onRemove: () => void;
}

/** At checkout: the coupon on the order, a box for a code, and the offers the customer can tap. */
export function CheckoutCoupons({ offers, applied, discount, problem, onApply, onRemove }: CheckoutCouponsProps) {
  const [text, setText] = useState('');
  const others = (offers ?? []).filter((o) => o.code !== applied?.code);

  return (
    <View style={styles.container}>
      {applied ? (
        <View style={[styles.card, styles.applied]}>
          <Ionicons name="pricetag" size={18} color={Brand.success} />
          <View style={styles.flex}>
            <Text style={styles.strong}>{`${applied.code} applied`}</Text>
            <Text style={styles.muted}>{`You save ${money(discount)} · ${applied.label}`}</Text>
          </View>
          <TextLink
            label="Remove"
            onPress={() => {
              setText('');
              onRemove();
            }}
          />
        </View>
      ) : (
        <View style={styles.gap}>
          <View style={styles.pair}>
            <View style={styles.flex}>
              <InputField
                label="Coupon code"
                value={text}
                onChangeText={(t) => setText(cleanCode(t))}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={16}
                returnKeyType="done"
                onSubmitEditing={() => text && onApply(text)}
              />
            </View>
            <View style={styles.apply}>
              <PrimaryButton label="Apply" variant="outline" onPress={() => onApply(text)} disabled={!text} />
            </View>
          </View>
          {problem ? <Text style={styles.error}>{problem}</Text> : null}
        </View>
      )}

      {others.map((offer) => {
        const usable = !offer.problem;
        return (
          <Pressable
            key={offer.code}
            accessibilityRole="button"
            accessibilityState={{ disabled: !usable }}
            accessibilityLabel={`${offer.label}, code ${offer.code}${offer.problem ? `. ${offer.problem}` : ''}`}
            disabled={!usable}
            onPress={() => {
              setText('');
              onApply(offer.code);
            }}
            style={({ pressed }) => [styles.card, pressed && styles.pressed, !usable && styles.dim]}
          >
            <Ionicons name="pricetag-outline" size={18} color={usable ? Brand.primarySoft : Brand.textFaint} />
            <View style={styles.flex}>
              <Text style={styles.strong}>{offer.label}</Text>
              <Text style={styles.faint}>{[offer.code, offer.fundedBy === 'ruxstar' ? 'Ruxstar offer' : 'Shop offer', offer.terms].filter(Boolean).join(' · ')}</Text>
              {offer.problem ? <Text style={styles.muted}>{offer.problem}</Text> : null}
            </View>
            {usable ? <Text style={styles.save}>{`Save ${money(offer.discount)}`}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  flex: { flex: 1, gap: 2 },
  gap: { gap: Spacing.one },
  error: { ...Typography.caption, color: Brand.error },
  pair: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  apply: { width: 110 },
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
  applied: { borderColor: Brand.success },
  pressed: { opacity: 0.7 },
  dim: { opacity: 0.6 },
  strong: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted },
  faint: { ...Typography.caption, fontSize: 12, color: Brand.textFaint },
  save: { ...Typography.bodyStrong, fontSize: 14, color: Brand.success },
});
