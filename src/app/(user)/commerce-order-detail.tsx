/**
 * Commerce Order Detail — customer view of a single shop order.
 * Shows status progress, line items, pay/cancel actions.
 */

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing } from '@/constants/theme';
import {
  getMyCommerceOrder,
  payCommerceOrder,
  cancelCommerceOrder,
  type CommerceOrder,
} from '@/services/commerce-service';
import { useCashfreePayment } from '@/utils/cashfree-native';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STEPS = ['pending_payment', 'confirmed', 'preparing', 'ready', 'completed'] as const;

const STEP_LABELS: Record<string, string> = {
  pending_payment: 'Payment',
  confirmed:       'Confirmed',
  preparing:       'Preparing',
  ready:           'Ready',
  completed:       'Delivered',
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  confirmed:       'Order confirmed',
  preparing:       'Being prepared',
  ready:           'Ready for pickup',
  completed:       'Completed',
  cancelled:       'Cancelled',
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function StatusProgress({ status }: { status: string }) {
  const { brand } = useTheme();
  if (status === 'cancelled') return null;

  const currentIdx = STEPS.indexOf(status as typeof STEPS[number]);

  return (
    <View style={p.wrap}>
      {STEPS.map((step, idx) => {
        const done    = idx <= currentIdx;
        const active  = idx === currentIdx;
        const color   = done ? brand.primary : brand.border2;
        return (
          <View key={step} style={p.stepWrap}>
            <View style={[p.dot, { backgroundColor: color, borderColor: color },
              active && { borderWidth: 3, borderColor: brand.primary, backgroundColor: '#fff', width: 14, height: 14 }]} />
            <Text style={[p.stepLabel, { color: done ? brand.primary : brand.creamMuted }]}>
              {STEP_LABELS[step]}
            </Text>
            {idx < STEPS.length - 1 && (
              <View style={[p.line, { backgroundColor: idx < currentIdx ? brand.primary : brand.border2 }]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CommerceOrderDetailScreen() {
  const { id }     = useLocalSearchParams<{ id: string }>();
  const { brand }  = useTheme();
  const token      = useAuthStore((s) => s.token);

  const [order,    setOrder]    = useState<CommerceOrder | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [paying,   setPaying]   = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { startPayment } = useCashfreePayment({
    onSuccess: () => {
      Alert.alert('Payment successful!', 'Your order has been confirmed.');
      load();
    },
    onError: (msg) => {
      setPaying(false);
      Alert.alert('Payment failed', msg);
    },
  });

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const o = await getMyCommerceOrder(token, id);
      setOrder(o);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not load order');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handlePay() {
    if (!token || !order) return;
    setPaying(true);
    try {
      const { payment } = await payCommerceOrder(token, order.id);
      startPayment({
        paymentSessionId: payment.paymentSessionId,
        orderId:          payment.orderId,
        bookingId:        order.id,
        mode:             payment.mode,
      });
    } catch (e) {
      setPaying(false);
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not initiate payment');
    }
  }

  async function handleCancel() {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel', style: 'destructive', onPress: async () => {
          if (!token || !order) return;
          setCancelling(true);
          try {
            const updated = await cancelCommerceOrder(token, order.id);
            setOrder(updated);
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not cancel order');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={[d.screen, { backgroundColor: brand.bg }]} edges={['top']}>
        <View style={d.backRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={brand.cream} />
          </Pressable>
        </View>
        <View style={d.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[d.screen, { backgroundColor: brand.bg }]} edges={['top']}>
        <View style={d.backRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={brand.cream} />
          </Pressable>
        </View>
        <View style={d.centered}>
          <Text style={[d.errorText, { color: brand.creamMuted }]}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPending   = order.status === 'pending_payment';
  const isCancelled = order.status === 'cancelled';
  const shortId     = order.id.slice(-8).toUpperCase();

  return (
    <SafeAreaView style={[d.screen, { backgroundColor: brand.bg }]} edges={['top']}>
      {/* Back row */}
      <View style={[d.backRow, { borderBottomColor: brand.border1 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={brand.cream} />
        </Pressable>
        <Text style={[d.screenTitle, { color: brand.cream }]}>Order #{shortId}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={d.scroll} showsVerticalScrollIndicator={false}>
        {/* Shop info */}
        <View style={[d.card, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
          <View style={d.shopRow}>
            <View style={[d.shopIcon, { backgroundColor: `${brand.primary}15` }]}>
              <Ionicons name="storefront-outline" size={20} color={brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[d.shopName, { color: brand.cream }]}>{order.businessName}</Text>
              {order.vendorMobile && (
                <Text style={[d.shopPhone, { color: brand.creamSub }]}>{order.vendorMobile}</Text>
              )}
            </View>
            <View style={[d.statusPill, { backgroundColor: isCancelled ? '#FEE2E2' : `${brand.primary}18` }]}>
              <Text style={[d.statusPillText, { color: isCancelled ? '#EF4444' : brand.primary }]}>
                {STATUS_LABELS[order.status] ?? order.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Status progress */}
        {!isCancelled && (
          <View style={[d.card, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
            <Text style={[d.sectionTitle, { color: brand.creamMuted }]}>ORDER STATUS</Text>
            <StatusProgress status={order.status} />
          </View>
        )}

        {/* Items */}
        <View style={[d.card, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
          <Text style={[d.sectionTitle, { color: brand.creamMuted }]}>ITEMS</Text>
          {order.items.map((item, idx) => (
            <View key={idx} style={[d.itemRow, idx > 0 && { borderTopWidth: 1, borderTopColor: brand.border1 }]}>
              <View style={d.itemInfo}>
                <Text style={[d.itemName, { color: brand.cream }]}>{item.name}</Text>
                <Text style={[d.itemQty, { color: brand.creamMuted }]}>Qty: {item.quantity}</Text>
              </View>
              <Text style={[d.itemPrice, { color: brand.cream }]}>
                ₹{(item.price * item.quantity).toLocaleString('en-IN')}
              </Text>
            </View>
          ))}
          <View style={[d.totalRow, { borderTopColor: brand.border2 }]}>
            <Text style={[d.totalLabel, { color: brand.creamSub }]}>Total</Text>
            <Text style={[d.totalAmount, { color: brand.cream }]}>
              ₹{order.amount.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {order.notes ? (
          <View style={[d.card, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
            <Text style={[d.sectionTitle, { color: brand.creamMuted }]}>NOTES</Text>
            <Text style={[d.notes, { color: brand.creamSub }]}>{order.notes}</Text>
          </View>
        ) : null}

        {/* Payment info */}
        <View style={[d.card, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
          <Text style={[d.sectionTitle, { color: brand.creamMuted }]}>PAYMENT</Text>
          <View style={d.payRow}>
            <Text style={[d.payLabel, { color: brand.creamSub }]}>Status</Text>
            <Text style={[d.payValue, { color: order.paymentStatus === 'paid' ? brand.success : brand.cream }]}>
              {order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus ?? 'Unpaid'}
            </Text>
          </View>
          {order.paidAt && (
            <View style={d.payRow}>
              <Text style={[d.payLabel, { color: brand.creamSub }]}>Paid at</Text>
              <Text style={[d.payValue, { color: brand.cream }]}>
                {new Date(order.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        {isPending && (
          <View style={d.actions}>
            <Pressable
              style={[d.payBtn, { backgroundColor: brand.primary }, paying && { opacity: 0.6 }]}
              onPress={handlePay}
              disabled={paying}
            >
              {paying
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Ionicons name="card-outline" size={18} color="#fff" />
                    <Text style={d.payBtnText}>Pay ₹{order.amount.toLocaleString('en-IN')}</Text>
                  </>
              }
            </Pressable>
            <Pressable
              style={[d.cancelBtn, { borderColor: '#EF4444' }, cancelling && { opacity: 0.6 }]}
              onPress={handleCancel}
              disabled={cancelling}
            >
              {cancelling
                ? <ActivityIndicator size="small" color="#EF4444" />
                : <Text style={d.cancelBtnText}>Cancel Order</Text>
              }
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const p = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    paddingTop:    Spacing.two,
  },
  stepWrap: {
    flex:           1,
    alignItems:     'center',
    position:       'relative',
  },
  dot: {
    width:        10,
    height:       10,
    borderRadius: 5,
    borderWidth:  1,
    marginBottom: 6,
  },
  stepLabel: {
    fontSize:   10,
    fontWeight: '600',
    textAlign:  'center',
  },
  line: {
    position: 'absolute',
    top:      4,
    left:     '50%',
    right:    '-50%',
    height:   2,
    zIndex:   -1,
  },
});

const d = StyleSheet.create({
  screen:    { flex: 1 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, fontWeight: '500' },
  backRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: Spacing.three,
    paddingVertical:   Spacing.two + 2,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  screenTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  scroll:      { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  card: {
    borderRadius: Radius.xl,
    borderWidth:  1,
    padding:      Spacing.three,
    gap:          Spacing.two,
  },
  shopRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  shopIcon:  { width: 42, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  shopName:  { fontSize: 15, fontWeight: '700' },
  shopPhone: { fontSize: 13, marginTop: 2 },
  statusPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical:   4,
    borderRadius:      Radius.pill,
  },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.7,
  },
  itemRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: Spacing.two,
    gap:             Spacing.two,
  },
  itemInfo:  { flex: 1 },
  itemName:  { fontSize: 14, fontWeight: '600' },
  itemQty:   { fontSize: 12, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700' },
  totalRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingTop:     Spacing.two,
    borderTopWidth: 1,
  },
  totalLabel:  { flex: 1, fontSize: 14, fontWeight: '600' },
  totalAmount: { fontSize: 18, fontWeight: '800' },
  notes:       { fontSize: 14, lineHeight: 20 },
  payRow:      { flexDirection: 'row', alignItems: 'center' },
  payLabel:    { flex: 1, fontSize: 14 },
  payValue:    { fontSize: 14, fontWeight: '700' },
  actions:     { gap: Spacing.two },
  payBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing.two,
    paddingVertical: 14,
    borderRadius:   Radius.xl,
  },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelBtn: {
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 13,
    borderRadius:    Radius.xl,
    borderWidth:     1,
  },
  cancelBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
});
