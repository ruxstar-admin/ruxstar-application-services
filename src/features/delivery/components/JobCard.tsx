import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { formatRupees } from '@/lib/money';
import type { DeliveryJob } from '@/types/delivery';

/** A delivery: pickup → drop, distance, and what it pays. `children` holds the card's actions. */
export function JobCard({ job, children }: { job: DeliveryJob; children?: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.shop}>{job.shopName}</Text>
        <Text style={styles.fee}>{formatRupees(job.fee)}</Text>
      </View>
      <View style={styles.route}>
        <Text style={styles.area}>{job.pickupArea}</Text>
        <Ionicons name="arrow-forward" size={16} color={Brand.textMuted} />
        <Text style={styles.area}>{job.dropArea}</Text>
      </View>
      <Text style={styles.meta}>{`${job.distanceKm.toFixed(1)} km · ${job.orderRef}`}</Text>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, marginBottom: Spacing.two },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shop: { ...Typography.bodyStrong, color: Brand.text, flex: 1 },
  fee: { ...Typography.title, color: Brand.success },
  route: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  area: { ...Typography.body, color: Brand.text },
  meta: { ...Typography.caption, color: Brand.textMuted },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
});
