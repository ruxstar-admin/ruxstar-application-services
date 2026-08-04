/**
 * Customer Print Screen — 4-step print order wizard (theme-aware)
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing } from '@/constants/theme';
import { getPrintCatalog, listPrintShops, createPrintOrder } from '@/services/print-service';
import type { PrintCategory, PrintShop, PrintOrderDraft } from '@/types/print';
import { categoryCardMeta, categorySearchText } from '@/lib/print-requirements';
import { orderAttributeRows } from '@/lib/print-pricing';
import {
  PrintShopCard,
  PrintShopEmptyState,
} from '@/components/print/PrintShopCard';
import { PrintConfigurator } from '@/components/print/PrintConfigurator';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CAT_EMOJI: Record<string, string> = {
  tshirts:        '👕',
  hoodies:        '🧥',
  jerseys:        '⚽',
  business_cards: '💼',
  posters:        '🖼️',
  flex_banners:   '🏳️',
  stickers:       '⭐',
  invitations:    '💌',
  photo_prints:   '📷',
  documents:      '📄',
};

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

type Step = 1 | 2 | 3 | 4;

// ─── Category card ────────────────────────────────────────────────────────────

function CategoryCard({
  category,
  onPick,
}: {
  category: PrintCategory;
  onPick:   () => void;
}) {
  const { brand } = useTheme();
  const meta = categoryCardMeta(category);
  return (
    <Pressable
      style={({ pressed }) => [
        s.catCard,
        { backgroundColor: brand.surface1, borderColor: brand.border1 },
        pressed && { opacity: 0.72 },
      ]}
      onPress={onPick}
      accessibilityRole="button"
      accessibilityLabel={category.label}
    >
      <Text style={s.catEmoji}>{CAT_EMOJI[category.id] ?? '🖨️'}</Text>
      <Text style={[s.catLabel, { color: brand.cream }]} numberOfLines={1}>{category.label}</Text>
      <Text style={[s.catUseCase, { color: brand.creamSub }]} numberOfLines={2}>{meta.useCase}</Text>
      <Text style={[s.catTurnaround, { color: brand.creamMuted }]}>{meta.turnaround}</Text>
    </Pressable>
  );
}

// ─── Review row ───────────────────────────────────────────────────────────────

function ReviewRow({
  label,
  value,
  multiline,
}: {
  label:      string;
  value:      string;
  multiline?: boolean;
}) {
  const { brand } = useTheme();
  return (
    <View style={[s.reviewRow, multiline && s.reviewRowMulti]}>
      <Text style={[s.reviewLabel, { color: brand.creamSub }]}>{label}</Text>
      <Text style={[s.reviewValue, { color: brand.cream }, multiline && s.reviewValueMulti]}>{value}</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function CustomerPrintScreen() {
  const { brand } = useTheme();
  const token = useAuthStore((s) => s.token);

  const [step,          setStep]          = useState<Step>(1);
  const [categories,    setCategories]    = useState<PrintCategory[]>([]);
  const [catLoading,    setCatLoading]    = useState(true);
  const [catSearch,     setCatSearch]     = useState('');
  const [selCategory,   setSelCategory]   = useState<PrintCategory | null>(null);
  const [city,          setCity]          = useState('');
  const [shops,         setShops]         = useState<PrintShop[]>([]);
  const [shopsLoading,  setShopsLoading]  = useState(false);
  const [shopsSearched, setShopsSearched] = useState(false);
  const [selShop,       setSelShop]       = useState<PrintShop | null>(null);
  const [draft,         setDraft]         = useState<PrintOrderDraft | null>(null);
  const [creating,      setCreating]      = useState(false);

  useEffect(() => {
    getPrintCatalog()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setCatLoading(false));
  }, []);

  const fetchShops = useCallback(async () => {
    if (!token || !selCategory || !city.trim()) {
      Alert.alert('Enter city', 'Please type a city name first.');
      return;
    }
    setShopsLoading(true);
    setShopsSearched(true);
    try {
      const result = await listPrintShops(token, selCategory.id, city.trim());
      setShops(result);
    } catch {
      Alert.alert('Error', 'Could not load shops. Check your connection and try again.');
      setShops([]);
    } finally {
      setShopsLoading(false);
    }
  }, [token, selCategory, city]);

  const handlePickCategory = (cat: PrintCategory) => {
    setSelCategory(cat);
    setShops([]);
    setShopsSearched(false);
    setStep(2);
  };

  const handlePickShop = (shop: PrintShop) => {
    setSelShop(shop);
    setStep(3);
  };

  const handleCheckout = (d: PrintOrderDraft) => {
    setDraft(d);
    setStep(4);
  };

  const handlePlaceOrder = async () => {
    if (!token || !draft) return;
    setCreating(true);
    try {
      const order = await createPrintOrder(token, {
        businessId: draft.shop.businessId,
        categoryId: draft.category.id,
        city:       draft.city,
        selection:  draft.selection,
        notes:      draft.notes || undefined,
        attributes: draft.attributes,
      });
      router.replace(`/(user)/print-order?orderId=${order.id}` as never);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to place order. Try again.');
    } finally {
      setCreating(false);
    }
  };

  const goBack = () => {
    if (step === 4) { setStep(2); return; }
    if (step === 3) { setStep(2); return; }
    if (step === 2) { setStep(1); return; }
    router.back();
  };

  // Step 3 — PrintConfigurator owns the entire screen
  if (step === 3 && selCategory && selShop) {
    return (
      <SafeAreaView style={[s.screen, { backgroundColor: brand.bg }]} edges={['top']}>
        <PrintConfigurator
          category={selCategory}
          shop={selShop}
          city={city.trim()}
          onBack={() => setStep(2)}
          onCheckout={handleCheckout}
        />
      </SafeAreaView>
    );
  }

  const filteredCats = catSearch.trim()
    ? categories.filter((c) =>
        categorySearchText(c).includes(catSearch.toLowerCase().trim()),
      )
    : categories;

  const stepTitles: Record<Step, string> = {
    1: '🖨️ Print',
    2: selCategory?.label ?? 'Choose Shop',
    3: 'Configure',
    4: '📋 Review Order',
  };
  const stepSubs: Record<Step, string> = {
    1: 'What would you like to print?',
    2: 'Find a print shop in your city',
    3: 'Customise your order',
    4: 'Confirm your order details',
  };

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: brand.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: brand.border1 }]}>
        <Pressable style={s.backBtn} onPress={goBack} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons
            name={step === 1 ? 'close-outline' : 'arrow-back'}
            size={22}
            color={brand.cream}
          />
        </Pressable>
        <View style={s.headerText}>
          <Text style={[s.headerTitle, { color: brand.cream }]}>{stepTitles[step]}</Text>
          <Text style={[s.headerSub, { color: brand.creamMuted }]}>{stepSubs[step]}</Text>
        </View>
        {/* Step pill */}
        <View style={[s.stepPill, { backgroundColor: brand.primaryGlow }]}>
          <Text style={[s.stepPillText, { color: brand.primary }]}>{step}/4</Text>
        </View>
      </View>

      {/* ── Step 1: Category grid ───────────────────────────────────────── */}
      {step === 1 && (
        <>
          <View style={[
            s.searchBar,
            { backgroundColor: brand.surface1, borderColor: brand.border1 },
          ]}>
            <Ionicons name="search-outline" size={16} color={brand.creamMuted} />
            <TextInput
              style={[s.searchInput, { color: brand.cream }]}
              placeholder="Search categories…"
              placeholderTextColor={brand.creamMuted}
              value={catSearch}
              onChangeText={setCatSearch}
            />
            {catSearch.length > 0 && (
              <Pressable onPress={() => setCatSearch('')}>
                <Ionicons name="close-circle" size={16} color={brand.creamMuted} />
              </Pressable>
            )}
          </View>

          {catLoading ? (
            <View style={s.centered}>
              <ActivityIndicator size="large" color={brand.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredCats}
              keyExtractor={(cat) => cat.id}
              numColumns={2}
              contentContainerStyle={s.catGrid}
              columnWrapperStyle={s.catRow}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <CategoryCard category={item} onPick={() => handlePickCategory(item)} />
              )}
              ListEmptyComponent={
                <View style={s.centered}>
                  <Text style={[s.emptyText, { color: brand.creamSub }]}>
                    No categories match "{catSearch}"
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* ── Step 2: City + Shop picker ──────────────────────────────────── */}
      {step === 2 && (
        <View style={s.flex}>
          <View style={s.cityRow}>
            <TextInput
              style={[
                s.cityInput,
                { backgroundColor: brand.surface1, borderColor: brand.border1, color: brand.cream },
              ]}
              placeholder="Enter your city (e.g. Mumbai)"
              placeholderTextColor={brand.creamMuted}
              value={city}
              onChangeText={setCity}
              onSubmitEditing={fetchShops}
              returnKeyType="search"
            />
            <Pressable
              style={[s.findBtn, { backgroundColor: brand.primary }, (!city.trim() || shopsLoading) && s.findBtnDisabled]}
              onPress={fetchShops}
              disabled={!city.trim() || shopsLoading}
            >
              {shopsLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.findBtnText}>Find</Text>
              }
            </Pressable>
          </View>

          <FlatList
            data={shops}
            keyExtractor={(shop) => shop.businessId}
            contentContainerStyle={s.shopsContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <PrintShopCard shop={item} onPick={handlePickShop} />
            )}
            ListEmptyComponent={
              shopsSearched && !shopsLoading ? (
                <PrintShopEmptyState />
              ) : !shopsSearched ? (
                <View style={s.shopHint}>
                  <Ionicons name="location-outline" size={28} color={brand.creamMuted} />
                  <Text style={[s.shopHintText, { color: brand.creamSub }]}>
                    Enter a city above to find {selCategory?.label} print shops near you
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      )}

      {/* ── Step 4: Review & place order ────────────────────────────────── */}
      {step === 4 && draft && (
        <ScrollView
          contentContainerStyle={s.reviewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Shop */}
          <View style={[s.reviewCard, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
            <Text style={[s.reviewSection, { color: brand.primary }]}>🏪  Print Shop</Text>
            <Text style={[s.reviewShopName, { color: brand.cream }]}>{draft.shop.name}</Text>
            <Text style={[s.reviewShopCity, { color: brand.creamSub }]}>{draft.city}</Text>
            {draft.shop.turnaroundDays > 0 && (
              <Text style={[s.reviewShopCity, { color: brand.creamMuted }]}>
                ⏱ ~{draft.shop.turnaroundDays}d turnaround
              </Text>
            )}
          </View>

          {/* Order details */}
          <View style={[s.reviewCard, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
            <Text style={[s.reviewSection, { color: brand.primary }]}>📋  Order Details</Text>
            <ReviewRow label="Category" value={`${CAT_EMOJI[draft.category.id] ?? '🖨️'} ${draft.category.label}`} />
            <ReviewRow label="Quantity" value={String(draft.quantity)} />
            {orderAttributeRows(draft.attributes).map((row) => (
              <ReviewRow key={row.label} label={row.label} value={row.value} />
            ))}
            {draft.notes ? (
              <ReviewRow label="Notes" value={draft.notes} multiline />
            ) : null}
          </View>

          {/* Price estimate */}
          <View style={[
            s.reviewCard,
            { backgroundColor: `${brand.success}06`, borderColor: `${brand.success}30` },
          ]}>
            <Text style={[s.estimatedLabel, { color: brand.creamMuted }]}>💰  Estimated price</Text>
            <Text style={[s.estimatedPrice, { color: brand.success }]}>{money(draft.price.total)}</Text>
            <Text style={[s.estimatedNote, { color: brand.creamSub }]}>
              Vendor will confirm final price before you pay
            </Text>
          </View>

          <Pressable
            style={[s.placeBtn, { backgroundColor: brand.primary }, creating && s.placeBtnDisabled]}
            onPress={handlePlaceOrder}
            disabled={creating}
          >
            {creating
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={s.placeBtnText}>Place Order</Text>
                </>
              )
            }
          </Pressable>

          <Text style={[s.disclaimer, { color: brand.creamMuted }]}>
            By placing this order you agree to share your contact details with the print shop.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles (layout only — no color tokens) ───────────────────────────────────

const s = StyleSheet.create({
  screen:  { flex: 1 },
  flex:    { flex: 1 },
  centered: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        Spacing.four,
    gap:            Spacing.two,
  },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop:        Spacing.three,
    paddingBottom:     Spacing.two,
    borderBottomWidth: 1,
  },
  backBtn:      { padding: 4 },
  headerText:   { flex: 1 },
  headerTitle:  { fontSize: 20, fontWeight: '800' },
  headerSub:    { fontSize: 12, marginTop: 1 },
  stepPill: {
    borderRadius:      Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical:   3,
  },
  stepPillText: { fontSize: 11, fontWeight: '700' },

  searchBar: {
    flexDirection:     'row',
    alignItems:        'center',
    borderRadius:      Radius.md,
    borderWidth:       1,
    marginHorizontal:  Spacing.four,
    marginBottom:      Spacing.two,
    marginTop:         Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical:   Spacing.two,
    gap:               Spacing.two,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  catGrid: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, paddingTop: Spacing.two },
  catRow:  { gap: Spacing.two, marginBottom: Spacing.two },
  catCard: {
    flex:         1,
    borderRadius: Radius.lg,
    borderWidth:  1,
    padding:      Spacing.three,
    gap:          Spacing.one,
  },
  catEmoji:      { fontSize: 28 },
  catLabel:      { fontSize: 14, fontWeight: '700', marginTop: 4 },
  catUseCase:    { fontSize: 11, lineHeight: 15 },
  catTurnaround: { fontSize: 10, marginTop: 2 },

  emptyText: { fontSize: 14, textAlign: 'center' },

  cityRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop:        Spacing.two,
    paddingBottom:     Spacing.two,
  },
  cityInput: {
    flex:              1,
    borderRadius:      Radius.md,
    borderWidth:       1,
    paddingHorizontal: Spacing.three,
    paddingVertical:   10,
    fontSize:          14,
  },
  findBtn: {
    borderRadius:      Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical:   10,
    minWidth:          56,
    alignItems:        'center',
    justifyContent:    'center',
  },
  findBtnDisabled: { opacity: 0.5 },
  findBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },

  shopsContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.two },

  shopHint: { alignItems: 'center', padding: Spacing.five, gap: Spacing.two },
  shopHintText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  reviewContent: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  reviewCard: {
    borderRadius: Radius.lg,
    borderWidth:  1,
    padding:      Spacing.three,
    gap:          Spacing.two,
  },
  reviewSection:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.one },
  reviewShopName: { fontSize: 16, fontWeight: '700' },
  reviewShopCity: { fontSize: 12 },

  reviewRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewRowMulti:  { alignItems: 'flex-start' },
  reviewLabel:     { fontSize: 13, flex: 1 },
  reviewValue:     { fontSize: 13, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  reviewValueMulti:{ textAlign: 'left' },

  estimatedLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  estimatedPrice: { fontSize: 28, fontWeight: '800' },
  estimatedNote:  { fontSize: 11, lineHeight: 15 },

  placeBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.two,
    borderRadius:    Radius.xl,
    paddingVertical: Spacing.three,
  },
  placeBtnDisabled: { opacity: 0.6 },
  placeBtnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },

  disclaimer: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
