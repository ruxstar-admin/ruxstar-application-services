/**
 * Vendor Offers — list, create, publish/unpublish, cancel creator offers.
 * Status workflow: draft → published → draft (unpublish) | any → cancelled
 */

import { useCallback, useState } from 'react';
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
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { useBusinessStore } from '@/stores/business-store';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing } from '@/constants/theme';
import VendorHeader from '@/components/vendor/VendorHeader';
import {
  listVendorOffers,
  createVendorOffer,
  publishVendorOffer,
  unpublishVendorOffer,
  cancelVendorOffer,
  type CreatorOffer,
  type OfferKind,
} from '@/services/creator-service';

// ─── Constants ────────────────────────────────────────────────────────────────

const KINDS: { value: OfferKind; label: string; icon: string }[] = [
  { value: 'shoutout',   label: 'Shoutout',   icon: 'megaphone-outline' },
  { value: 'collab',     label: 'Collab',      icon: 'people-outline'    },
  { value: 'appearance', label: 'Appearance',  icon: 'star-outline'      },
];

const PLATFORMS = ['instagram', 'youtube', 'twitter', 'other'];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Draft',     color: '#F59E0B' },
  published: { label: 'Live',      color: '#10B981' },
  cancelled: { label: 'Cancelled', color: '#EF4444' },
};

// ─── Create / Edit Sheet ──────────────────────────────────────────────────────

