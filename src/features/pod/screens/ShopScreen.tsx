import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { ShopCover } from '@/features/pod/components/ShopCover';
import { deliveryLine, fromLine, placeLine, productPrice, readyLine } from '@/features/pod/lib/shop';
import { money, OPTION_LABELS } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { ShopService } from '@/services/shop-service';
import type { Shop, ShopProduct } from '@/types/shop';

const HERO_RATIO = 4 / 3;

function Photos({ shop }: { shop: Shop }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const height = width / HERO_RATIO;

  if (shop.photos.length <= 1) {
    return <ShopCover photo={shop.photos[0] ?? null} name={shop.name} width={width} style={{ width, height }} />;
  }
  return (
    <View>
      <FlatList
        data={shop.photos}
        keyExtractor={(p) => p.url}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => <ShopCover photo={item} name={shop.name} width={width} style={{ width, height }} />}
      />
      <View style={styles.dots} pointerEvents="none">
        {shop.photos.map((p, i) => (
          <View key={p.url} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

function Fact({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={18} color={Brand.primarySoft} />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

function ProductCard({ product, shopDays }: { product: ShopProduct; shopDays: number }) {
  const lines = [
    product.minQuantity > 1 ? `Minimum ${product.minQuantity}` : null,
    product.turnaroundDays !== shopDays ? readyLine(product.turnaroundDays) : null,
  ].filter(Boolean);
  const unit = product.pricing === 'per_page' ? 'a page' : 'each';

  return (
    <View style={styles.product}>
      <View style={styles.productHead}>
        <Text style={styles.productName}>{product.label}</Text>
        <Text style={styles.productPrice}>{productPrice(product)}</Text>
      </View>
      {product.description ? <Text style={styles.muted}>{product.description}</Text> : null}
      {lines.length ? <Text style={styles.muted}>{lines.join(' · ')}</Text> : null}
      {product.tiers.length ? (
        <View style={styles.tags}>
          {product.tiers.map((t) => (
            <Badge key={t.from} label={`${t.from}+ at ${money(t.unitPrice)} ${unit}`} tone="success" />
          ))}
        </View>
      ) : null}
      {product.extras.length ? (
        <View style={styles.tags}>
          {product.extras.map((x) => (
            <Badge key={`${x.option}-${x.value}`} label={`${x.value} +${money(x.price)}`} tone="neutral" />
          ))}
        </View>
      ) : null}
      {product.options.length ? (
        <Text style={styles.faint}>Choose {product.options.map((o) => (OPTION_LABELS[o.option] ?? o.option).toLowerCase()).join(', ')}</Text>
      ) : null}
    </View>
  );
}

function ShopBody({ shop }: { shop: Shop }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ordering, setOrdering] = useState(false);
  const price = fromLine(shop);
  const place = [placeLine(shop), shop.pincode].filter(Boolean).join(' ');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <Photos shop={shop} />

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{shop.name}</Text>
            <Badge label={shop.open ? 'Open' : 'Closed'} tone={shop.open ? 'success' : 'neutral'} />
          </View>
          <Text style={styles.muted}>{[shop.typeLabel, place].filter(Boolean).join(' · ')}</Text>

          <View style={styles.facts}>
            <Fact icon="time-outline" text={readyLine(shop.turnaroundDays)} />
            <Fact icon="bicycle-outline" text={deliveryLine(shop)} />
            {shop.minOrder > 0 ? <Fact icon="wallet-outline" text={`Minimum order ${money(shop.minOrder)}`} /> : null}
          </View>

          {shop.description ? (
            <View style={styles.section}>
              <Text style={styles.overline}>About</Text>
              <Text style={styles.text}>{shop.description}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.overline}>What they print</Text>
            {shop.catalog.map((p) => (
              <ProductCard key={p.id} product={p} shopDays={shop.turnaroundDays} />
            ))}
          </View>

          {shop.notes ? (
            <View style={styles.section}>
              <Text style={styles.overline}>From the shop</Text>
              <Text style={styles.text}>{shop.notes}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={8}
        onPress={() => {
          Feedback.tap();
          router.back();
        }}
        style={[styles.back, { top: insets.top + Spacing.two }]}
      >
        <Ionicons name="chevron-back" size={22} color={Brand.text} />
      </Pressable>

      <View style={[styles.bar, { paddingBottom: insets.bottom + Spacing.two }]}>
        <View style={styles.barText}>
          {price ? <Text style={styles.barPrice}>{price}</Text> : null}
          <Text style={styles.faint}>{shop.open ? readyLine(shop.turnaroundDays) : 'Closed right now'}</Text>
        </View>
        <View style={styles.barButton}>
          <PrimaryButton label={shop.open ? 'Order' : 'Closed'} disabled={!shop.open} onPress={() => setOrdering(true)} />
        </View>
      </View>

      <BottomSheet visible={ordering} onClose={() => setOrdering(false)} title="Ordering is almost here">
        <Text style={styles.text}>Soon you will upload your file, pick the size and paper, and pay right here. {shop.name} gets the order as soon as you pay.</Text>
        <PrimaryButton label="Got it" onPress={() => setOrdering(false)} />
      </BottomSheet>
    </View>
  );
}

/** A print shop's public page: photos, what it prints and for how much, and the Order button. */
export function ShopScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => ShopService.get(token, id));

  if (data) return <ShopBody shop={data} />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => router.back()} style={styles.backPlain}>
        <Ionicons name="chevron-back" size={24} color={Brand.text} />
      </Pressable>
      {error && !loading ? (
        <EmptyState
          icon={error instanceof ApiError && error.status === 404 ? 'storefront-outline' : 'cloud-offline-outline'}
          title={error instanceof ApiError && error.status === 404 ? 'Shop not available' : 'Could not load this shop'}
          message={error instanceof ApiError && error.status === 404 ? error.message : 'Check your connection and try again.'}
          actionLabel="Try again"
          onAction={reload}
        />
      ) : (
        <View style={styles.loading}>
          <Skeleton height={width / HERO_RATIO} radius={0} />
          <View style={styles.body}>
            <Skeleton height={24} width="60%" />
            <Skeleton height={14} width="40%" />
            <Skeleton height={88} radius={18} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  loading: { gap: Spacing.three },
  body: { padding: Spacing.three, gap: Spacing.two },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { ...Typography.title, color: Brand.text, flexShrink: 1 },
  muted: { ...Typography.caption, color: Brand.textMuted },
  faint: { ...Typography.caption, fontSize: 12, color: Brand.textFaint },
  text: { ...Typography.body, color: Brand.text, lineHeight: 22 },
  facts: { gap: Spacing.two, marginTop: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  fact: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  factText: { ...Typography.body, fontSize: 14, color: Brand.text, flexShrink: 1 },
  section: { gap: Spacing.two, marginTop: Spacing.three },
  overline: { ...Typography.overline, color: Brand.textMuted },
  product: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  productHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.two },
  productName: { ...Typography.bodyStrong, color: Brand.text, flexShrink: 1 },
  productPrice: { ...Typography.bodyStrong, fontSize: 14, color: Brand.primarySoft, textAlign: 'right', flexShrink: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, marginTop: Spacing.one },
  dots: { position: 'absolute', bottom: Spacing.two, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { backgroundColor: Brand.text, width: 16 },
  back: { position: 'absolute', left: Spacing.three, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(13,12,18,0.72)' },
  backPlain: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.two },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    backgroundColor: Brand.surface,
    borderTopWidth: 1,
    borderTopColor: Brand.border,
  },
  barText: { flex: 1, gap: 2 },
  barPrice: { ...Typography.bodyStrong, color: Brand.text },
  barButton: { width: 150 },
});
