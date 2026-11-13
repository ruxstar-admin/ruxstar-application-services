import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { CouponCard } from '@/features/coupons/components/CouponCard';
import { cleanCode } from '@/features/coupons/lib/coupons';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { AdminService } from '@/services/admin-service';
import type { CouponFunder } from '@/types/coupon';
import { useCan } from '../access';
import { Note, consoleStyles, errorText } from '../components/parts';

const TABS = [
  { key: 'ruxstar', label: 'Ruxstar' },
  { key: 'vendor', label: 'Vendors' },
] as const satisfies readonly { key: CouponFunder; label: string }[];

/** Waits this long after the last keystroke before searching. */
const SEARCH_DELAY_MS = 350;

function Coupons({ funder, code }: { funder: CouponFunder; code: string | undefined }) {
  const token = useAuthToken();
  const canManage = useCan('coupons.manage');
  const list = usePaginated((cursor) => AdminService.coupons(token, funder, code, cursor));
  useRefetchOnFocus(list.refresh);

  if (list.loading) {
    return (
      <View style={consoleStyles.skeletons}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={68} radius={14} />
        ))}
      </View>
    );
  }
  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load coupons" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }

  return (
    <FlatList
      data={list.items}
      keyExtractor={(c) => c.id}
      contentContainerStyle={consoleStyles.list}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        funder === 'vendor' && !code ? <Note>Vendors pay for their own coupons. You can switch one off if it is misused; only you can switch it back on.</Note> : null
      }
      ListEmptyComponent={
        <EmptyState
          icon="pricetag-outline"
          title={code ? `No coupon ${code}` : funder === 'ruxstar' ? 'No Ruxstar coupons yet' : 'No vendor coupons yet'}
          message={!code && funder === 'ruxstar' ? 'Ruxstar pays for these, at every print shop.' : undefined}
        />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={consoleStyles.footer} /> : null}
      renderItem={({ item }) => (
        <CouponCard
          coupon={item}
          canEdit={canManage && item.fundedBy === 'ruxstar'}
          canSwitch={canManage}
          showVendor
          save={(patch) => AdminService.updateCoupon(token, item.id, patch)}
          onSaved={(after) => list.setItems((items) => items.map((x) => (x.id === after.id ? after : x)))}
        />
      )}
    />
  );
}

/** Ruxstar's coupons, which Ruxstar pays for, and every vendor's, which the team can switch off. */
export function CouponsScreen() {
  const router = useRouter();
  const canManage = useCan('coupons.manage');
  const [funder, setFunder] = useState<CouponFunder>('ruxstar');
  const [text, setText] = useState('');
  const [code, setCode] = useState<string | undefined>();
  useEffect(() => {
    const t = setTimeout(() => setCode(text || undefined), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title="Coupons" onBack={() => router.back()} />
      </View>
      <View style={styles.controls}>
        <SegmentedTabs options={TABS} value={funder} onChange={setFunder} />
        <InputField value={text} onChangeText={(t) => setText(cleanCode(t))} placeholder="Find a code" autoCapitalize="characters" autoCorrect={false} accessibilityLabel="Find a coupon by its code" />
        {canManage && funder === 'ruxstar' ? <PrimaryButton label="New Ruxstar coupon" onPress={() => router.push('/(admin)/coupons/new')} /> : null}
      </View>
      <Coupons key={`${funder}:${code ?? ''}`} funder={funder} code={code} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  controls: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
});
