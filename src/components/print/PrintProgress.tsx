/**
 * PrintProgress — compact "Step X of 5" chip with expandable step list.
 * Theme-aware — uses useTheme() throughout.
 */

import { useState } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PrintOrderStatus } from '@/types/print';

type Role = 'customer' | 'vendor';

type StepDef = {
  key:   string;
  label: string;
  sub:   Record<Role, string>;
};

const STEPS: StepDef[] = [
  {
    key:   'accepted',
    label: 'Awaiting payment',
    sub: {
      customer: 'Pay now to confirm your order.',
      vendor:   'Waiting for the customer to pay.',
    },
  },
  {
    key:   'confirmed',
    label: 'Payment confirmed',
    sub: {
      customer: 'Your shop is getting started.',
      vendor:   'Time to start production.',
    },
  },
  {
    key:   'in_production',
    label: 'In production',
    sub: {
      customer: 'Your order is on the press.',
      vendor:   'Mark ready once printed.',
    },
  },
  {
    key:   'ready',
    label: 'Ready',
    sub: {
      customer: 'Your vendor will hand it over soon.',
      vendor:   'Complete once the customer has it.',
    },
  },
  {
    key:   'completed',
    label: 'Completed',
    sub: {
      customer: 'Thanks for printing with Ruxstar.',
      vendor:   'Nice work — payment settled.',
    },
  },
];

const STEP_INDEX: Record<string, number> = {
  accepted:        0,
  pending_payment: 0,
  confirmed:       1,
  in_production:   2,
  ready:           3,
  completed:       4,
};

// ─── Cancelled banner ─────────────────────────────────────────────────────────

function CancelledBanner({ status }: { status: string }) {
  const { brand } = useTheme();
  const expired = status === 'expired';
  return (
    <View style={[s.cancelBox, { backgroundColor: `${brand.error}08`, borderColor: `${brand.error}20` }]}>
      <Ionicons name="close-circle-outline" size={18} color={brand.error} />
      <View style={{ flex: 1 }}>
        <Text style={[s.cancelTitle, { color: brand.error }]}>
          Order {expired ? 'expired' : 'cancelled'}
        </Text>
        <Text style={[s.cancelSub, { color: brand.creamSub }]}>
          {expired ? 'This order expired before payment.' : 'This order is no longer active.'}
        </Text>
      </View>
    </View>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function PrintProgress({
  status,
  role,
}: {
  status: PrintOrderStatus | string;
  role:   Role;
}) {
  const { brand } = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (status === 'cancelled' || status === 'expired') {
    return <CancelledBanner status={status} />;
  }

  const currentIndex = STEP_INDEX[status] ?? 0;
  const total        = STEPS.length;
  const currentStep  = STEPS[currentIndex];

  return (
    <View style={s.wrapper}>
      {/* ── Compact chip ── */}
      <Pressable
        style={({ pressed }) => [
          s.chip,
          { backgroundColor: brand.surface1, borderColor: brand.border1 },
          pressed && { opacity: 0.75 },
        ]}
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`Step ${currentIndex + 1} of ${total}: ${currentStep.label}. Tap to ${expanded ? 'hide' : 'show'} steps.`}
      >
        {/* Progress dots */}
        <View style={s.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                i < currentIndex  && { backgroundColor: brand.success },
                i === currentIndex && { width: 10, height: 10, borderRadius: 5, backgroundColor: brand.primary },
                i > currentIndex  && { backgroundColor: brand.border2 },
              ]}
            />
          ))}
        </View>

        {/* Label */}
        <View style={s.chipLabel}>
          <Text style={[s.chipStep, { color: brand.primary }]}>
            Step {currentIndex + 1} of {total}
          </Text>
          <Text style={[s.chipTitle, { color: brand.cream }]} numberOfLines={1}>
            {currentStep.label}
          </Text>
        </View>

        {/* Chevron */}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={brand.creamMuted}
        />
      </Pressable>

      {/* ── Expanded step list ── */}
      {expanded && (
        <View style={[s.stepList, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
          {STEPS.map((step, i) => {
            const done    = i < currentIndex;
            const current = i === currentIndex;
            const isLast  = i === STEPS.length - 1;
            return (
              <View key={step.key} style={s.stepRow}>
                {/* Left: number circle + connector */}
                <View style={s.stepLeft}>
                  <View style={[
                    s.stepCircle,
                    done    && { backgroundColor: `${brand.success}15`, borderColor: `${brand.success}50` },
                    current && { backgroundColor: `${brand.primary}12`, borderColor: brand.primary },
                    !done && !current && { backgroundColor: brand.surface2, borderColor: brand.border1 },
                  ]}>
                    {done ? (
                      <Ionicons name="checkmark" size={11} color={brand.success} />
                    ) : (
                      <Text style={[s.stepNum, { color: current ? brand.primary : brand.creamMuted }]}>
                        {i + 1}
                      </Text>
                    )}
                  </View>
                  {!isLast && (
                    <View style={[
                      s.connector,
                      { backgroundColor: done ? `${brand.success}50` : brand.border1 },
                    ]} />
                  )}
                </View>

                {/* Right: label + sub (sub only for current) */}
                <View style={[s.stepContent, !isLast && { paddingBottom: Spacing.two + 4 }]}>
                  <Text style={[
                    s.stepLabel,
                    { color: done ? brand.creamSub : current ? brand.cream : brand.creamMuted },
                    current && { fontWeight: '700' },
                  ]}>
                    {step.label}
                  </Text>
                  {current && (
                    <Text style={[s.stepSub, { color: brand.creamSub }]}>{step.sub[role]}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Styles (layout only) ─────────────────────────────────────────────────────

const s = StyleSheet.create({
  wrapper: { gap: Spacing.one + 2 },

  cancelBox: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.two,
    borderRadius:      Radius.md,
    borderWidth:       1,
    paddingHorizontal: Spacing.three,
    paddingVertical:   Spacing.two + 2,
  },
  cancelTitle: { fontSize: 13, fontWeight: '700' },
  cancelSub:   { fontSize: 11, marginTop: 1 },

  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.two,
    borderRadius:      Radius.md,
    borderWidth:       1,
    paddingHorizontal: Spacing.three,
    paddingVertical:   Spacing.two + 2,
  },
  dots: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  dot:  { width: 8, height: 8, borderRadius: 4 },

  chipLabel: { flex: 1 },
  chipStep:  { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  chipTitle: { fontSize: 13, fontWeight: '700', marginTop: 1 },

  stepList: {
    borderRadius:      Radius.md,
    borderWidth:       1,
    paddingHorizontal: Spacing.three,
    paddingTop:        Spacing.two,
    paddingBottom:     Spacing.two,
  },
  stepRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  stepLeft: { alignItems: 'center', width: 24 },
  stepCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  stepNum:  { fontSize: 11, fontWeight: '700' },

  connector: { flex: 1, width: 1, minHeight: 14, marginTop: 2 },

  stepContent: { flex: 1, paddingTop: 3 },
  stepLabel:   { fontSize: 13, fontWeight: '500' },
  stepSub:     { fontSize: 11, marginTop: 2, lineHeight: 16 },
});
