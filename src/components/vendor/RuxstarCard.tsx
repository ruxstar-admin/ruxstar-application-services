/**
 * RuxstarCard — native equivalent of the web ruxstar-card.tsx
 * Dark premium card with chip, holder name, masked Aadhaar/PAN
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Radius } from '@/constants/theme';
import type { RuxstarCardData } from '@/services/kyc-service';

function formatMemberSince(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d
    .toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    .replace(' ', " '")
    .toUpperCase();
}

export default function RuxstarCard({ card }: { card: RuxstarCardData }) {
  const holderName  = card.name?.trim().toUpperCase() ?? '—';
  const memberSince = formatMemberSince(card.memberSince);
  const mobileLabel = card.mobile ? `+91 ${card.mobile}` : 'Ruxstar Member';

  return (
    <View style={s.card}>
      {/* Subtle inner highlight */}
      <View style={s.highlight} pointerEvents="none" />

      {/* ── Top row ──────────────────────────────────────────────── */}
      <View style={s.topRow}>
        <View>
          <View style={s.brandRow}>
            <Text style={s.star}>★</Text>
            <Text style={s.brandName}>Ruxstar</Text>
          </View>
          <Text style={s.mobileText}>{mobileLabel}</Text>
        </View>
        <View style={s.verifiedBadge}>
          <View style={s.verifiedDot} />
          <Text style={s.verifiedText}>Verified</Text>
        </View>
      </View>

      {/* ── Chip + NFC ───────────────────────────────────────────── */}
      <View style={s.chipRow}>
        <View style={s.chip}>
          {/* 3×2 EMV chip grid */}
          <View style={s.chipGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={s.chipCell} />
            ))}
          </View>
        </View>
        {/* NFC arcs */}
        <View style={s.nfc}>
          <View style={[s.nfcArc, { width: 10, height: 10, borderRadius: 5 }]} />
          <View style={[s.nfcArc, { width: 15, height: 15, borderRadius: 8 }]} />
          <View style={[s.nfcArc, { width: 20, height: 20, borderRadius: 10 }]} />
        </View>
      </View>

      {/* ── Holder ───────────────────────────────────────────────── */}
      <View style={s.holderBlock}>
        <Text style={s.holderLabel}>Card Holder</Text>
        <Text style={s.holderName} numberOfLines={1}>{holderName}</Text>
        <Text style={s.ruxstarId}>{card.ruxstarId}</Text>
      </View>

      {/* ── Bottom row ───────────────────────────────────────────── */}
      <View style={s.bottomRow}>
        <View style={s.bottomDivider} />
        <View style={s.bottomFields}>
          <View>
            <Text style={s.metaLabel}>Aadhaar</Text>
            <Text style={s.metaValue}>{card.aadhaar ?? 'XXXX XXXX XXXX'}</Text>
          </View>
          <View>
            <Text style={s.metaLabel}>PAN</Text>
            <Text style={s.metaValue}>{card.pan ?? 'XXXXX0000X'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.metaLabel}>Member Since</Text>
            <Text style={s.metaValue}>{memberSince ?? '—'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const CARD_BG     = '#111110';
const CARD_GOLD   = '#c4b49a';
const CARD_MUTED  = '#6C6C70';
const CARD_BORDER = 'rgba(255,255,255,0.09)';

const s = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 1.586,
    backgroundColor: CARD_BG,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  highlight: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '60%',
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderRadius: Radius.xl,
  },

  // ── Top ──────────────────────────────────────────────────────────
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  star:     { color: CARD_GOLD, fontSize: 10 },
  brandName: {
    color: '#e4e4e4',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  mobileText: {
    color: CARD_MUTED,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  verifiedDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: `${CARD_GOLD}90` },
  verifiedText: { color: CARD_GOLD, fontSize: 8, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },

  // ── Chip ─────────────────────────────────────────────────────────
  chipRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: {
    width: 36,
    height: 26,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: '#1e1d1b',
    overflow: 'hidden',
    padding: 3,
  },
  chipGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  chipCell: {
    width: '30%',
    flex: 1,
    backgroundColor: `${CARD_GOLD}35`,
    borderRadius: 1,
  },
  nfc: { flexDirection: 'row', alignItems: 'center', gap: 2, opacity: 0.4 },
  nfcArc: {
    borderWidth: 1.5,
    borderColor: CARD_MUTED,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },

  // ── Holder ───────────────────────────────────────────────────────
  holderBlock: { gap: 3 },
  holderLabel: {
    color: CARD_MUTED,
    fontSize: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  holderName: {
    color: '#e4e4e4',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  ruxstarId: {
    color: `${CARD_GOLD}E6`,
    fontSize: 11,
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginTop: 1,
  },

  // ── Bottom ───────────────────────────────────────────────────────
  bottomRow:    { gap: 8 },
  bottomDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  bottomFields: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  metaLabel: {
    color: CARD_MUTED,
    fontSize: 7,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  metaValue: {
    color: '#9ca3af',
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
  },
});
