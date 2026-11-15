import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { Feedback } from '@/lib/haptics';
import { StoreService } from '@/services/store-service';
import type { StoresQuery } from '@/types/store';
import { cartCount } from '../lib/cart';
import { STORE_TYPES, storeTypeLabel } from '../lib/store';
import { useCart } from '../stores/cart-store';
import { StoreCardView } from './StoreCardView';

/** Waits this long after the last keystroke before filtering by city. */
const CITY_DELAY_MS = 350;

const KIND_CHIPS = [{ key: 'all', label: 'All shops' }, ...STORE_TYPES.map((t) => ({ key: t, label: storeTypeLabel(t) }))];

function Cards({ query, filtered }: { query: StoresQuery; filtered: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => StoreService.list(token, query, cursor));

  if (list.loading) {
    return (
      <View style={styles.skeletons}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <Skeleton height={190} radius={18} />
            <Skeleton height={16} width="60%" />
            <Skeleton height={12} width="40%" />
          </View>
        ))}
      </View>
    );
  }
  if (list.error && !list.items.length) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load shops" message="Check your connection and try again." actionLabel="Try again" onAction={list.retry} />;
  }
  return (
    <FlatList
      data={list.items}
      keyExtractor={(s) => s.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      initialNumToRender={4}
      windowSize={7}
      ListEmptyComponent={
        <EmptyState
          icon="bag-handle-outline"
          title={filtered ? 'No shops match' : 'No local shops yet'}
          message={filtered ? 'Try another city, kind or name.' : 'Shops near you that deliver or let you pick up show up here as soon as they open.'}
        />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      renderItem={({ item }) => <StoreCardView store={item} onPress={() => router.push({ pathname: '/(customer)/store/[id]', params: { id: item.id } })} />}
    />
  );
}

function BarButton({ icon, label, spoken, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; spoken: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.barButton, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={18} color={Brand.text} />
      <Text style={styles.barText}>{label}</Text>
    </Pressable>
  );
}

/** Local shops for Discover: kind chips, city, the cart and your shop orders. The search box matches shop names. */
export function StoreResults({ q }: { q: string }) {
  const router = useRouter();
  const { cart } = useCart();
  const [kind, setKind] = useState('all');
  const [cityText, setCityText] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setCity(cityText.trim()), CITY_DELAY_MS);
    return () => clearTimeout(t);
  }, [cityText]);

  const query: StoresQuery = { ...(q ? { q } : {}), ...(city.length >= 2 ? { city } : {}), ...(kind !== 'all' ? { type: kind } : {}) };
  const count = cartCount(cart);

  return (
    <>
      <ChoiceChips options={KIND_CHIPS} value={kind} onChange={setKind} secondary />
      <View style={styles.bar}>
        <View style={styles.city}>
          <InputField value={cityText} onChangeText={setCityText} placeholder="Any city" autoCorrect={false} accessibilityLabel="City" />
        </View>
        <BarButton icon="cart-outline" label={count ? String(count) : 'Cart'} spoken={count ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart, empty'} onPress={() => router.push('/(customer)/store/cart')} />
        <BarButton icon="receipt-outline" label="Orders" spoken="Your shop orders" onPress={() => router.push({ pathname: '/(customer)/orders', params: { tab: 'shops' } })} />
      </View>
      <Cards key={JSON.stringify(query)} query={query} filtered={Object.keys(query).length > 0} />
    </>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  city: { flex: 1 },
  barButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  barText: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  pressed: { opacity: 0.8 },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three, flexGrow: 1 },
  skeletons: { paddingHorizontal: Spacing.three, gap: Spacing.four },
  skeletonCard: { gap: Spacing.two },
  footer: { paddingVertical: Spacing.three },
});
