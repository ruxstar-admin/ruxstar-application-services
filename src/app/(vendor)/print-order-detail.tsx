/**
 * Vendor Print Order Detail
 * Design image · 2-column spec grid · customer contact
 * PrintProgress (vendor role) · status advance button
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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/auth-store';
import {
  getVendorPrintOrder,
  updatePrintOrderStatus,
} from '@/services/print-service';
import type { PrintOrder, PrintOrderStatus } from '@/types/print';
import { orderAttributeRows } from '@/lib/print-pricing';
import { PrintProgress } from '@/components/print/PrintProgress';
import { Brand, Radius, Spacing } from '@/constants/theme';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const POLL_MS = 10_000;
const FINAL_STATUSES = new Set(['completed', 'cancelled', 'expired']);

const money = (n: number | null) =>
  n == null ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`;

type AdvanceAction = {
  status: string;
  label:  string;
  confirm: string;
  isPrimary: boolean;
};

function getAdvanceAction(status: string): AdvanceAction | null {
  switch (status) {
    case 'open':
      return { status: 'accepted', label: 'Accept Order', confirm: 'Accept this print order?', isPrimary: true };
    case 'confirmed':
      return { status: 'in_production', label: 'Start Production', confirm: 'Mark this order as in production?', isPrimary: true };
    case 'in_production':
      return { status: 'ready', label: 'Mark as Ready', confirm: 'Mark this order as ready for the customer?', isPrimary: true };
    case 'ready':
      return { status: 'completed', label: 'Mark Complete', confirm: 'Complete this order?', isPrimary: false };
    default:
      return null;
  }
}

// ─── 2-col spec grid ─────────────────────────────────────────────────────────

function SpecGrid({ order }: { order: PrintOrder }) {
  const rows = orderAttributeRows(order.attributes);
  const allRows = [
    ...(order.quantity ? [{ label: 'Quantity', value: String(order.quantity) }] : []),
    ...rows,
  ];
  if (allRows.length === 0) return null;

  const pairs: { label: string; value: string }[][] = [];
  for (let i = 0; i < allRows.length; i += 2) {
    pairs.push(allRows.slice(i, i + 2));
  }

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>Specifications</Text>
      {pairs.map((pair, pi) => (
        <View key={pi} style={s.specPairRow}>
          {pair.map((row) => (
            <View key={row.label} style={s.specCell}>
              <Text style={s.specLabel}>{row.label}</Text>
              <Text style={s.specValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      ))}
      {order.notes ? (
        <View style={s.notesBox}>
          <Text style={s.notesLabel}>Customer notes</Text>
          <Text style={s.notesText}>{order.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function VendorPrintOrderDetailScreen() {
  const token = useAuthStore((s) => s.token);
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [order,     setOrder]     = useState<PrintOrder | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [quoteInput, setQuoteInput] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!token || !orderId) return;
    try {
      const o = await getVendorPrintOrder(token, orderId);
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

  // Clear stale data when navigating to a different order
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

  const handleAdvance = useCallback((action: AdvanceAction) => {
    Alert.alert(
      action.label,
      action.confirm,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.label,
          style: action.isPrimary ? 'default' : 'destructive',
          onPress: async () => {
            if (!token || !orderId) return;
            setAdvancing(true);
            try {
              const updated = await updatePrintOrderStatus(token, orderId, action.status as PrintOrderStatus);
              setOrder(updated);
            } catch (e: unknown) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not update order status.');
            } finally {
              setAdvancing(false);
            }
          },
        },
      ],
    );
  }, [token, orderId]);

  const action = order ? getAdvanceAction(order.status) : null;

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={Brand.cream} />
        </Pressable>
        <View style={s.headerText}>
          <Text style={s.headerTitle} numberOfLines={1}>
            {order?.categoryLabel ?? 'Print Order'}
          </Text>
          <Text style={s.headerSub}>{order?.customerName ?? ' '}</Text>
        </View>
        <Pressable onPress={() => void fetchOrder()} accessibilityRole="button" accessibilityLabel="Refresh">
          <Ionicons name="refresh-outline" size={20} color={Brand.creamMuted} />
        </Pressable>
      </View>

      {loading && !order ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Brand.primary} />
        </View>
      ) : error && !order ? (
        <View style={s.centered}>
          <Ionicons name="cloud-offline-outline" size={36} color={Brand.creamMuted} />
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={() => void fetchOrder()}>
            <Text style={s.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : order ? (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* Design image — prefer CDN URL, fall back to base64 data URI */}
          {(order.designImageUrl ?? order.designImage) ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>Customer Design</Text>
              <Image
                source={{ uri: (order.designImageUrl ?? order.designImage) as string }}
                style={s.designImage}
                resizeMode="contain"
              />
            </View>
          ) : order.hasDesign ? (
            <View style={[s.card, s.noDesignBox]}>
              <Ionicons name="image-outline" size={24} color={Brand.creamMuted} />
              <Text style={s.noDesignText}>
                Customer has a design — ask them to share the file directly.
              </Text>
            </View>
          ) : null}

          {/* Specs */}
          <SpecGrid order={order} />

          {/* Progress */}
          <PrintProgress status={order.status} role="vendor" />

          {/* Customer contact */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Customer</Text>
            <Text style={s.customerName}>{order.customerName}</Text>
            <Text style={s.customerCity}>{order.city}{order.pincode ? ` — ${order.pincode}` : ''}</Text>
            {order.customerMobile ? (
              <Pressable
                style={s.contactBtn}
                onPress={() => Linking.openURL(`tel:${order.customerMobile}`)}
              >
                <Ionicons name="call-outline" size={16} color={Brand.primary} />
                <Text style={s.contactBtnText}>Call customer</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Quote / price */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Quote Amount</Text>
            {order.quoteAmount != null ? (
              <Text style={s.quoteAmount}>{money(order.quoteAmount)}</Text>
            ) : (
              <>
                <Text style={s.quoteHint}>Enter the price you'll charge for this order</Text>
                <View style={s.quoteInputRow}>
                  <Text style={s.rupeeSign}>₹</Text>
                  <TextInput
                    style={s.quoteInput}
                    placeholder="0"
                    placeholderTextColor={Brand.creamMuted}
                    value={quoteInput}
                    onChangeText={setQuoteInput}
                    keyboardType="numeric"
                  />
                </View>
              </>
            )}
          </View>

          {/* Awaiting payment notice */}
          {(order.status === 'accepted' || order.status === 'pending_payment') && (
            <View style={s.awaitingBox}>
              <Ionicons name="time-outline" size={18} color={Brand.warning} />
              <Text style={s.awaitingText}>
                {order.status === 'pending_payment'
                  ? 'Payment is being processed by the customer.'
                  : 'Waiting for the customer to complete payment.'}
              </Text>
            </View>
          )}

          {/* Advance action */}
          {action && (
            <Pressable
              style={[
                s.advanceBtn,
                !action.isPrimary && s.advanceBtnSecondary,
                advancing && s.advanceBtnDisabled,
              ]}
              onPress={() => handleAdvance(action)}
              disabled={advancing}
            >
              {advancing
                ? <ActivityIndicator color={action.isPrimary ? '#fff' : Brand.primary} />
                : (
                  <>
                    <Ionicons
                      name="arrow-forward-circle-outline"
                      size={18}
                      color={action.isPrimary ? '#fff' : Brand.primary}
                    />
                    <Text style={[s.advanceBtnText, !action.isPrimary && s.advanceBtnTextSecondary]}>
                      {action.label}
                    </Text>
                  </>
                )
              }
            </Pressable>
          )}

          <Text style={s.orderIdLabel}>Order ID: {order.id}</Text>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: Brand.bg },
  centered: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        Spacing.four,
    gap:            Spacing.two,
  },
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop:        Spacing.three,
    paddingBottom:     Spacing.two,
  },
  backBtn:     { padding: 4 },
  headerText:  { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Brand.cream },
  headerSub:   { fontSize: 12, color: Brand.creamSub, marginTop: 1 },

  // Cards
  card: {
    backgroundColor: Brand.surface1,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Brand.border1,
    padding:         Spacing.three,
    gap:             Spacing.two,
  },
  cardTitle: {
    fontSize:      11,
    fontWeight:    '700',
    color:         Brand.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  designImage: {
    width:           '100%',
    height:          200,
    borderRadius:    Radius.md,
    backgroundColor: Brand.surface2,
  },

  noDesignBox: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.two,
  },
  noDesignText: { flex: 1, fontSize: 13, color: Brand.creamSub, lineHeight: 18 },

  // Spec grid
  specPairRow:  { flexDirection: 'row', gap: Spacing.two },
  specCell:     { flex: 1, backgroundColor: Brand.surface2, borderRadius: Radius.sm, padding: Spacing.two },
  specLabel:    { fontSize: 10, color: Brand.creamMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  specValue:    { fontSize: 13, fontWeight: '600', color: Brand.cream, marginTop: 2 },

  notesBox: {
    backgroundColor: Brand.surface2,
    borderRadius:    Radius.sm,
    padding:         Spacing.two,
  },
  notesLabel: { fontSize: 10, color: Brand.creamMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  notesText:  { fontSize: 13, color: Brand.creamSub, marginTop: 2, lineHeight: 18 },

  // Customer
  customerName: { fontSize: 16, fontWeight: '700', color: Brand.cream },
  customerCity: { fontSize: 12, color: Brand.creamSub },
  contactBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.two,
    alignSelf:         'flex-start',
    borderWidth:       1,
    borderColor:       Brand.primary,
    borderRadius:      Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical:   Spacing.one + 2,
  },
  contactBtnText: { fontSize: 13, fontWeight: '600', color: Brand.primary },

  // Quote
  quoteAmount: { fontSize: 28, fontWeight: '800', color: Brand.success },
  quoteHint:   { fontSize: 12, color: Brand.creamSub },
  quoteInputRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.one,
    backgroundColor: Brand.surface2,
    borderRadius:    Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical:   Spacing.two,
    borderWidth:     1,
    borderColor:     Brand.border1,
  },
  rupeeSign:  { fontSize: 16, fontWeight: '600', color: Brand.creamSub },
  quoteInput: { flex: 1, fontSize: 20, fontWeight: '700', color: Brand.cream, padding: 0 },

  // Awaiting box
  awaitingBox: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.two,
    backgroundColor: `${Brand.warning}10`,
    borderRadius:  Radius.md,
    borderWidth:   1,
    borderColor:   `${Brand.warning}30`,
    padding:       Spacing.three,
  },
  awaitingText: { flex: 1, fontSize: 13, color: Brand.warning, lineHeight: 18 },

  // Advance button
  advanceBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.two,
    backgroundColor: Brand.primary,
    borderRadius:    Radius.xl,
    paddingVertical: Spacing.three,
  },
  advanceBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth:     1,
    borderColor:     Brand.primary,
  },
  advanceBtnDisabled: { opacity: 0.6 },
  advanceBtnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  advanceBtnTextSecondary: { color: Brand.primary },

  orderIdLabel: { fontSize: 11, color: Brand.creamMuted, textAlign: 'center' },

  errorText:    { color: Brand.error, textAlign: 'center', fontSize: 14 },
  retryBtn:     { backgroundColor: Brand.primary, borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  retryBtnText: { color: '#fff', fontWeight: '600' },
});
