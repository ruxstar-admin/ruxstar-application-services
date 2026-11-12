import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { BusinessRow } from '@/features/vendor/components/BusinessRow';
import { VendorTabScreen } from '@/features/vendor/components/VendorTabScreen';
import { useVendorBusinesses } from '@/features/vendor/hooks/use-vendor-businesses';

/** Matches the API's cap. */
const MAX_BUSINESSES = 10;

/** Every business, each with its own Open switch, and Add a business. */
export function VendorBusinessesScreen() {
  const router = useRouter();
  const businesses = useVendorBusinesses();
  const list = businesses.data ?? [];

  return (
    <VendorTabScreen title="Businesses" onRefresh={businesses.reload}>
      <AsyncBoundary loading={businesses.loading} error={businesses.error} hasData={!!businesses.data} onRetry={businesses.reload} skeletonRows={4}>
        {list.length ? (
          <View style={styles.list}>
            {list.map((b) => (
              <BusinessRow
                key={b.id}
                business={b}
                busy={businesses.busy.has(b.id)}
                onPress={() => router.push({ pathname: '/(vendor)/businesses/[id]', params: { id: b.id } })}
                onToggle={(open) => businesses.setOne(b, open)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="storefront-outline"
            title="Open your first business"
            message="Each business runs in one category: print on demand, events, coaching or stays. You can have several."
          />
        )}
        {businesses.failure ? <ErrorBanner message={businesses.failure} /> : null}
        {list.length < MAX_BUSINESSES ? (
          <PrimaryButton label="Add a business" onPress={() => router.push('/(vendor)/businesses/new')} />
        ) : (
          <Text style={styles.hint}>{`You have the most businesses one vendor can run (${MAX_BUSINESSES}).`}</Text>
        )}
      </AsyncBoundary>
    </VendorTabScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  hint: { ...Typography.caption, color: Brand.textFaint, textAlign: 'center' },
});
