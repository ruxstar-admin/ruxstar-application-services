import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { VendorTabScreen } from '@/features/vendor/components/VendorTabScreen';
import { useVendorBusinesses } from '@/features/vendor/hooks/use-vendor-businesses';
import { MISSING_LABEL, listOf } from '@/features/vendor/lib/business-modules';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { money } from '@/features/vendor/lib/pod';
import { BusinessService } from '@/services/business-service';

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

/** The portal's first tab: counts, what still needs setting up, and the balance. Opening and closing is per business, on Businesses. */
export function VendorDashboardScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const businesses = useVendorBusinesses();
  const payments = useAsyncResource(() => BusinessService.payments(token));
  useRefetchOnFocus(payments.reload);
  const list = businesses.data ?? [];
  const drafts = list.filter((b) => b.status === 'draft' && !b.suspension);
  const open = businesses.openable.filter((b) => b.open).length;

  return (
    <VendorTabScreen title="Dashboard" onRefresh={() => (businesses.reload(), payments.reload())}>
      <AsyncBoundary loading={businesses.loading} error={businesses.error} hasData={!!businesses.data} onRetry={businesses.reload} skeletonRows={4}>
        {list.length ? (
          <>
            <View style={styles.card}>
              <View style={styles.stats}>
                <Stat value={String(open)} label="Open" />
                <Stat value={String(businesses.openable.length - open)} label="Closed" />
                <Stat value={String(drafts.length)} label="Drafts" />
              </View>
            </View>

            {drafts.length ? (
              <>
                <Text style={styles.section}>Finish setting up</Text>
                <View style={styles.listCard}>
                  {drafts.map((b) => (
                    <ListRow
                      key={b.id}
                      icon="construct-outline"
                      title={b.name}
                      subtitle={b.missing.length ? `Add ${listOf(b.missing.map((m) => MISSING_LABEL[m]))}` : 'Ready to publish'}
                      onPress={() => router.push({ pathname: '/(vendor)/businesses/[id]', params: { id: b.id } })}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Open your first business</Text>
            <Text style={styles.muted}>Print on demand, events, coaching or stays. You can run up to 10.</Text>
            <PrimaryButton label="Add a business" onPress={() => router.push('/(vendor)/businesses/new')} />
          </View>
        )}
      </AsyncBoundary>

      {payments.data ? (
        <Pressable accessibilityRole="button" onPress={() => router.navigate('/(vendor)/(tabs)/payments')} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Payments</Text>
            <Ionicons name="chevron-forward" size={18} color={Brand.textMuted} />
          </View>
          <View style={styles.stats}>
            <Stat value={money(payments.data.balance.available)} label="Available" />
            <Stat value={money(payments.data.balance.paidOut)} label="Paid out" />
          </View>
          {!payments.data.payoutMethod ? (
            <View style={styles.method}>
              <Ionicons name="alert-circle-outline" size={18} color={Brand.warning} />
              <Text style={styles.methodText}>Add the bank account or UPI ID you get paid to</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </VendorTabScreen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.three },
  listCard: { backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.lg, paddingHorizontal: Spacing.three },
  pressed: { opacity: 0.7 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { ...Typography.heading, color: Brand.text },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.two },
  stats: { flexDirection: 'row', gap: Spacing.five },
  stat: { gap: 2 },
  statValue: { ...Typography.title, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted },
  method: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  methodText: { ...Typography.caption, fontSize: 14, color: Brand.text, flex: 1 },
});
