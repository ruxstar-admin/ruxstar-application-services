import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Brand, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import type { RuxstarCard as Card } from '@/types/kyc';
import { QrCode } from './QrCode';

const since = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

/** The member card. Masked numbers are for the owner only; the QR code opens the public profile. */
export function RuxstarCard({ card }: { card: Card }) {
  return (
    <LinearGradient
      colors={['#2A1B6B', Brand.surfaceAlt, '#10233A']}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.card}
      accessible
      accessibilityLabel={`Ruxstar Card ${card.id}, ${card.name}${card.vendor ? ', verified vendor' : ', verified'}`}
    >
      <View style={styles.top}>
        <Text style={styles.brand}>ruxstar</Text>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Ionicons name="checkmark-circle" size={14} color={Brand.secondary} />
            <Text style={[styles.badgeText, { color: Brand.secondary }]}>Verified</Text>
          </View>
          {card.vendor ? (
            <View style={styles.badge}>
              <Ionicons name="storefront" size={13} color={Brand.warning} />
              <Text style={[styles.badgeText, { color: Brand.warning }]}>Vendor</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.who}>
        <Avatar name={card.name} uri={card.photoUrl ?? undefined} size={56} />
        <View style={styles.flex}>
          <Text style={styles.name} numberOfLines={1}>
            {card.name}
          </Text>
          <Text style={styles.id}>{card.id}</Text>
        </View>
      </View>

      <View style={styles.foot}>
        <View style={styles.facts}>
          <Fact label="Aadhaar" value={card.aadhaar} />
          {card.pan ? <Fact label="PAN" value={card.pan} /> : null}
          <Fact label="Member since" value={since(card.memberSince)} />
        </View>
        <View style={styles.qr}>
          <QrCode value={card.profileUrl} size={88} label="QR code to your public profile" />
        </View>
      </View>
    </LinearGradient>
  );
}

const mono = { fontFamily: Fonts.semibold, letterSpacing: 1 } as const;

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, padding: Spacing.four, gap: Spacing.three, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { ...Typography.bodyStrong, fontSize: 18, color: Brand.text },
  badges: { flexDirection: 'row', gap: Spacing.two },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.two, paddingVertical: 3, borderRadius: Radius.pill, backgroundColor: 'rgba(0,0,0,0.35)' },
  badgeText: { fontFamily: Fonts.semibold, fontSize: 12 },
  who: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1 },
  name: { ...Typography.title, fontSize: 20, color: Brand.text },
  id: { ...mono, fontSize: 14, color: Brand.textMuted },
  foot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.three },
  facts: { gap: Spacing.two, flex: 1 },
  factLabel: { fontFamily: Fonts.semibold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: Brand.textMuted },
  factValue: { ...mono, fontSize: 14, color: Brand.text },
  qr: { borderRadius: Radius.sm, overflow: 'hidden' },
});
