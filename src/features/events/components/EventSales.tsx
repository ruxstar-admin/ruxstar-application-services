import { StyleSheet, Text, View } from 'react-native';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import type { VendorEvent } from '@/types/events';
import { soldLine } from '../lib/events';

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Tickets, today's check-ins and the organiser's share, then sold out of capacity for each ticket type. Drafts show only the ticket types. */
export function EventSales({ event, shareLabel }: { event: VendorEvent; shareLabel: string }) {
  return (
    <>
      {event.status === 'draft' ? null : (
        <View style={styles.stats}>
          <Stat value={String(event.counts.tickets)} label="Tickets" />
          <Stat value={String(event.counts.checkedIn)} label="In today" />
          <Stat value={money(event.money.share)} label={shareLabel} />
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.title}>{soldLine(event)}</Text>
        {event.tiers.map((t) => (
          <View key={t.id} style={styles.tier}>
            <View style={styles.text}>
              <Text style={styles.body}>{t.name}</Text>
              <Text style={styles.small}>{`${t.price ? money(t.price) : 'Free'}${t.held ? ` · ${t.held} being paid for` : ''}`}</Text>
            </View>
            <Text style={styles.body}>{`${t.sold} / ${t.capacity}`}</Text>
          </View>
        ))}
        {event.counts.waiting ? <Text style={styles.small}>{`${event.counts.waiting} on the waitlist`}</Text> : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, gap: 2, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  statValue: { ...Typography.heading, color: Brand.text },
  statLabel: { ...Typography.caption, color: Brand.textMuted },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  tier: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  text: { flex: 1, gap: 2 },
  title: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  body: { ...Typography.body, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
});
