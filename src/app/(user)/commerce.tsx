/**
 * Customer Commerce Screen
 * Mirrors: ruxstar-frontend-services/app/customer/commerce/page.tsx
 *
 * Flow:
 *   Shop list → tap shop → product list + cart → pay via Cashfree → orders screen
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/hooks/useTheme';
import { useCashfreePayment } from '@/utils/cashfree-native';
import {
  listCommerceShops,
  getCommerceShop,
  createCommerceOrder,
  payCommerceOrder,
  type CommerceShop,
  type CommerceProduct,
} from '@/services/commerce-service';

function money(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

type CartLine = { product: CommerceProduct; quantity: number };

// ─── Shop List Card ───────────────────────────────────────────────────────────

function ShopCard({ shop, onPress }: { shop: CommerceShop; onPress: () => void }) {
  const { brand } = useTheme();
  const closed  = !shop.acceptingOrders;
  const soldOut = !closed && (shop.inStockCount ?? shop.productCount ?? 0) === 0;

  return (
    <Pressable
      style={({ pressed }) => [
        sc.card,
        {
          backgroundColor: brand.surface1,
          borderColor:     brand.border1,
          opacity: closed ? 0.55 : pressed ? 0.8 : 1,
        },
      ]}
      onPress={onPress}
      disabled={closed}
    >
      <View style={sc.thumb}>
        {shop.thumbnailUrl ? (
          <Image source={{ uri: shop.thumbnailUrl }} style={sc.thumbImg} />
        ) : (
          <Text style={sc.thumbEmoji}>🛍️</Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={sc.nameRow}>
          <Text style={[sc.name, { color: brand.cream }]} numberOfLines={1}>{shop.name}</Text>
          {closed && (
            <View style={[sc.tagClosed, { backgroundColor: brand.surface2, borderColor: brand.border1 }]}>
              <Text style={[sc.tagText, { color: brand.creamMuted }]}>Closed</Text>
            </View>
          )}
          {soldOut && !closed && (
            <View style={[sc.tagSoldOut]}>
              <Text style={sc.tagTextSoldOut}>Sold out</Text>
            </View>
          )}
        </View>
        {!!shop.address && (
          <Text style={[sc.addr, { color: brand.creamSub }]} numberOfLines={1}>{shop.address}</Text>
        )}
        <Text style={[sc.meta, { color: brand.creamMuted }]}>
          {closed
            ? 'Temporarily offline'
            : soldOut
              ? 'Everything sold out — check back soon'
              : `${shop.inStockCount ?? shop.productCount ?? 0} product${
                  (shop.inStockCount ?? shop.productCount ?? 0) === 1 ? '' : 's'
                } available${shop.minOrderValue > 0 ? ` · min ${money(shop.minOrderValue)}` : ''}`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={brand.creamMuted} />
    </Pressable>
  );
}

const sc = StyleSheet.create({
  card:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.three },
  thumb:      { width: 52, height: 52, borderRadius: Radius.lg, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  thumbImg:   { width: '100%', height: '100%' },
  thumbEmoji: { fontSize: 22 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name:       { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  addr:       { fontSize: 11 },
  meta:       { fontSize: 11 },
  tagClosed:  { borderRadius: Radius.pill, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  tagText:    { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  tagSoldOut: { borderRadius: Radius.pill, backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.30)', paddingHorizontal: 7, paddingVertical: 2 },
  tagTextSoldOut: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', color: '#D97706', letterSpacing: 0.4 },
});

// ─── Product Item ─────────────────────────────────────────────────────────────

function ProductItem({
  product,
  qty,
  onSetQty,
}: {
  product:  CommerceProduct;
  qty:      number;
  onSetQty: (q: number) => void;
}) {
  const { brand } = useTheme();
  const soldOut = product.stock <= 0;

  return (
    <View style={[pi.wrap, { backgroundColor: brand.surface1, borderColor: brand.border1, opacity: soldOut ? 0.55 : 1 }]}>
      <View style={pi.imgBox}>
        {product.coverUrl ? (
          <Image source={{ uri: product.coverUrl }} style={pi.img} />
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[pi.name, { color: brand.cream }]}>{product.name}</Text>
        {!!product.description && (
          <Text style={[pi.desc, { color: brand.creamSub }]} numberOfLines={2}>{product.description}</Text>
        )}
        <View style={pi.metaRow}>
          <Text style={[pi.price, { color: brand.success }]}>{money(product.price)}</Text>
          <Text style={[pi.stock, { color: soldOut ? brand.error : brand.creamMuted }]}>
            {soldOut ? 'Out of stock' : `${product.stock} left`}
          </Text>
        </View>
      </View>

      <View style={pi.qtyBox}>
        {soldOut ? (
          <View style={[pi.unavailBadge, { backgroundColor: brand.surface2, borderColor: brand.border1 }]}>
            <Text style={[pi.unavailText, { color: brand.creamMuted }]}>Unavailable</Text>
          </View>
        ) : qty > 0 ? (
          <>
            <Pressable style={[pi.qtyBtn, { borderColor: brand.border1 }]} onPress={() => onSetQty(qty - 1)}>
              <Text style={[pi.qtyBtnText, { color: brand.cream }]}>−</Text>
            </Pressable>
            <Text style={[pi.qty, { color: brand.cream }]}>{qty}</Text>
            <Pressable
              style={[pi.qtyBtn, { borderColor: brand.border1 }]}
              onPress={() => onSetQty(qty + 1)}
              disabled={qty >= product.stock}
            >
              <Text style={[pi.qtyBtnText, { color: brand.cream }]}>+</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={[pi.addBtn, { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.30)' }]}
            onPress={() => onSetQty(1)}
          >
            <Text style={pi.addBtnText}>Add</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const pi = StyleSheet.create({
  wrap:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.two + 2 },
  imgBox:     { width: 60, height: 60, borderRadius: Radius.lg, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', flexShrink: 0 },
  img:        { width: '100%', height: '100%' },
  name:       { fontSize: 13, fontWeight: '700' },
  desc:       { fontSize: 11, lineHeight: 15 },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  price:      { fontSize: 13, fontWeight: '700' },
  stock:      { fontSize: 10 },
  qtyBox:     { alignItems: 'center', flexDirection: 'row', gap: 6, flexShrink: 0 },
  qtyBtn:     { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, fontWeight: '600' },
  qty:        { width: 22, textAlign: 'center', fontSize: 13, fontWeight: '700' },
  addBtn:     { borderRadius: Radius.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },
  unavailBadge: { borderRadius: Radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  unavailText:  { fontSize: 10, fontWeight: '600' },
});

// ─── Cart Footer ──────────────────────────────────────────────────────────────

function CartFooter({
  cart,
  shop,
  notes,
  onNotesChange,
  onCheckout,
  paying,
}: {
  cart:           CartLine[];
  shop:           CommerceShop;
  notes:          string;
  onNotesChange:  (v: string) => void;
  onCheckout:     () => void;
  paying:         boolean;
}) {
  const { brand } = useTheme();
  const total = cart.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const count = cart.reduce((s, l) => s + l.quantity, 0);

  return (
    <View style={[cf.wrap, { backgroundColor: brand.bg, borderTopColor: brand.border1 }]}>
      <TextInput
        style={[cf.notes, { backgroundColor: brand.surface1, borderColor: brand.border1, color: brand.cream }]}
        value={notes}
        onChangeText={onNotesChange}
        placeholder="Order notes (optional)"
        placeholderTextColor={brand.creamMuted}
        multiline
        numberOfLines={2}
      />
      <View style={cf.row}>
        <View>
          <Text style={[cf.summary, { color: brand.cream }]}>
            {count} item{count === 1 ? '' : 's'} · {money(total)}
          </Text>
          {shop.minOrderValue > 0 && (
            <Text style={[cf.min, { color: brand.creamMuted }]}>
              Min order {money(shop.minOrderValue)} · Pickup after payment
            </Text>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [cf.payBtn, { opacity: paying || pressed ? 0.55 : 1 }]}
          onPress={onCheckout}
          disabled={paying}
        >
          {paying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={cf.payBtnText}>Pay & order</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const cf = StyleSheet.create({
  wrap:       { borderTopWidth: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.three, gap: Spacing.two },
  notes:      { borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.two + 2, paddingVertical: 9, fontSize: 13, minHeight: 44, textAlignVertical: 'top' },
  row:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  summary:    { fontSize: 14, fontWeight: '700' },
  min:        { fontSize: 11, marginTop: 2 },
  payBtn:     { backgroundColor: '#7C3AED', borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: 12 },
  payBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CustomerCommerceScreen() {
  const token   = useAuthStore((s) => s.token);
  const { brand } = useTheme();

  // Shop list state
  const [shops,      setShops]      = useState<CommerceShop[]>([]);
  const [loadingList,setLoadingList]= useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError,  setListError]  = useState('');
  const [query,      setQuery]      = useState('');

  // Shop detail state
  const [shopId,       setShopId]       = useState<string | null>(null);
  const [shop,         setShop]         = useState<CommerceShop | null>(null);
  const [products,     setProducts]     = useState<CommerceProduct[]>([]);
  const [loadingShop,  setLoadingShop]  = useState(false);
  const [shopError,    setShopError]    = useState('');

  // Cart state
  const [cart,    setCart]    = useState<CartLine[]>([]);
  const [notes,   setNotes]   = useState('');
  const [paying,  setPaying]  = useState(false);
  const [payError,setPayError]= useState('');

  const { startPayment, paying: cfPaying } = useCashfreePayment({
    onSuccess: () => {
      router.replace('/(user)/orders' as never);
    },
    onError: (msg) => {
      setPayError(msg);
      setPaying(false);
    },
  });

  const loadShops = useCallback(async (isRefresh = false) => {
    if (!token) return;
    try {
      isRefresh ? setRefreshing(true) : setLoadingList(true);
      setListError('');
      setShops(await listCommerceShops(token));
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : 'Could not load shops');
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void loadShops(); }, [loadShops]));

  useEffect(() => {
    if (!shopId || !token) return;
    let cancelled = false;
    (async () => {
      setLoadingShop(true);
      setShopError('');
      setCart([]);
      try {
        const data = await getCommerceShop(token, shopId);
        if (!cancelled) {
          setShop(data.shop);
          setProducts(data.products);
        }
      } catch (e: unknown) {
        if (!cancelled) setShopError(e instanceof Error ? e.message : 'Could not load shop');
      } finally {
        if (!cancelled) setLoadingShop(false);
      }
    })();
    return () => { cancelled = true; };
  }, [shopId, token]);

  const filteredShops = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [shops, query]);

  function setQty(product: CommerceProduct, quantity: number) {
    setCart((prev) => {
      const next = prev.filter((l) => l.product.id !== product.id);
      if (quantity <= 0) return next;
      return [...next, { product, quantity: Math.min(quantity, product.stock) }];
    });
  }

  async function checkout() {
    if (!shop || !cart.length || !token) return;
    if (shop.minOrderValue > 0) {
      const total = cart.reduce((s, l) => s + l.product.price * l.quantity, 0);
      if (total < shop.minOrderValue) {
        Alert.alert('Minimum order', `Minimum order is ${money(shop.minOrderValue)}`);
        return;
      }
    }
    setPaying(true);
    setPayError('');
    try {
      const order = await createCommerceOrder(token, {
        businessId: shop.id,
        items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        notes: notes.trim() || undefined,
      });
      const { payment } = await payCommerceOrder(token, order.id);
      startPayment({
        paymentSessionId: payment.paymentSessionId,
        orderId:          payment.cashfreeOrderId,
        bookingId:        order.id,
        mode:             payment.mode,
      });
    } catch (e: unknown) {
      setPayError(e instanceof Error ? e.message : 'Could not start checkout');
      setPaying(false);
    }
  }

  function goBack() {
    setShopId(null);
    setShop(null);
    setProducts([]);
    setCart([]);
    setNotes('');
    setPayError('');
  }

  const isPayingAny = paying || cfPaying;

  // ── Shop detail view ──────────────────────────────────────────────────────────

  if (shopId && shop) {
    const closed = !shop.acceptingOrders;

    return (
      <SafeAreaView style={[s.screen, { backgroundColor: brand.bg }]} edges={['top']}>
        {/* Header */}
        <View style={[s.shopHeader, { borderBottomColor: brand.border1 }]}>
          <Pressable style={s.backBtn} onPress={goBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={brand.creamSub} />
            <Text style={[s.backText, { color: brand.creamSub }]}>All shops</Text>
          </Pressable>
          <View style={s.shopTitleRow}>
            <Text style={[s.shopTitle, { color: brand.cream }]}>{shop.name}</Text>
            {closed && (
              <View style={[sc.tagClosed, { backgroundColor: brand.surface2, borderColor: brand.border1 }]}>
                <Text style={[sc.tagText, { color: brand.creamMuted }]}>Closed</Text>
              </View>
            )}
          </View>
          {!!shop.address && (
            <Text style={[s.shopAddr, { color: brand.creamSub }]}>{shop.address}</Text>
          )}
          {closed ? (
            <Text style={[s.shopNote, { color: brand.creamSub }]}>
              This shop is temporarily offline and not accepting new orders.
            </Text>
          ) : !!shop.notes ? (
            <Text style={[s.shopNote, { color: brand.creamSub }]}>{shop.notes}</Text>
          ) : null}
        </View>

        {/* Product list */}
        {loadingShop ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={brand.primary} />
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(p) => p.id}
            contentContainerStyle={s.productList}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              (!!shopError || !!payError) ? (
                <Text style={s.errorText}>{shopError || payError}</Text>
              ) : closed ? (
                <Text style={[s.shopNote, { color: brand.creamSub, marginBottom: Spacing.two }]}>
                  Come back when the shop is open again.
                </Text>
              ) : null
            }
            ListEmptyComponent={
              !closed ? (
                <View style={s.centered}>
                  <Text style={[s.emptySub, { color: brand.creamSub }]}>
                    This shop has no products yet.
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const qty = cart.find((l) => l.product.id === item.id)?.quantity ?? 0;
              return (
                <ProductItem
                  product={item}
                  qty={qty}
                  onSetQty={(q) => setQty(item, q)}
                />
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          />
        )}

        {cart.length > 0 && !closed && (
          <CartFooter
            cart={cart}
            shop={shop}
            notes={notes}
            onNotesChange={setNotes}
            onCheckout={() => void checkout()}
            paying={isPayingAny}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── Shop list view ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: brand.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: brand.border1 }]}>
        <Text style={[s.eyebrow, { color: brand.creamMuted }]}>Shop</Text>
        <Text style={[s.title, { color: brand.cream }]}>Commerce</Text>
        <Text style={[s.sub, { color: brand.creamSub }]}>Browse shops, add to cart, pay, then pick up.</Text>
        <View style={[s.searchBox, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
          <Ionicons name="search-outline" size={16} color={brand.creamMuted} />
          <TextInput
            style={[s.searchInput, { color: brand.cream }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search shops"
            placeholderTextColor={brand.creamMuted}
          />
        </View>
      </View>

      {/* List */}
      {loadingList ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredShops}
          keyExtractor={(sh) => sh.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadShops(true)}
              tintColor={brand.primary}
            />
          }
          ListHeaderComponent={
            listError ? <Text style={s.errorText}>{listError}</Text> : null
          }
          ListEmptyComponent={
            <View style={s.centered}>
              <Text style={s.emptyEmoji}>🏪</Text>
              <Text style={[s.emptyTitle, { color: brand.cream }]}>No shops yet</Text>
              <Text style={[s.emptySub, { color: brand.creamSub }]}>
                Live shops will appear here once they are open.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ShopCard shop={item} onPress={() => setShopId(item.id)} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:      { flex: 1 },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },

  header:      { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.three, borderBottomWidth: 1, gap: 3 },
  eyebrow:     { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  title:       { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  sub:         { fontSize: 13 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.two + 2, paddingVertical: 10, marginTop: Spacing.two },
  searchInput: { flex: 1, fontSize: 14 },

  listContent: { padding: Spacing.four, paddingBottom: 100 },

  shopHeader:   { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.three, borderBottomWidth: 1, gap: 4 },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 6 },
  backText:     { fontSize: 13 },
  shopTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  shopTitle:    { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, flexShrink: 1 },
  shopAddr:     { fontSize: 12 },
  shopNote:     { fontSize: 13, lineHeight: 18 },

  productList:  { padding: Spacing.four, paddingBottom: 100 },
  errorText:    { color: '#EF4444', fontSize: 13, marginBottom: Spacing.two },

  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
