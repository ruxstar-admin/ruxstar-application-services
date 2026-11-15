import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Brand, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { BusinessCard } from '@/features/vendor/components/BusinessCard';
import { VendorTabScreen } from '@/features/vendor/components/VendorTabScreen';
import { useVendorBusinesses } from '@/features/vendor/hooks/use-vendor-businesses';
import { Feedback } from '@/lib/haptics';

/** Matches the API's cap. */
const MAX_BUSINESSES = 10;

function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      hitSlop={6}
      style={({ pressed }) => [styles.add, pressed && styles.pressed]}
    >
      <Ionicons name="add" size={18} color={Brand.text} />
      <Text style={styles.addText}>Add business</Text>
    </Pressable>
  );
}

/** Every business as a card, each with its own Open switch, and Add business at the top. */
export function VendorBusinessesScreen() {
  const router = useRouter();
  const businesses = useVendorBusinesses();
  const list = businesses.data ?? [];
  const canAdd = !!businesses.data && list.length < MAX_BUSINESSES;

  return (
    <VendorTabScreen title="Businesses" onRefresh={businesses.reload} action={canAdd ? <AddButton onPress={() => router.push('/(vendor)/businesses/new')} /> : undefined}>
      <AsyncBoundary loading={businesses.loading} error={businesses.error} hasData={!!businesses.data} onRetry={businesses.reload} skeletonRows={4}>
        {businesses.failure ? <ErrorBanner message={businesses.failure} /> : null}
        {list.length ? (
          <View style={styles.grid}>
            {list.map((b) => (
              <BusinessCard
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
            message="Each business runs in one category: print on demand, events, coaching, stays or sports grounds. You can have several."
            actionLabel="Add business"
            onAction={() => router.push('/(vendor)/businesses/new')}
          />
        )}
        {list.length >= MAX_BUSINESSES ? <Text style={styles.hint}>{`You have the most businesses one vendor can run (${MAX_BUSINESSES}).`}</Text> : null}
      </AsyncBoundary>
    </VendorTabScreen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: Spacing.three },
  hint: { ...Typography.caption, color: Brand.textFaint, textAlign: 'center' },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Brand.primary,
  },
  pressed: { opacity: 0.8 },
  addText: { ...Typography.caption, fontFamily: Fonts.semibold, color: Brand.text },
});
