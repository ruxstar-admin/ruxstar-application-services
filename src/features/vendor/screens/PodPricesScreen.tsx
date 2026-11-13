import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useBusinessCatalog } from '@/features/vendor/hooks/use-business-catalog';
import { priceLine } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { shopDesk } from '@/features/vendor/lib/shop-desk';

/** Every product the shop prints, with its price or a "Set price" badge. `team` opens it from Work, by place id. */
export function PodPricesScreen({ team = false }: { team?: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const desk = shopDesk(team);
  const business = useAsyncResource(() => desk.service.get(token, id), id);
  useRefetchOnFocus(business.reload);
  const catalog = useBusinessCatalog();
  const pod = business.data?.pod;
  const retry = () => {
    if (business.error) business.reload();
    if (catalog.error) catalog.reload();
  };

  return (
    <ScreenContainer title="Prices">
      <AsyncBoundary
        loading={business.loading || catalog.loading}
        error={business.error ?? catalog.error}
        hasData={!!pod && !!catalog.data}
        onRetry={retry}
        skeletonRows={5}
      >
        {pod && catalog.data ? (
          pod.products.length ? (
            <>
              <Text style={styles.intro}>
                {pod.unpriced.length ? `${pod.unpriced.length} of ${pod.products.length} still need a price.` : 'Every product has a price.'}
              </Text>
              <View style={styles.card}>
                {catalog.data.podProducts
                  .filter((info) => pod.products.includes(info.id))
                  .map((info) => {
                    const line = priceLine(pod.prices.find((p) => p.product === info.id));
                    return (
                      <ListRow
                        key={info.id}
                        title={info.label}
                        subtitle={line ?? (info.pricing === 'per_page' ? 'Priced per page' : 'Priced per unit')}
                        right={pod.unpriced.includes(info.id) ? <Badge label="Set price" tone="warning" /> : undefined}
                        onPress={() => router.push({ pathname: desk.routes.price, params: { id, product: info.id } })}
                      />
                    );
                  })}
              </View>
            </>
          ) : (
            <EmptyState
              icon="pricetags-outline"
              title="No products yet"
              message="Choose what you print first, then set a price for each."
              actionLabel="Choose products"
              onAction={() => router.replace({ pathname: desk.routes.products, params: { id } })}
            />
          )
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: { ...Typography.body, color: Brand.textMuted, marginBottom: Spacing.two },
  card: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.surface, paddingHorizontal: Spacing.three },
});
