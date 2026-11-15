import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { ratingLine } from '@/features/reviews/lib/review';
import { areaText, deliveryFeeText, methodsText, storeTypeLabel } from '@/features/store/lib/store';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ConsoleStoreService } from '@/services/store-service';
import { useCan } from '../access';
import { Card, Fact, Facts, consoleStyles } from '../components/parts';
import { shortDate } from '../labels';
import { storeBadge } from './StoresScreen';

/** One local shop for the Ruxstar team: how it sells, its products and orders, with links to each. */
export function StoreCaseScreen({ id }: { id: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const canAudit = useCan('audit.view');
  const canOrders = useCan('orders.view');
  const { data, loading, error, reload } = useAsyncResource(() => ConsoleStoreService.store(token, id), id);
  const store = data?.store;
  const setup = data?.setup;

  return (
    <ScreenContainer title="Local shop">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={5}>
        {data && store ? (
          <>
            <View style={styles.head}>
              <View style={styles.flex}>
                <Text style={styles.name}>{store.name}</Text>
                <Text style={consoleStyles.muted}>{`${storeTypeLabel(store.type)} · ${[store.area, store.city].filter(Boolean).join(', ')}`}</Text>
              </View>
              <Badge {...storeBadge(store)} />
            </View>

            <Card>
              <Facts>
                <Fact label="Products" value={String(store.products)} />
                <Fact label="Paid orders" value={String(store.orders)} />
                <Fact label="Open orders" value={String(data.openOrders)} warn={data.openOrders > 0} />
                <Fact label="Open returns" value={String(data.openReturns)} warn={data.openReturns > 0} />
                <Fact label="Rating" value={ratingLine(store.rating)} />
                <Fact label="Joined" value={shortDate(store.createdAt)} />
                {setup ? (
                  <>
                    <Fact label="Sells by" value={methodsText(setup)} />
                    {setup.delivery ? <Fact label="Delivery" value={`${deliveryFeeText(setup.deliveryFee)} · ${areaText(setup, store.city)}`} /> : null}
                    <Fact label="Minimum order" value={setup.minOrder ? money(setup.minOrder) : 'None'} />
                    <Fact label="Returns" value={store.returnRule} />
                  </>
                ) : (
                  <Fact label="Setup" value="Not set up yet" warn />
                )}
                <Fact label="Shop id" value={store.id} />
              </Facts>
            </Card>
            {setup?.notes ? (
              <Card>
                <Text style={consoleStyles.muted}>Notes for customers</Text>
                <Text style={consoleStyles.body} selectable>
                  {setup.notes}
                </Text>
              </Card>
            ) : null}

            <View style={styles.links}>
              <TextLink label="Its products" onPress={() => router.push({ pathname: '/(admin)/store-products', params: { shop: store.id, label: store.name } })} />
              {canOrders ? <TextLink label="Its orders" onPress={() => router.push({ pathname: '/(admin)/store-orders', params: { shop: store.id, label: store.name } })} /> : null}
              <TextLink label="Open the business" onPress={() => router.push({ pathname: '/(admin)/business/[id]', params: { id: store.id } })} />
              {canAudit ? <TextLink label="History for this shop" onPress={() => router.push({ pathname: '/(admin)/audit', params: { target: store.id } })} /> : null}
            </View>
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  name: { ...Typography.title, color: Brand.text },
  links: { gap: Spacing.three, alignItems: 'flex-start', marginTop: Spacing.two },
});
