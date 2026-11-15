import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { InputField } from '@/components/ui/InputField';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Fact, Facts, Notice, Section } from '@/features/coaching/components/Parts';
import { ratingLine } from '@/features/reviews/lib/review';
import { PhotoStrip } from '@/features/turf/components/PhotoStrip';
import { mapsUrl } from '@/features/turf/lib/turf';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { StoreService } from '@/services/store-service';
import type { StoreDetail } from '@/types/store';
import { CartBar, useStoreCart } from '../components/CartBar';
import { ProductGrid } from '../components/ProductGrid';
import { areaText, deliveryFeeText, storeTypeLabel } from '../lib/store';

/** Waits this long after the last keystroke before searching the shop. */
const SEARCH_DELAY_MS = 350;

function StoreView({ store }: { store: StoreDetail }) {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);
  const { setup } = store;
  const cart = useStoreCart(store.id);
  const call = () => {
    if (!store.phone) return;
    Feedback.tap();
    void Linking.openURL(`tel:${store.phone}`);
  };

  return (
    <ScreenContainer title="Shop" footer={cart ? <CartBar cart={cart} /> : undefined}>
      <PhotoStrip photos={store.photos.map((p) => ({ ...p, id: p.url }))} name={store.name} dimmed={!store.open} />
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title}>{store.name}</Text>
          <Text style={styles.muted}>{`${storeTypeLabel(store.type)} · ${ratingLine(store.rating)}`}</Text>
        </View>
        <Badge label={store.open ? 'Open' : 'Closed'} tone={store.open ? 'success' : 'neutral'} />
      </View>
      {!store.canOrder && store.whyNot ? <Notice tone="warning" text={store.whyNot} /> : null}

      <Facts>
        <Fact icon="location-outline" title={store.address} detail={store.area ? `${store.area}, ${store.city}` : store.city} />
        {setup.delivery ? <Fact icon="bicycle-outline" title={deliveryFeeText(setup.deliveryFee)} detail={areaText(setup, store.city)} /> : null}
        {setup.pickup ? <Fact icon="walk-outline" title="Pick up from the shop" detail="No delivery fee" /> : null}
        {setup.minOrder ? <Fact icon="cart-outline" title={`Minimum order ${money(setup.minOrder)}`} /> : null}
        <Fact icon="return-down-back-outline" title={store.returnDays ? `Returns within ${store.returnDays} day${store.returnDays === 1 ? '' : 's'}` : 'No returns'} detail={store.returnRule} />
      </Facts>
      <View style={styles.links}>
        <TextLink label="Get directions" onPress={() => Linking.openURL(mapsUrl({ address: store.address, city: store.city, point: store.point }))} />
        {store.phone ? <TextLink label="Call the shop" onPress={call} /> : null}
      </View>
      {setup.notes ? <Notice text={setup.notes} /> : null}

      <Section title={store.products ? `Products · ${store.products}` : 'Products'} />
      <InputField value={text} onChangeText={setText} placeholder={`Search ${store.name}`} autoCorrect={false} returnKeyType="search" accessibilityLabel="Search this shop's products" />
      <ProductGrid key={q} query={{ shop: store.id, ...(q ? { q } : {}) }} searching={!!q} />

      {store.description ? (
        <>
          <Section title="About" />
          <Text style={styles.description}>{store.description}</Text>
        </>
      ) : null}
    </ScreenContainer>
  );
}

/** One local shop: photos, where it is, delivery and pickup, minimum order, the return rule, then its products. */
export function StoreScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => StoreService.get(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));

  return data ? (
    <StoreView store={data} />
  ) : (
    <ScreenContainer title="Shop">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={5}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, marginTop: Spacing.two },
  headText: { flex: 1, gap: Spacing.one },
  title: { ...Typography.title, color: Brand.text },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  links: { flexDirection: 'row', gap: Spacing.four },
  description: { ...Typography.body, lineHeight: 24, color: Brand.textMuted },
});
