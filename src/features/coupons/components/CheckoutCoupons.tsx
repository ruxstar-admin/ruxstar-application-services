import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InputField } from '@/components/ui/InputField';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { Feedback } from '@/lib/haptics';
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
        <InputField
          label="Coupon code"
          value={text}
          onChangeText={(t) => setText(cleanCode(t))}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={16}
          returnKeyType="done"
          onSubmitEditing={() => text && onApply(text)}
          error={problem ?? undefined}
          accessory={
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !text }}
              disabled={!text}
              hitSlop={10}
              onPress={() => {
                Feedback.tap();
                onApply(text);
              }}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={[styles.applyLabel, !text && styles.applyOff]}>Apply</Text>
            </Pressable>
          }
        />
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
  applyLabel: { ...Typography.bodyStrong, fontSize: 15, color: Brand.primarySoft },
  applyOff: { color: Brand.textFaint },
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
