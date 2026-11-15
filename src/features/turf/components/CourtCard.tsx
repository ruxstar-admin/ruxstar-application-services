import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import type { CourtView } from '@/types/turf';
import { hoursText, priceLines, sportsText } from '../lib/turf';

/** One court: sports, opening hours, every price and the add-ons, with room for an action below. */
export function CourtCard({ court, children }: { court: CourtView; children?: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.name}>{court.name}</Text>
        {court.status === 'paused' ? <Badge label="Not taking bookings" tone="warning" /> : null}
      </View>
      {court.sports.length ? <Text style={styles.text}>{sportsText(court.sports)}</Text> : null}
      <Text style={styles.small}>{hoursText(court.hours)}</Text>
      {priceLines(court).map((line) => (
        <Text key={line} style={styles.price}>
          {line}
        </Text>
      ))}
      {court.addOns.length ? (
        <Text style={styles.small}>{`Add-ons: ${court.addOns.map((a) => `${a.name} ${money(a.price)}${a.per === 'slot' ? ' a slot' : ''}`).join(', ')}`}</Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  name: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text, flexShrink: 1 },
  text: { ...Typography.body, fontSize: 15, color: Brand.text },
  price: { ...Typography.caption, fontSize: 14, color: Brand.primarySoft },
  small: { ...Typography.caption, color: Brand.textMuted },
});
