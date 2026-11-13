import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useVendorBusinesses } from '@/features/vendor/hooks/use-vendor-businesses';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { CouponService } from '@/services/coupon-service';
import { CouponCard } from '../components/CouponCard';

/** A vendor's coupons for their print shops: what each takes off, how often it's used, and changing them. */
export function VendorCouponsScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => CouponService.list(token, cursor));
  useRefetchOnFocus(list.refresh);
  const businesses = useVendorBusinesses();
  const shops = (businesses.data ?? []).filter((b) => b.module === 'pod').map((b) => ({ id: b.id, name: b.name }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pad}>
        <ScreenHeader title="Coupons" onBack={() => router.back()} />
      </View>
      {list.loading ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={68} radius={14} />
          ))}
        </View>
      ) : list.error && !list.items.length ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load your coupons" message="Check your connection and try again." actionLabel="Try again" onAction={list.retry} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.muted}>A coupon’s discount comes out of your share, and Ruxstar’s commission is on the price after it.</Text>
              <PrimaryButton label="New coupon" onPress={() => router.push('/(vendor)/coupons/new')} />
            </View>
          }
          ListEmptyComponent={<EmptyState icon="pricetag-outline" title="No coupons yet" message="Make one to bring customers to your print shops." />}
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
          renderItem={({ item }) => (
            <CouponCard
              coupon={item}
              canEdit
              canSwitch
              shops={shops.length ? shops : undefined}
              save={(patch) => CouponService.update(token, item.id, patch)}
              onSaved={(after) => list.setItems((items) => items.map((x) => (x.id === after.id ? after : x)))}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  pad: { paddingHorizontal: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.two },
  header: { gap: Spacing.three, paddingBottom: Spacing.two },
  muted: { ...Typography.caption, color: Brand.textMuted },
  footer: { paddingVertical: Spacing.three },
});
