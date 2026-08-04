/**
 * Customer Print Order Detail — theme-aware, polls every 8s
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing } from '@/constants/theme';
import {
  getPrintOrder,
  payPrintOrder,
  cancelPrintOrder,
} from '@/services/print-service';
import type { PrintOrder } from '@/types/print';
import { orderAttributeRows } from '@/lib/print-pricing';
import { PrintProgress } from '@/components/print/PrintProgress';

const POLL_MS        = 8_000;
const FINAL_STATUSES = new Set(['completed', 'cancelled', 'expired']);

const money = (n: number | null) =>
  n == null ? 'TBD' : `₹${Math.round(n).toLocaleString('en-IN')}`;

function statusColor(status: string, brand: ReturnType<typeof useTheme>['brand']): string {
  switch (status) {
    case 'completed':    return brand.success;
    case 'cancelled':
    case 'expired':      return brand.error;
    case 'confirmed':
    case 'in_production': return brand.primary;
    case 'ready':        return brand.success;
    case 'accepted':     return brand.warning;
    default:             return brand.creamSub;
  }
}

function printStatusLabel(status: string): string {
  const map: Record<string, string> = {
    open:            '⏳ Awaiting vendor',
    accepted:        '💳 Awaiting payment',
    pending_payment: '🔄 Payment processing',
    confirmed:       '✅ Confirmed',
    in_production:   '🖨️ In production',
    ready:           '📦 Ready for pickup',
    completed:       '🎉 Completed',
    cancelled:       '❌ Cancelled',
    expired:         '⌛ Expired',
  };
  return map[status] ?? status;
}

// ─── Spec grid ────────────────────────────────────────────────────────────────

function SpecGrid({ order }: { order: PrintOrder }) {
  const { brand } = useTheme();
  const rows = orderAttributeRows(order.attributes);
  if (rows.length === 0 && !order.quantity) return null;

  const allRows = [
    ...(order.quantity ? [{ label: 'Quantity', value: String(order.quantity) }] : []),
    ...rows,
    ...(order.notes ? [{ label: 'Notes', value: order.notes }] : []),
  ];

  return (
    <View style={[s.card, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
      <Text style={[s.cardTitle, { color: brand.primary }]}>📋  Order Specs</Text>
      {allRows.map((row) => (
        <View style={s.specRow} key={row.label}>
          <Text style={[s.specLabel, { color: brand.creamSub }]}>{row.label}</Text>
          <Text style={[s.specValue, { color: brand.cream }]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function CustomerPrintOrderScreen() {
  const { brand } = useTheme();
  const token    = useAuthStore((s) => s.token);
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [order,      setOrder]      = useState<PrintOrder | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [paying,     setPaying]     = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!token || !orderId) return;
    try {
      const o = await getPrintOrder(token, orderId);
      setOrder(o);
      setError(null);
      if (FINAL_STATUSES.has(o.status) && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [token, orderId]);

  useEffect(() => {
    setOrder(null);
    setLoading(true);
    setError(null);
  }, [orderId]);

  useEffect(() => {
    void fetchOrder();
    pollRef.current = setInterval(() => { void fetchOrder(); }, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchOrder]);

  const handlePay = async () => {
    if (!token || !orderId) return;
    setPaying(true);
    try {
      const { payment } = await payPrintOrder(token, orderId);
      Alert.alert(
        '💳 Complete Payment',
        `Amount: ₹${payment.amount.toLocaleString('en-IN')}\n\nOpen your payment app or browser to complete this payment.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Payment',
            onPress: () => {
              const url = `https://payments.cashfree.com/forms/${payment.cashfreeOrderId}`;
              Linking.openURL(url).catch(() =>
                Alert.alert('Error', 'Could not open payment page.'),
              );
            },
          },
        ],
      );
      void fetchOrder();
    } catch (e: unknown) {
      Alert.alert('Payment Error', e instanceof Error ? e.message : 'Could not initiate payment.');
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this print order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, cancel',
          style: 'destructive',
          onPress: async () => {
            if (!token || !orderId) return;
            setCancelling(true);
            try {
              await cancelPrintOrder(token, orderId);
              void fetchOrder();
            } catch (e: unknown) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not cancel order.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  const canPay    = order?.status === 'accepted' && order.paymentStatus !== 'paid';
  const canCancel = order && (order.status === 'open' || order.status === 'accepted');
  const statusClr = order ? statusColor(order.status, brand) : brand.creamSub;

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: brand.bg }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: brand.bg, borderBottomColor: brand.border1 }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={brand.cream} />
        </Pressable>
        <View style={s.headerText}>
          <Text style={[s.headerTitle, { color: brand.cream }]}>🖨️ Print Order</Text>
          {order && (
            <View style={s.statusRow}>
              <View style={[s.statusDot, { backgroundColor: statusClr }]} />
              <Text style={[s.statusLabel, { color: statusClr }]}>
                {printStatusLabel(order.status)}
              </Text>
            </View>
          )}
        </View>
        <Pressable
          style={[s.refreshBtn, { backgroundColor: brand.surface1 }]}
          onPress={() => void fetchOrder()}
          hitSlop={10}
        >
          <Ionicons name="refresh-outline" size={18} color={brand.creamMuted} />
        </Pressable>
      </View>

      {loading && !order ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={[s.loadingText, { color: brand.creamMuted }]}>Loading order…</Text>
        </View>
      ) : error && !order ? (
        <View style={s.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={brand.creamMuted} />
          <Text style={[s.errorText, { color: brand.error }]}>{error}</Text>
          <Pressable
            style={[s.retryBtn, { backgroundColor: brand.primary }]}
            onPress={() => void fetchOrder()}
          >
            <Text style={s.retryBtnText}>Try again</Text>
          </Pressable>
        </View>
      ) : order ? (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* Design image */}
          {(order.designImageUrl ?? order.designImage) ? (
            <View style={[s.card, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
              <Text style={[s.cardTitle, { color: brand.primary }]}>🎨  Your Design</Text>
              <Image
                source={{ uri: (order.designImageUrl ?? order.designImage) as string }}
                style={[s.designImage, { backgroundColor: brand.surface2 }]}
                resizeMode="contain"
              />
            </View>
          ) : null}

          {/* Order specs */}
          <SpecGrid order={order} />

          {/* Progress tracker */}
          <PrintProgress status={order.status} role="customer" />

          {/* Vendor info — revealed after acceptance */}
          {order.assignedVendorId && (
            <View style={[s.card, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
              <Text style={[s.cardTitle, { color: brand.primary }]}>🏪  Your Print Shop</Text>
              <Text style={[s.vendorName, { color: brand.cream }]}>
                {order.businessName ?? order.vendorName ?? 'Assigned vendor'}
              </Text>
              {order.vendorNote ? (
                <View style={[s.vendorNoteBox, { backgroundColor: brand.surface2, borderColor: brand.border1 }]}>
                  <Text style={[s.vendorNoteLabel, { color: brand.creamMuted }]}>💬 Message from vendor</Text>
                  <Text style={[s.vendorNoteText, { color: brand.creamSub }]}>{order.vendorNote}</Text>
                </View>
              ) : null}
              {order.vendorMobile ? (
                <Pressable
                  style={[s.contactBtn, { borderColor: brand.primary, backgroundColor: brand.primaryGlow }]}
                  onPress={() => Linking.openURL(`tel:${order.vendorMobile}`)}
                >
                  <Ionicons name="call-outline" size={16} color={brand.primary} />
                  <Text style={[s.contactBtnText, { color: brand.primary }]}>📞 Call vendor</Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {/* Price */}
          {order.quoteAmount != null && (
            <View style={[
              s.card, s.priceCard,
              { backgroundColor: `${brand.success}08`, borderColor: `${brand.success}25` },
            ]}>
              <Text style={[s.priceLabel, { color: brand.creamMuted }]}>💰  Confirmed price</Text>
              <Text style={[s.priceAmount, { color: brand.success }]}>{money(order.quoteAmount)}</Text>
              {order.paymentStatus === 'paid' && (
                <View style={[s.paidBadge, { backgroundColor: `${brand.success}15`, borderRadius: Radius.pill }]}>
                  <Ionicons name="checkmark-circle" size={14} color={brand.success} />
                  <Text style={[s.paidBadgeText, { color: brand.success }]}>Payment received</Text>
                </View>
              )}
            </View>
          )}

          {/* Pay Now */}
          {canPay && (
            <Pressable
              style={[s.actionBtn, { backgroundColor: brand.primary }, paying && s.actionBtnDisabled]}
              onPress={handlePay}
              disabled={paying}
            >
              {paying
                ? <ActivityIndicator color="#fff" />
                : (
                  <>
                    <Text style={s.actionBtnIcon}>💳</Text>
                    <Text style={s.actionBtnText}>
                      Pay Now {order.quoteAmount != null ? `— ${money(order.quoteAmount)}` : ''}
                    </Text>
                  </>
                )
              }
            </Pressable>
          )}

          {/* Cancel */}
          {canCancel && (
            <Pressable
              style={[s.cancelBtn, { borderColor: brand.error }, cancelling && s.actionBtnDisabled]}
              onPress={handleCancel}
              disabled={cancelling}
            >
              {cancelling
                ? <ActivityIndicator size="small" color={brand.error} />
                : <Text style={[s.cancelBtnText, { color: brand.error }]}>✕  Cancel Order</Text>
              }
            </Pressable>
          )}

          <View style={[s.orderIdRow, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
            <Ionicons name="receipt-outline" size={12} color={brand.creamMuted} />
            <Text style={[s.orderIdLabel, { color: brand.creamMuted }]}>Order #{order.id}</Text>
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

// ─── Styles (layout only — no color tokens) ───────────────────────────────────

const s = StyleSheet.create({
  screen:   { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
  content:  { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop:        Spacing.three,
    paddingBottom:     Spacing.two,
    borderBottomWidth: 1,
  },
  backBtn:    { padding: 4 },
  headerText: { flex: 1 },
  headerTitle:{ fontSize: 18, fontWeight: '800' },
  statusRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusLabel:{ fontSize: 12, fontWeight: '600' },
  refreshBtn: { borderRadius: Radius.pill, padding: 7 },

  loadingText: { fontSize: 13, marginTop: Spacing.one },

  card: {
    borderRadius: Radius.lg,
    borderWidth:  1,
    padding:      Spacing.three,
    gap:          Spacing.two,
  },
  cardTitle: {
    fontSize:      11,
    fontWeight:    '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  designImage: { width: '100%', height: 200, borderRadius: Radius.md },

  specRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  specLabel: { fontSize: 13, flex: 1 },
  specValue: { fontSize: 13, fontWeight: '600', textAlign: 'right', flexShrink: 1 },

  vendorName:      { fontSize: 16, fontWeight: '700' },
  vendorNoteBox:   { borderRadius: Radius.sm, borderWidth: 1, padding: Spacing.two, gap: 3 },
  vendorNoteLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  vendorNoteText:  { fontSize: 13, lineHeight: 18 },
  contactBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.two,
    alignSelf:         'flex-start',
    borderWidth:       1,
    borderRadius:      Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical:   Spacing.one + 2,
  },
  contactBtnText: { fontSize: 13, fontWeight: '600' },

  priceCard:     {},
  priceLabel:    { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  priceAmount:   { fontSize: 32, fontWeight: '800' },
  paidBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: Spacing.two, paddingVertical: 4 },
  paidBadgeText: { fontSize: 12, fontWeight: '600' },

  actionBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.two,
    borderRadius:    Radius.xl,
    paddingVertical: Spacing.three,
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnIcon:     { fontSize: 18 },
  actionBtnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },

  cancelBtn: {
    alignItems:      'center',
    justifyContent:  'center',
    borderRadius:    Radius.xl,
    paddingVertical: Spacing.two + 4,
    borderWidth:     1,
  },
  cancelBtnText: { fontWeight: '600', fontSize: 14 },

  orderIdRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               5,
    borderRadius:      Radius.md,
    borderWidth:       1,
    paddingVertical:   Spacing.two,
    paddingHorizontal: Spacing.three,
    alignSelf:         'center',
  },
  orderIdLabel: { fontSize: 11 },

  errorText:    { textAlign: 'center', fontSize: 14 },
  retryBtn:     { borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  retryBtnText: { color: '#fff', fontWeight: '600' },
});
