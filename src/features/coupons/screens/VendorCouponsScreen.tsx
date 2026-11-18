import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useMyFreelancer } from '@/features/gigs/hooks/use-gigs';
import { useVendorBusinesses } from '@/features/vendor/hooks/use-vendor-businesses';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { ApiError } from '@/lib/api-error';
import { CouponService } from '@/services/coupon-service';
import { TeamCouponService } from '@/services/team-service';
import { CouponCard } from '../components/CouponCard';
import { couponShops } from '../lib/coupons';

/**
 * A vendor's coupons for their print shops, events, coaching and sports businesses: what each takes off, how often it's used, and changing them.
 * With `placeId` it is one shop's coupons for someone on its team, who changes only the ones for that shop alone.
 * With `freelance` it is a freelancer's coupons for their gigs, from the Freelancing home, for freelancers who aren't vendors.
 */
export function VendorCouponsScreen({ placeId, freelance }: { placeId?: string; freelance?: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => (placeId ? TeamCouponService.list(token, placeId, cursor) : CouponService.list(token, cursor)));
  useRefetchOnFocus(list.refresh);
  const businesses = useVendorBusinesses({ skip: !!placeId || !!freelance });
  const me = useMyFreelancer(!freelance);
  const shops = placeId ? [] : freelance ? (me.data ? [{ id: me.data.businessId, name: me.data.name }] : []) : couponShops(businesses.data ?? []);
  const newHref = placeId ? { pathname: '/(customer)/work/coupons/[id]/new' as const, params: { id: placeId } } : freelance ? '/(customer)/freelance/coupons/new' : '/(vendor)/coupons/new';
  const refused = list.error instanceof ApiError && list.error.status > 0 && list.error.kind !== 'server' ? list.error.message : null;

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
        <EmptyState
          icon="cloud-offline-outline"
          title={placeId ? 'Could not load the coupons' : 'Could not load your coupons'}
          message={refused ?? 'Check your connection and try again.'}
          actionLabel="Try again"
          onAction={list.retry}
        />
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
              <Text style={styles.muted}>
                {placeId
                  ? 'A coupon’s discount comes out of the shop’s share. Coupons the owner made for several shops are theirs to change.'
                  : 'A coupon’s discount comes out of your share, and Ruxstar’s commission is on the price after it.'}
              </Text>
              <PrimaryButton label="New coupon" onPress={() => router.push(newHref)} />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="pricetag-outline"
              title="No coupons yet"
              message={placeId ? 'Make one to bring customers to this shop.' : freelance ? 'Make one to bring customers to your gigs and custom offers.' : 'Make one to bring customers to your businesses.'}
            />
          }
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
          renderItem={({ item }) => (
            <CouponCard
              coupon={item}
              canEdit={!placeId || item.businesses.length === 1}
              canSwitch={!placeId || item.businesses.length === 1}
              shops={shops.length ? shops : undefined}
              save={(patch) => (placeId ? TeamCouponService.update(token, placeId, item.id, patch) : CouponService.update(token, item.id, patch))}
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
