import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { dateKey, formatDay } from '@/lib/dates';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import type { CouponPatch, ManagedCoupon } from '@/types/coupon';
import { draftErrors, draftOf, patchOf, perCustomerLine, STATE, usesLine } from '../lib/coupons';
import { CouponFields } from './CouponFields';

const errorText = (err: unknown) =>
  err instanceof ApiError && err.status > 0 && err.kind !== 'server' ? err.message : 'Could not reach Ruxstar. Check your connection and try again.';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

interface CouponCardProps {
  coupon: ManagedCoupon;
  /** Change its dates, limits and (for vendors) shops. */
  canEdit: boolean;
  /** Switch it off or on. */
  canSwitch: boolean;
  /** The vendor's print shops, when they choose where it works. */
  shops?: { id: string; name: string }[];
  /** The Ruxstar team sees whose coupon it is. */
  showVendor?: boolean;
  save: (patch: CouponPatch) => Promise<ManagedCoupon>;
  onSaved: (after: ManagedCoupon) => void;
}

/** One coupon: its code and state, everything about it when opened, and changing it. */
export function CouponCard({ coupon: c, canEdit, canSwitch, shops, showVendor, save, onSaved }: CouponCardProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => draftOf(c));
  const [busy, setBusy] = useState<'save' | 'switch' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const state = STATE[c.state];
  const errors = draftErrors(draft, { creating: false, needsShops: !!shops, today: dateKey(new Date()) });
  const patch = patchOf(draft, c, !!shops);
  const changed = Object.keys(patch).length > 0;
  /** The team only switches a vendor's coupon back on if the team switched it off; a vendor can't undo the team. */
  const switchable = canSwitch && (showVendor ? c.fundedBy === 'ruxstar' || c.active || c.stoppedByRuxstar : !c.stoppedByRuxstar);

  const run = async (kind: 'save' | 'switch', body: CouponPatch) => {
    setBusy(kind);
    setError(null);
    try {
      const after = await save(body);
      Feedback.success();
      setEditing(false);
      setDraft(draftOf(after));
      onSaved(after);
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          Feedback.tap();
          setOpen(!open);
        }}
        style={({ pressed }) => [styles.head, pressed && styles.pressed]}
      >
        <View style={styles.flex}>
          <Text style={styles.code}>{c.code}</Text>
          <Text style={styles.muted} numberOfLines={1}>{`${c.label} · ${usesLine(c)}`}</Text>
        </View>
        <Badge label={state.label} tone={state.tone} />
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Brand.textMuted} />
      </Pressable>

      {open ? (
        <View style={styles.body}>
          {editing ? (
            <CouponFields draft={draft} onChange={setDraft} errors={errors} creating={false} canMoveStart={c.state === 'scheduled'} shops={shops} />
          ) : (
            <View style={styles.facts}>
              {showVendor && c.vendor ? <Fact label="Vendor" value={c.vendor.name} /> : null}
              <Fact label="Works at" value={c.businesses.length ? c.businesses.map((b) => b.name).join(', ') : 'Every print shop'} />
              <Fact label="Smallest order" value={c.minOrder ? money(c.minOrder) : 'None'} />
              <Fact label="Starts" value={c.startsAt ? formatDay(c.startsAt) : 'When made'} />
              <Fact label="Ends" value={c.endsAt ? formatDay(c.endsAt) : 'No end date'} />
              <Fact label="Total uses" value={c.limit !== null ? `${c.used} of ${c.limit}` : `${c.used}, no limit`} />
              <Fact label="Per customer" value={perCustomerLine(c)} />
              <Fact label="First order only" value={c.firstOrderOnly ? 'Yes' : 'No'} />
              <Fact label="At checkout" value={c.listed ? 'Shown' : 'Code only'} />
              <Fact label="Paid by" value={c.fundedBy === 'ruxstar' ? 'Ruxstar' : 'The vendor'} />
            </View>
          )}
          {c.stoppedByRuxstar ? (
            <Text style={styles.note}>{showVendor ? 'Ruxstar switched this off. The vendor can’t switch it back on.' : 'Ruxstar switched this coupon off. Contact Ruxstar support to use it again.'}</Text>
          ) : null}
          {error ? <ErrorBanner message={error} /> : null}
          {editing ? (
            <>
              <PrimaryButton label="Save changes" onPress={() => run('save', patch)} loading={busy === 'save'} disabled={!changed || Object.keys(errors).length > 0 || busy !== null} />
              <PrimaryButton
                label="Cancel"
                variant="outline"
                onPress={() => {
                  setEditing(false);
                  setDraft(draftOf(c));
                }}
                disabled={busy !== null}
              />
            </>
          ) : (
            <View style={styles.actions}>
              {canEdit ? (
                <View style={styles.flex}>
                  <PrimaryButton
                    label="Change"
                    variant="outline"
                    onPress={() => {
                      setDraft(draftOf(c));
                      setEditing(true);
                    }}
                    disabled={busy !== null}
                  />
                </View>
              ) : null}
              {switchable ? (
                <View style={styles.flex}>
                  <PrimaryButton
                    label={c.active ? 'Switch off' : 'Switch on'}
                    variant="outline"
                    onPress={() => run('switch', { active: !c.active })}
                    loading={busy === 'switch'}
                    disabled={busy !== null}
                  />
                </View>
              ) : null}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, gap: Spacing.two },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  pressed: { opacity: 0.7 },
  flex: { flex: 1, gap: 2 },
  code: { ...Typography.bodyStrong, color: Brand.text, letterSpacing: 1 },
  muted: { ...Typography.caption, color: Brand.textMuted },
  body: { gap: Spacing.three, paddingTop: Spacing.two },
  facts: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.three },
  fact: { width: '50%', paddingRight: Spacing.two, gap: 2 },
  factLabel: { ...Typography.caption, color: Brand.textMuted },
  factValue: { ...Typography.body, color: Brand.text },
  note: { ...Typography.caption, color: Brand.warning },
  actions: { flexDirection: 'row', gap: Spacing.two },
});
