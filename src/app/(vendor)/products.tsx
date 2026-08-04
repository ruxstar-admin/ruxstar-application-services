/**
 * Vendor Commerce Products
 * Replaces the old "Analytics coming soon" placeholder.
 *
 * Flow:
 *   1. Pick a commerce business (if the vendor has multiple)
 *   2. List products for that business
 *   3. Toggle active/inactive inline
 *   4. "Add product" sheet — name, description, price, stock
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useKycStore } from '@/stores/kyc-store';
import { useBusinessStore } from '@/stores/business-store';
import { useTheme } from '@/hooks/useTheme';
import VendorHeader from '@/components/vendor/VendorHeader';
import {
  listVendorCommerceProducts,
  createCommerceProduct,
  updateCommerceProduct,
  deleteCommerceProduct,
  type CommerceProduct,
} from '@/services/commerce-service';

function money(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

// ─── Add / Edit Product Sheet ─────────────────────────────────────────────────

type ProductForm = {
  name: string;
  description: string;
  price: string;
  stock: string;
  active: boolean;
};

function ProductSheet({
  visible,
  initial,
  onClose,
  onSave,
  saving,
  error,
}: {
  visible:  boolean;
  initial?: Partial<ProductForm>;
  onClose:  () => void;
  onSave:   (form: ProductForm) => void;
  saving:   boolean;
  error:    string;
}) {
  const { brand } = useTheme();
  const [form, setForm] = useState<ProductForm>({
    name:        initial?.name        ?? '',
    description: initial?.description ?? '',
    price:       initial?.price       ?? '',
    stock:       initial?.stock       ?? '',
    active:      initial?.active      ?? true,
  });

  useEffect(() => {
    if (visible) {
      setForm({
        name:        initial?.name        ?? '',
        description: initial?.description ?? '',
        price:       initial?.price       ?? '',
        stock:       initial?.stock       ?? '',
        active:      initial?.active      ?? true,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const inputStyle = [sh.input, { backgroundColor: brand.surface2, borderColor: brand.border1, color: brand.cream }];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sh.overlay}>
        <Pressable style={sh.backdrop} onPress={onClose} />
        <View style={[sh.sheet, { backgroundColor: brand.bg, borderColor: brand.border1 }]}>
          <View style={sh.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[sh.title, { color: brand.cream }]}>
              {initial?.name ? 'Edit product' : 'Add product'}
            </Text>

            {!!error && (
              <Text style={sh.error}>{error}</Text>
            )}

            <Text style={[sh.label, { color: brand.creamSub }]}>Name *</Text>
            <TextInput
              style={inputStyle}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Product name"
              placeholderTextColor={brand.creamMuted}
            />

            <Text style={[sh.label, { color: brand.creamSub }]}>Description</Text>
            <TextInput
              style={[...inputStyle, { minHeight: 68, textAlignVertical: 'top' }]}
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder="Short description (optional)"
              placeholderTextColor={brand.creamMuted}
              multiline
            />

            <View style={sh.row}>
              <View style={{ flex: 1 }}>
                <Text style={[sh.label, { color: brand.creamSub }]}>Price (₹) *</Text>
                <TextInput
                  style={inputStyle}
                  value={form.price}
                  onChangeText={(v) => setForm((f) => ({ ...f, price: v.replace(/[^0-9.]/g, '') }))}
                  placeholder="0"
                  placeholderTextColor={brand.creamMuted}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[sh.label, { color: brand.creamSub }]}>Stock *</Text>
                <TextInput
                  style={inputStyle}
                  value={form.stock}
                  onChangeText={(v) => setForm((f) => ({ ...f, stock: v.replace(/[^0-9]/g, '') }))}
                  placeholder="0"
                  placeholderTextColor={brand.creamMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={[sh.switchRow, { borderColor: brand.border1 }]}>
              <View>
                <Text style={[sh.switchLabel, { color: brand.cream }]}>Available for sale</Text>
                <Text style={[sh.switchSub, { color: brand.creamSub }]}>Toggle off to hide from customers</Text>
              </View>
              <Switch
                value={form.active}
                onValueChange={(v) => setForm((f) => ({ ...f, active: v }))}
                trackColor={{ false: 'rgba(255,255,255,0.10)', true: `${brand.success}80` }}
                thumbColor="#fff"
              />
            </View>

            <View style={sh.actions}>
              <Pressable
                style={({ pressed }) => [sh.cancelBtn, { borderColor: brand.border1, opacity: pressed ? 0.6 : 1 }]}
                onPress={onClose}
              >
                <Text style={[sh.cancelBtnText, { color: brand.creamSub }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [sh.saveBtn, { opacity: saving || pressed ? 0.55 : 1 }]}
                onPress={() => onSave(form)}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={sh.saveBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const sh = StyleSheet.create({
  overlay:     { flex: 1, justifyContent: 'flex-end' },
  backdrop:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.50)' },
  sheet:       { borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, borderWidth: 1, borderBottomWidth: 0, padding: Spacing.four, paddingTop: Spacing.two, maxHeight: '90%' },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: Spacing.three },
  title:       { fontSize: 18, fontWeight: '800', marginBottom: Spacing.three },
  error:       { color: '#EF4444', fontSize: 13, marginBottom: Spacing.two },
  label:       { fontSize: 12, fontWeight: '600', marginBottom: 5 },
  input:       { borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.two + 2, paddingVertical: 11, fontSize: 14, marginBottom: Spacing.two },
  row:         { flexDirection: 'row', gap: Spacing.two },
  switchRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: Spacing.two, marginTop: Spacing.one, marginBottom: Spacing.three },
  switchLabel: { fontSize: 14, fontWeight: '600' },
  switchSub:   { fontSize: 11, marginTop: 2 },
  actions:     { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two, paddingBottom: Spacing.four },
  cancelBtn:   { flex: 1, borderWidth: 1, borderRadius: Radius.pill, alignItems: 'center', paddingVertical: 13 },
  cancelBtnText:{ fontSize: 14, fontWeight: '600' },
  saveBtn:     { flex: 1, backgroundColor: '#7C3AED', borderRadius: Radius.pill, alignItems: 'center', paddingVertical: 13 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onToggle,
  onEdit,
  onDelete,
  toggling,
}: {
  product:  CommerceProduct;
  onToggle: () => void;
  onEdit:   () => void;
  onDelete: () => void;
  toggling: boolean;
}) {
  const { brand } = useTheme();
  const soldOut = product.stock <= 0;

  return (
    <View style={[pc.card, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
      <View style={pc.row}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[pc.name, { color: brand.cream }]}>{product.name}</Text>
          {!!product.description && (
            <Text style={[pc.desc, { color: brand.creamSub }]} numberOfLines={2}>{product.description}</Text>
          )}
          <View style={pc.metaRow}>
            <Text style={[pc.price, { color: brand.success }]}>{money(product.price)}</Text>
            <Text style={[pc.stock, { color: soldOut ? brand.error : brand.creamMuted }]}>
              {soldOut ? 'Out of stock' : `${product.stock} left`}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          {toggling ? (
            <ActivityIndicator size="small" color={brand.primary} />
          ) : (
            <Switch
              value={product.active}
              onValueChange={onToggle}
              trackColor={{ false: 'rgba(255,255,255,0.10)', true: `${brand.success}80` }}
              thumbColor="#fff"
            />
          )}
          <Text style={[pc.toggleLabel, { color: product.active ? brand.success : brand.creamMuted }]}>
            {product.active ? 'Live' : 'Hidden'}
          </Text>
        </View>
      </View>

      <View style={[pc.footer, { borderTopColor: brand.border1 }]}>
        <Pressable style={({ pressed }) => [pc.footerBtn, { opacity: pressed ? 0.5 : 1 }]} onPress={onEdit}>
          <Ionicons name="pencil-outline" size={14} color={brand.creamSub} />
          <Text style={[pc.footerBtnText, { color: brand.creamSub }]}>Edit</Text>
        </Pressable>
        <View style={[pc.footerDivider, { backgroundColor: brand.border1 }]} />
        <Pressable style={({ pressed }) => [pc.footerBtn, { opacity: pressed ? 0.5 : 1 }]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={14} color={brand.error} />
          <Text style={[pc.footerBtnText, { color: brand.error }]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  card:         { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  row:          { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three },
  name:         { fontSize: 14, fontWeight: '700' },
  desc:         { fontSize: 12, lineHeight: 17 },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: 3 },
  price:        { fontSize: 14, fontWeight: '700' },
  stock:        { fontSize: 11 },
  toggleLabel:  { fontSize: 10, fontWeight: '700' },
  footer:       { flexDirection: 'row', borderTopWidth: 1 },
  footerBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10 },
  footerBtnText:{ fontSize: 12, fontWeight: '600' },
  footerDivider:{ width: 1 },
});

// ─── Business Picker ──────────────────────────────────────────────────────────

function BusinessPicker({
  businesses,
  selected,
  onSelect,
}: {
  businesses: { id: string; name: string }[];
  selected:   string;
  onSelect:   (id: string) => void;
}) {
  const { brand } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two }}
    >
      {businesses.map((b) => {
        const active = b.id === selected;
        return (
          <Pressable
            key={b.id}
            style={[bp.chip, {
              backgroundColor: active ? brand.primary : brand.surface1,
              borderColor:     active ? brand.primary : brand.border1,
            }]}
            onPress={() => onSelect(b.id)}
          >
            <Text style={[bp.chipText, { color: active ? '#fff' : brand.creamSub }]}>{b.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const bp = StyleSheet.create({
  chip:     { borderRadius: Radius.pill, borderWidth: 1, paddingHorizontal: Spacing.three, paddingVertical: 7 },
  chipText: { fontSize: 12, fontWeight: '600' },
});

// ─── KYC Gate ─────────────────────────────────────────────────────────────────

function KycGate() {
  const { brand } = useTheme();
  return (
    <View style={[kg.wrap, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
      <Text style={kg.lock}>🔒</Text>
      <Text style={[kg.title, { color: brand.cream }]}>KYC required</Text>
      <Text style={[kg.sub, { color: brand.creamSub }]}>
        Complete identity verification to manage products.
      </Text>
      <Pressable style={kg.btn} onPress={() => router.push('/(vendor)/kyc' as never)}>
        <Text style={kg.btnText}>Get your Ruxstar Card</Text>
      </Pressable>
    </View>
  );
}

const kg = StyleSheet.create({
  wrap:    { margin: Spacing.four, borderRadius: Radius.xxl, borderWidth: 1, padding: Spacing.five, alignItems: 'center', gap: Spacing.two },
  lock:    { fontSize: 40 },
  title:   { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  sub:     { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  btn:     { marginTop: Spacing.two, backgroundColor: '#7C3AED', borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProductsScreen() {
  const token     = useAuthStore((s) => s.token);
  const kycStatus = useKycStore((s) => s.status);
  const { businesses, loadBusinesses } = useBusinessStore();
  const { brand } = useTheme();

  const kycVerified = kycStatus?.status === 'verified';

  const commerceBusinesses = useMemo(
    () => businesses.filter((b) => b.module === 'commerce'),
    [businesses],
  );

  const [selectedId,  setSelectedId]  = useState('');
  const [products,    setProducts]    = useState<CommerceProduct[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState('');
  const [togglingId,  setTogglingId]  = useState('');
  const [sheetOpen,   setSheetOpen]   = useState(false);
  const [editTarget,  setEditTarget]  = useState<CommerceProduct | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState('');

  const activeBusinessId = selectedId || commerceBusinesses[0]?.id || '';

  useFocusEffect(useCallback(() => {
    if (!token) return;
    void loadBusinesses(token);
  }, [token, loadBusinesses]));

  const loadProducts = useCallback(async (isRefresh = false) => {
    if (!token || !activeBusinessId) return;
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError('');
      setProducts(await listVendorCommerceProducts(token, activeBusinessId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, activeBusinessId]);

  useEffect(() => {
    if (kycVerified && activeBusinessId) void loadProducts();
  }, [kycVerified, activeBusinessId, loadProducts]);

  async function handleToggle(product: CommerceProduct) {
    if (!token) return;
    setTogglingId(product.id);
    try {
      const updated = await updateCommerceProduct(token, activeBusinessId, product.id, { active: !product.active });
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch {
      Alert.alert('Error', 'Could not update product status.');
    } finally {
      setTogglingId('');
    }
  }

  async function handleSave(form: ProductForm) {
    if (!token) return;
    if (!form.name.trim()) { setSaveError('Name is required.'); return; }
    const price = parseFloat(form.price);
    const stock = parseInt(form.stock, 10);
    if (isNaN(price) || price < 0) { setSaveError('Enter a valid price.'); return; }
    if (isNaN(stock) || stock < 0) { setSaveError('Enter a valid stock count.'); return; }

    setSaving(true);
    setSaveError('');
    try {
      if (editTarget) {
        const updated = await updateCommerceProduct(token, activeBusinessId, editTarget.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          price,
          stock,
          active: form.active,
        });
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await createCommerceProduct(token, activeBusinessId, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          price,
          stock,
          active: form.active,
        });
        setProducts((prev) => [created, ...prev]);
      }
      setSheetOpen(false);
      setEditTarget(null);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Could not save product.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(product: CommerceProduct) {
    if (!token) return;
    Alert.alert(
      'Delete product',
      `Delete "${product.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCommerceProduct(token, activeBusinessId, product.id);
              setProducts((prev) => prev.filter((p) => p.id !== product.id));
            } catch {
              Alert.alert('Error', 'Could not delete product.');
            }
          },
        },
      ],
    );
  }

  const noCommerceShop = kycVerified && commerceBusinesses.length === 0;

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: brand.bg }]} edges={['top']}>
      <VendorHeader />

      {!kycVerified ? (
        <KycGate />
      ) : noCommerceShop ? (
        <View style={s.centered}>
          <Text style={s.emptyEmoji}>🏬</Text>
          <Text style={[s.emptyTitle, { color: brand.cream }]}>No commerce shop yet</Text>
          <Text style={[s.emptySub, { color: brand.creamSub }]}>
            Set up a commerce business first to manage products.
          </Text>
          <Pressable style={s.setupBtn} onPress={() => router.push('/(vendor)/businesses' as never)}>
            <Text style={s.setupBtnText}>Go to Businesses</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {commerceBusinesses.length > 1 && (
            <BusinessPicker
              businesses={commerceBusinesses}
              selected={activeBusinessId}
              onSelect={setSelectedId}
            />
          )}

          <FlatList
            data={products}
            keyExtractor={(p) => p.id}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadProducts(true)}
                tintColor={brand.primary}
              />
            }
            ListHeaderComponent={
              <>
                <View style={s.listHeader}>
                  <Text style={[s.listTitle, { color: brand.cream }]}>
                    Products · {products.length}
                  </Text>
                  <Pressable
                    style={s.addBtn}
                    onPress={() => { setEditTarget(null); setSaveError(''); setSheetOpen(true); }}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={s.addBtnText}>Add</Text>
                  </Pressable>
                </View>
                {!!error && (
                  <Text style={s.errorText}>{error}</Text>
                )}
              </>
            }
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator size="large" color={brand.primary} style={{ marginTop: Spacing.five }} />
              ) : (
                <View style={s.centered}>
                  <Text style={s.emptyEmoji}>📦</Text>
                  <Text style={[s.emptyTitle, { color: brand.cream }]}>No products yet</Text>
                  <Text style={[s.emptySub, { color: brand.creamSub }]}>
                    Add your first product to start selling.
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                onToggle={() => handleToggle(item)}
                onEdit={() => { setEditTarget(item); setSaveError(''); setSheetOpen(true); }}
                onDelete={() => handleDelete(item)}
                toggling={togglingId === item.id}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.two + 2 }} />}
          />
        </>
      )}

      <ProductSheet
        visible={sheetOpen}
        initial={editTarget ? {
          name:        editTarget.name,
          description: editTarget.description,
          price:       String(editTarget.price),
          stock:       String(editTarget.stock),
          active:      editTarget.active,
        } : undefined}
        onClose={() => { setSheetOpen(false); setEditTarget(null); }}
        onSave={handleSave}
        saving={saving}
        error={saveError}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:   { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
  list:     { padding: Spacing.four, paddingBottom: 100 },

  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.two },
  listTitle:  { fontSize: 15, fontWeight: '700' },
  addBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7C3AED', borderRadius: Radius.pill, paddingHorizontal: Spacing.two + 4, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  errorText:  { color: '#EF4444', fontSize: 13, marginBottom: Spacing.two },

  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  setupBtn:   { marginTop: Spacing.two, backgroundColor: '#7C3AED', borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: 12 },
  setupBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
});
