import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { BUSINESS_MODULES, statusOf } from '@/features/vendor/lib/business-modules';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { formatRupees } from '@/lib/money';
import { BusinessService } from '@/services/business-service';
import type { Business, Payments } from '@/types/business';

/** Matches the API's cap. */
const MAX_BUSINESSES = 10;

function BusinessRow({ business, onPress }: { business: Business; onPress: () => void }) {
  const info = BUSINESS_MODULES[business.module];
  const status = statusOf(business);
  const cover = business.photos[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${business.name}, ${info.label}, ${status.label}`}
      onPress={onPress}
      style={({ pressed }) => [styles.business, pressed && styles.pressed]}
    >
      {cover ? (
        <Image source={{ uri: cover.url }} style={styles.cover} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.cover, styles.coverEmpty]}>
          <Ionicons name={info.icon} size={24} color={Brand.textMuted} />
        </View>
      )}
      <View style={styles.businessText}>
        <Text style={styles.businessName} numberOfLines={1}>
          {business.name}
        </Text>
        <Text style={styles.muted}>{info.label}</Text>
      </View>
      <Badge label={status.label} tone={status.tone} />
    </Pressable>
  );
}

function PaymentsCard({ payments, onPress }: { payments: Payments; onPress: () => void }) {
  const method = payments.payoutMethod;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>Payments</Text>
        <Ionicons name="chevron-forward" size={18} color={Brand.textMuted} />
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatRupees(payments.balance.available / 100)}</Text>
          <Text style={styles.muted}>Available</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatRupees(payments.balance.paidOut / 100)}</Text>
          <Text style={styles.muted}>Paid out</Text>
        </View>
      </View>
      <View style={styles.method}>
        <Ionicons name={method ? 'checkmark-circle' : 'alert-circle-outline'} size={18} color={method ? Brand.success : Brand.warning} />
        <Text style={styles.methodText}>{method ? `Paid to ${method.label}` : 'Add the bank account or UPI ID you get paid to'}</Text>
      </View>
    </Pressable>
  );
}

/** The vendor portal's front page: your businesses, payments, and posting as a business. */
export function VendorHomeScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(async () => {
    const [businesses, payments] = await Promise.all([BusinessService.list(token), BusinessService.payments(token)]);
    return { businesses, payments };
  });
  useRefetchOnFocus(reload);

  const open = (id: string) => {
    Feedback.tap();
    router.push({ pathname: '/(vendor)/businesses/[id]', params: { id } });
  };
  const add = () => {
    Feedback.tap();
    router.push('/(vendor)/businesses/new');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.overline}>Vendor portal</Text>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(customer)/(tabs)/profile'))}>
          <Text style={styles.exit}>Exit</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
          {data ? (
            <>
              <Text style={styles.title}>Your businesses</Text>
              {data.businesses.length ? (
                <View style={styles.list}>
                  {data.businesses.map((b) => (
                    <BusinessRow key={b.id} business={b} onPress={() => open(b.id)} />
                  ))}
                </View>
              ) : (
                <EmptyState
                  icon="storefront-outline"
                  title="Open your first business"
                  message="Each business runs in one module: print on demand, events, coaching or stays. You can have several."
                />
              )}
              {data.businesses.length < MAX_BUSINESSES ? <PrimaryButton label="Add a business" onPress={add} /> : null}

              <PaymentsCard payments={data.payments} onPress={() => router.push('/(vendor)/payments')} />

              <ListRow
                icon="megaphone-outline"
                title="Post as business"
                subtitle="Offers and updates on your Business tab"
                onPress={() => router.push({ pathname: '/(customer)/create-post', params: { kind: 'business' } })}
              />
            </>
          ) : null}
        </AsyncBoundary>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  overline: { ...Typography.overline, color: Brand.textMuted },
  exit: { ...Typography.bodyStrong, color: Brand.primarySoft },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  title: { ...Typography.title, color: Brand.text },
  list: { gap: Spacing.two },
  business: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.two, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  pressed: { opacity: 0.7 },
  cover: { width: 56, height: 56, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  businessText: { flex: 1, gap: 2 },
  businessName: { ...Typography.bodyStrong, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted },
  card: { backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.three },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { ...Typography.heading, color: Brand.text },
  stats: { flexDirection: 'row', gap: Spacing.five },
  stat: { gap: 2 },
  statValue: { ...Typography.title, color: Brand.text },
  method: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  methodText: { ...Typography.caption, fontSize: 14, color: Brand.text, flex: 1 },
});