function OfferSheet({
  visible,
  onClose,
  onSave,
  businesses,
  saving,
}: {
  visible:    boolean;
  onClose:    () => void;
  onSave:     (data: {
    businessId: string; title: string; description: string;
    kind: OfferKind; platforms: string[];
    price: string; turnaroundDays: string; capacity: string;
    publishNow: boolean;
  }) => void;
  businesses: { id: string; name: string }[];
  saving:     boolean;
}) {
  const { brand } = useTheme();
  const [businessId,    setBusinessId]    = useState(businesses[0]?.id ?? '');
  const [title,         setTitle]         = useState('');
  const [description,   setDescription]   = useState('');
  const [kind,          setKind]          = useState<OfferKind>('collab');
  const [platforms,     setPlatforms]     = useState<string[]>([]);
  const [price,         setPrice]         = useState('');
  const [turnaround,    setTurnaround]    = useState('7');
  const [capacity,      setCapacity]      = useState('');
  const [publishNow,    setPublishNow]    = useState(false);

  function reset() {
    setBusinessId(businesses[0]?.id ?? '');
    setTitle(''); setDescription('');
    setKind('collab'); setPlatforms([]);
    setPrice(''); setTurnaround('7'); setCapacity('');
    setPublishNow(false);
  }

  function togglePlatform(p: string) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  function submit() {
    if (!title.trim()) { Alert.alert('Missing', 'Please enter a title'); return; }
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert('Missing', 'Please enter a valid price'); return;
    }
    onSave({ businessId, title, description, kind, platforms, price, turnaroundDays: turnaround, capacity, publishNow });
    reset();
  }

  const inp = [s.input, { backgroundColor: brand.surface2, borderColor: brand.border2, color: brand.cream }];
  const lbl = [s.label, { color: brand.creamMuted }];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[s.sheetBackdrop]}>
        <View style={[s.sheet, { backgroundColor: brand.bg, borderColor: brand.border2 }]}>
          <View style={[s.sheetHandle, { backgroundColor: brand.border2 }]} />
          <Text style={[s.sheetTitle, { color: brand.cream }]}>New Offer</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.three }}>
            {/* Business picker */}
            {businesses.length > 1 && (
              <View style={{ gap: Spacing.one }}>
                <Text style={lbl}>BUSINESS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                  {businesses.map((b) => (
                    <Pressable
                      key={b.id}
                      style={[s.pill,
                        { borderColor: businessId === b.id ? brand.primary : brand.border2,
                          backgroundColor: businessId === b.id ? `${brand.primary}15` : brand.surface2 }]}
                      onPress={() => setBusinessId(b.id)}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600',
                        color: businessId === b.id ? brand.primary : brand.creamSub }}>
                        {b.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Title */}
            <View style={{ gap: Spacing.one }}>
              <Text style={lbl}>TITLE</Text>
              <TextInput style={inp} value={title} onChangeText={setTitle}
                placeholder="e.g. Instagram shoutout" placeholderTextColor={brand.creamMuted} />
            </View>

            {/* Description */}
            <View style={{ gap: Spacing.one }}>
              <Text style={lbl}>DESCRIPTION</Text>
              <TextInput style={[inp, { height: 80, textAlignVertical: 'top' }]}
                value={description} onChangeText={setDescription}
                placeholder="What's included…" placeholderTextColor={brand.creamMuted}
                multiline numberOfLines={3} />
            </View>

            {/* Kind */}
            <View style={{ gap: Spacing.one }}>
              <Text style={lbl}>TYPE</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                {KINDS.map((k) => (
                  <Pressable
                    key={k.value}
                    style={[s.pill, { flex: 1, justifyContent: 'center',
                      borderColor: kind === k.value ? brand.primary : brand.border2,
                      backgroundColor: kind === k.value ? `${brand.primary}15` : brand.surface2 }]}
                    onPress={() => setKind(k.value)}
                  >
                    <Ionicons name={k.icon as never} size={14} color={kind === k.value ? brand.primary : brand.creamMuted} />
                    <Text style={{ fontSize: 12, fontWeight: '600',
                      color: kind === k.value ? brand.primary : brand.creamSub }}>{k.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Platforms */}
            <View style={{ gap: Spacing.one }}>
              <Text style={lbl}>PLATFORMS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                {PLATFORMS.map((p) => (
                  <Pressable
                    key={p}
                    style={[s.pill,
                      { borderColor: platforms.includes(p) ? brand.primary : brand.border2,
                        backgroundColor: platforms.includes(p) ? `${brand.primary}15` : brand.surface2 }]}
                    onPress={() => togglePlatform(p)}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', textTransform: 'capitalize',
                      color: platforms.includes(p) ? brand.primary : brand.creamSub }}>
                      {p}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Price / Turnaround / Capacity */}
            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
              <View style={{ flex: 1, gap: Spacing.one }}>
                <Text style={lbl}>PRICE (₹)</Text>
                <TextInput style={inp} value={price} onChangeText={setPrice}
                  keyboardType="numeric" placeholder="0" placeholderTextColor={brand.creamMuted} />
              </View>
              <View style={{ flex: 1, gap: Spacing.one }}>
                <Text style={lbl}>DAYS</Text>
                <TextInput style={inp} value={turnaround} onChangeText={setTurnaround}
                  keyboardType="number-pad" placeholder="7" placeholderTextColor={brand.creamMuted} />
              </View>
              <View style={{ flex: 1, gap: Spacing.one }}>
                <Text style={lbl}>SLOTS</Text>
                <TextInput style={inp} value={capacity} onChangeText={setCapacity}
                  keyboardType="number-pad" placeholder="∞" placeholderTextColor={brand.creamMuted} />
              </View>
            </View>

            {/* Publish now toggle */}
            <View style={[s.toggleRow, { borderColor: brand.border1 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.toggleLabel, { color: brand.cream }]}>Publish immediately</Text>
                <Text style={[s.toggleSub, { color: brand.creamMuted }]}>Make visible to customers right away</Text>
              </View>
              <Switch
                value={publishNow}
                onValueChange={setPublishNow}
                trackColor={{ true: brand.primary, false: brand.border2 }}
                thumbColor="#fff"
              />
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: Spacing.two, paddingBottom: Spacing.four }}>
              <Pressable style={[s.cancelBtn, { borderColor: brand.border2 }]} onPress={() => { reset(); onClose(); }}>
                <Text style={[s.cancelBtnText, { color: brand.creamSub }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.saveBtn, { backgroundColor: brand.primary }, saving && { opacity: 0.6 }]}
                onPress={submit}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.saveBtnText}>{publishNow ? 'Save & Publish' : 'Save as Draft'}</Text>
                }
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Offer Card ───────────────────────────────────────────────────────────────

function OfferCard({
  offer,
  onPublish,
  onUnpublish,
  onCancel,
  busy,
}: {
  offer:       CreatorOffer;
  onPublish:   (id: string) => void;
  onUnpublish: (id: string) => void;
  onCancel:    (id: string) => void;
  busy:        boolean;
}) {
  const { brand } = useTheme();
  const sc = STATUS_CONFIG[offer.status] ?? { label: offer.status, color: brand.creamMuted };
  const kindInfo = KINDS.find((k) => k.value === offer.kind) ?? KINDS[1];

  return (
    <View style={[oc.card, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
      <View style={oc.row}>
        <View style={[oc.iconWrap, { backgroundColor: `${brand.primary}15` }]}>
          <Ionicons name={kindInfo.icon as never} size={20} color={brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[oc.title, { color: brand.cream }]} numberOfLines={1}>{offer.title}</Text>
          <Text style={[oc.meta, { color: brand.creamSub }]} numberOfLines={1}>
            {offer.businessName} · {kindInfo.label}
          </Text>
        </View>
        <View style={[oc.badge, { backgroundColor: `${sc.color}18` }]}>
          <Text style={[oc.badgeText, { color: sc.color }]}>{sc.label}</Text>
        </View>
      </View>

      {offer.description ? (
        <Text style={[oc.desc, { color: brand.creamSub }]} numberOfLines={2}>{offer.description}</Text>
      ) : null}

      <View style={oc.statsRow}>
        <Text style={[oc.price, { color: brand.cream }]}>₹{offer.price.toLocaleString('en-IN')}</Text>
        {offer.turnaroundDays != null && (
          <Text style={[oc.stat, { color: brand.creamMuted }]}>{offer.turnaroundDays}d</Text>
        )}
        {offer.capacity != null && (
          <Text style={[oc.stat, { color: brand.creamMuted }]}>
            {offer.spotsLeft ?? offer.capacity} slots left
          </Text>
        )}
        {offer.platforms.length > 0 && (
          <Text style={[oc.stat, { color: brand.creamMuted }]}>
            {offer.platforms.map((p) => p[0].toUpperCase() + p.slice(1)).join(', ')}
          </Text>
        )}
      </View>

      {offer.status !== 'cancelled' && (
        <View style={oc.actions}>
          {offer.status === 'draft' && (
            <Pressable
              style={[oc.actionBtn, { backgroundColor: brand.primary }, busy && { opacity: 0.6 }]}
              onPress={() => onPublish(offer.id)}
              disabled={busy}
            >
              <Ionicons name="globe-outline" size={14} color="#fff" />
              <Text style={oc.actionBtnText}>Publish</Text>
            </Pressable>
          )}
          {offer.status === 'published' && (
            <Pressable
              style={[oc.actionBtn, { backgroundColor: brand.surface2, borderWidth: 1, borderColor: brand.border2 }, busy && { opacity: 0.6 }]}
              onPress={() => onUnpublish(offer.id)}
              disabled={busy}
            >
              <Ionicons name="eye-off-outline" size={14} color={brand.creamSub} />
              <Text style={[oc.actionBtnText, { color: brand.creamSub }]}>Unpublish</Text>
            </Pressable>
          )}
          <Pressable
            style={[oc.actionBtn, { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' }, busy && { opacity: 0.6 }]}
            onPress={() => onCancel(offer.id)}
            disabled={busy}
          >
            <Ionicons name="close-outline" size={14} color="#EF4444" />
            <Text style={[oc.actionBtnText, { color: '#EF4444' }]}>Cancel</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OffersScreen() {
  const { brand }    = useTheme();
  const tok           = useAuthStore((s) => s.token);
  const allBusinesses = useBusinessStore((s) => s.businesses);

  const [offers,      setOffers]      = useState<CreatorOffer[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [sheetOpen,   setSheetOpen]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [busyId,      setBusyId]      = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!tok) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await listVendorOffers(tok);
      setOffers(data);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not load offers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tok]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleSave(form: {
    businessId: string; title: string; description: string;
    kind: OfferKind; platforms: string[];
    price: string; turnaroundDays: string; capacity: string;
    publishNow: boolean;
  }) {
    if (!tok) return;
    setSaving(true);
    try {
      const created = await createVendorOffer(tok, {
        businessId:    form.businessId,
        title:         form.title,
        description:   form.description || undefined,
        kind:          form.kind,
        platforms:     form.platforms,
        price:         Number(form.price),
        turnaroundDays: form.turnaroundDays ? Number(form.turnaroundDays) : undefined,
        capacity:      form.capacity ? Number(form.capacity) : undefined,
      });
      let final = created;
      if (form.publishNow) {
        try { final = await publishVendorOffer(tok, created.id); } catch { /* ignore */ }
      }
      setOffers((prev) => [final, ...prev]);
      setSheetOpen(false);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not create offer');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(id: string) {
    if (!tok) return;
    setBusyId(id);
    try {
      const updated = await publishVendorOffer(tok, id);
      setOffers((prev) => prev.map((o) => o.id === updated.id ? updated : o));
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not publish');
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnpublish(id: string) {
    if (!tok) return;
    setBusyId(id);
    try {
      const updated = await unpublishVendorOffer(tok, id);
      setOffers((prev) => prev.map((o) => o.id === updated.id ? updated : o));
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not unpublish');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(id: string) {
    Alert.alert('Cancel Offer', 'This will cancel the offer permanently. Continue?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel offer', style: 'destructive', onPress: async () => {
          if (!tok) return;
          setBusyId(id);
          try {
            const updated = await cancelVendorOffer(tok, id);
            setOffers((prev) => prev.map((o) => o.id === updated.id ? updated : o));
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not cancel');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: brand.bg }]} edges={['top']}>
      <VendorHeader />

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(o) => o.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={brand.primary} />
          }
          ListHeaderComponent={
            <Pressable
              style={[s.addBtn, { backgroundColor: brand.primary }]}
              onPress={() => setSheetOpen(true)}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={s.addBtnText}>New Offer</Text>
            </Pressable>
          }
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="megaphone-outline" size={48} color={brand.creamMuted} />
              <Text style={[s.emptyTitle, { color: brand.cream }]}>No offers yet</Text>
              <Text style={[s.emptySub, { color: brand.creamMuted }]}>
                Create an offer to let creators book with you
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <OfferCard
              offer={item}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onCancel={handleCancel}
              busy={busyId === item.id}
            />
          )}
        />
      )}

      <OfferSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        businesses={allBusinesses.map((b) => ({ id: b.id, name: b.name }))}
        saving={saving}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:    { flex: 1 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:      { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.two, paddingVertical: 13, borderRadius: Radius.xl,
    marginBottom: Spacing.two,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyBox:   { alignItems: 'center', gap: Spacing.two, marginTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySub:   { fontSize: 14, textAlign: 'center', maxWidth: 260 },

  // Sheet
  sheetBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
    borderTopWidth: 1, maxHeight: '90%',
    paddingHorizontal: Spacing.four, paddingTop: Spacing.two,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.two,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: Spacing.three },

  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  input: {
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: Spacing.three, paddingVertical: 11,
    fontSize: 14,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.two + 2, paddingVertical: 7,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: Radius.lg,
    padding: Spacing.three, gap: Spacing.two,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  toggleSub:   { fontSize: 12, marginTop: 2 },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: Radius.lg, borderWidth: 1,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700' },
  saveBtn: {
    flex: 2, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: Radius.lg,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

const oc = StyleSheet.create({
  card: {
    borderRadius: Radius.xl, borderWidth: 1,
    padding: Spacing.three, gap: Spacing.two,
  },
  row:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  iconWrap: {
    width: 40, height: 40, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  title:     { fontSize: 15, fontWeight: '700' },
  meta:      { fontSize: 12, marginTop: 2 },
  badge: {
    paddingHorizontal: Spacing.two, paddingVertical: 3, borderRadius: Radius.pill,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  desc:      { fontSize: 13, lineHeight: 18 },
  statsRow:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
  price:     { fontSize: 16, fontWeight: '800' },
  stat:      { fontSize: 12 },
  actions:   { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.two + 2, paddingVertical: 7,
    borderRadius: Radius.lg,
  },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
