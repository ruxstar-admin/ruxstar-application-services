/**
 * Vendor Support Screen
 * Ticket list + "New ticket" composer.
 * Mirrors the web's components/support-portal.tsx (vendor role).
 * Tapping a ticket opens support-ticket.tsx (thread + reply).
 */

import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';
import VendorHeader from '@/components/vendor/VendorHeader';
import {
  VendorSupportService,
  type NewTicketInput,
  type SupportTicket,
  type TicketCategory,
  type TicketStatus,
} from '@/services/vendor-support-service';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { id: TicketCategory; label: string }[] = [
  { id: 'payment', label: 'Payment' },
  { id: 'booking', label: 'Booking' },
  { id: 'order',   label: 'Print order' },
  { id: 'refund',  label: 'Refund' },
  { id: 'account', label: 'Account' },
  { id: 'other',   label: 'Other' },
];

function statusColor(status: TicketStatus, brand: BrandTokens) {
  if (status === 'open')     return brand.success;
  if (status === 'pending')  return brand.warning;
  if (status === 'resolved') return brand.primary;
  return brand.creamMuted; // closed
}

function timeLabel(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

// ─── Style factory ────────────────────────────────────────────────────────────

const createStyles = (brand: BrandTokens) => StyleSheet.create({
  screen:   { flex: 1, backgroundColor: brand.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },

  newBtnRow: {
    flexDirection: 'row', justifyContent: 'flex-end',
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.two,
    borderBottomWidth: 1, borderBottomColor: brand.border1,
  },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: brand.primary, borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three, paddingVertical: 9,
  },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  listContent: { padding: Spacing.three, paddingBottom: 100 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    backgroundColor: brand.surface1, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: brand.border1,
    paddingHorizontal: Spacing.three, paddingVertical: 13,
  },
  rowLeft: { flex: 1, gap: 3 },
  rowSubject: { fontSize: 14, fontWeight: '700', color: brand.cream },
  rowMeta:    { fontSize: 10, color: brand.creamMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  rowTime:    { fontSize: 11, color: brand.creamSub },

  pill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  emptyIcon: {
    width: 72, height: 72, borderRadius: Radius.xl,
    backgroundColor: brand.surface1, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: brand.cream },
  emptySub:   { fontSize: 13, color: brand.creamSub, textAlign: 'center' },

  errorText: { fontSize: 13, color: brand.error, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: brand.primary,
    borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, marginTop: Spacing.one,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // ── New ticket modal ──
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  kav: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: brand.bg, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
    maxHeight: '92%', paddingHorizontal: Spacing.four, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  handle: { width: 40, height: 4, backgroundColor: brand.border2, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.three },
  sheetTitle: { color: brand.cream, fontSize: 18, fontWeight: '800' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: brand.surface2, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: brand.creamSub, fontSize: 14, fontWeight: '700' },

  formContent: { gap: Spacing.three, paddingBottom: Spacing.two },
  field: { gap: 6 },
  fieldLabel: { color: brand.creamSub, fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  input: {
    backgroundColor: brand.surface1, borderRadius: Radius.md, borderWidth: 1, borderColor: brand.border2,
    paddingHorizontal: Spacing.three, paddingVertical: 12, color: brand.cream, fontSize: 15,
  },
  textarea: { minHeight: 96, paddingTop: 12 },

  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: brand.border2,
  },
  catChipActive: { backgroundColor: brand.primaryGlow, borderColor: brand.primary },
  catChipText: { fontSize: 12, fontWeight: '600', color: brand.creamSub },
  catChipTextActive: { color: brand.primary },

  modalError: {
    color: brand.error, fontSize: 13, textAlign: 'center', backgroundColor: 'rgba(220,38,38,0.06)',
    borderRadius: Radius.md, padding: Spacing.two, borderWidth: 1, borderColor: 'rgba(220,38,38,0.20)',
  },

  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.pill, borderWidth: 1, borderColor: brand.border2, alignItems: 'center' },
  cancelText: { color: brand.creamSub, fontSize: 15, fontWeight: '600' },
  submitBtn: { flex: 2, paddingVertical: 14, borderRadius: Radius.pill, backgroundColor: brand.primary, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: TicketStatus }) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  const color = statusColor(status, brand);
  return (
    <View style={[s.pill, { backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}44` }]}>
      <Text style={[s.pillText, { color }]}>{status}</Text>
    </View>
  );
}

// ─── Ticket row ───────────────────────────────────────────────────────────────

function TicketRow({ ticket, onPress }: { ticket: SupportTicket; onPress: () => void }) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  return (
    <Pressable style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <View style={s.rowLeft}>
        <Text style={s.rowSubject} numberOfLines={1}>{ticket.subject}</Text>
        <Text style={s.rowMeta}>{ticket.ticketRef} · {ticket.category}</Text>
        <Text style={s.rowTime}>Updated {timeLabel(ticket.updatedAt)}</Text>
      </View>
      <StatusPill status={ticket.status} />
    </Pressable>
  );
}

// ─── New ticket modal ─────────────────────────────────────────────────────────

function NewTicketModal({
  visible, onClose, onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (ticket: SupportTicket) => void;
}) {
  const token = useAuthStore((s) => s.token);
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('other');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setSubject(''); setCategory('other'); setMessage(''); setErr(null);
  }

  function handleClose() {
    if (saving) return;
    reset();
    onClose();
  }

  async function submit() {
    if (saving) return;
    if (!subject.trim() || !message.trim()) {
      setErr('Please add a subject and describe your issue.');
      return;
    }
    if (!token) return;
    setSaving(true);
    setErr(null);
    try {
      const input: NewTicketInput = { subject: subject.trim(), category, message: message.trim() };
      const ticket = await VendorSupportService.createTicket(input, token);
      reset();
      onCreated(ticket);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create ticket.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Animated.View entering={FadeIn.duration(180)} style={s.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
          <Animated.View entering={SlideInDown.springify().damping(18)} style={s.sheet}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>New support ticket</Text>
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.7 }]}
                disabled={saving}
              >
                <Text style={s.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">
              <View style={s.field}>
                <Text style={s.fieldLabel}>Subject</Text>
                <TextInput
                  style={s.input}
                  placeholder="Short summary"
                  placeholderTextColor={brand.creamMuted}
                  value={subject}
                  onChangeText={setSubject}
                  maxLength={160}
                  editable={!saving}
                />
              </View>

              <View style={s.field}>
                <Text style={s.fieldLabel}>Category</Text>
                <View style={s.catRow}>
                  {CATEGORIES.map((c) => {
                    const active = c.id === category;
                    return (
                      <Pressable
                        key={c.id}
                        style={({ pressed }) => [s.catChip, active && s.catChipActive, pressed && { opacity: 0.7 }]}
                        onPress={() => setCategory(c.id)}
                        disabled={saving}
                      >
                        <Text style={[s.catChipText, active && s.catChipTextActive]}>{c.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={s.field}>
                <Text style={s.fieldLabel}>Message</Text>
                <TextInput
                  style={[s.input, s.textarea]}
                  placeholder="Describe your issue in detail…"
                  placeholderTextColor={brand.creamMuted}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!saving}
                />
              </View>

              {err ? <Text style={s.modalError}>{err}</Text> : null}

              <View style={s.actions}>
                <Pressable
                  style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.7 }]}
                  onPress={handleClose}
                  disabled={saving}
                >
                  <Text style={s.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [s.submitBtn, saving && s.submitBtnDisabled, pressed && { opacity: 0.7 }]}
                  onPress={submit}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.submitText}>Create ticket</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VendorSupportScreen() {
  const token = useAuthStore((s) => s.token);
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      setTickets(await VendorSupportService.listMyTickets(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your tickets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const sorted = useMemo(
    () => [...tickets].sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()),
    [tickets],
  );

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <VendorHeader />

      <View style={s.newBtnRow}>
        <Pressable
          style={({ pressed }) => [s.newBtn, pressed && { opacity: 0.7 }]}
          onPress={() => setComposerOpen(true)}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.newBtnText}>New ticket</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={({ pressed }) => [s.retryBtn, pressed && { opacity: 0.7 }]} onPress={() => load()}>
            <Ionicons name="refresh-outline" size={14} color="#fff" />
            <Text style={s.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(t) => t.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={brand.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          ListEmptyComponent={
            <View style={s.centered}>
              <View style={s.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={32} color={brand.primary} />
              </View>
              <Text style={s.emptyTitle}>No support tickets yet</Text>
              <Text style={s.emptySub}>Raise a ticket and our team will get back to you here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TicketRow
              ticket={item}
              onPress={() => router.push({ pathname: '/(vendor)/support-ticket', params: { id: item.id } } as never)}
            />
          )}
        />
      )}

      <NewTicketModal
        visible={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={(ticket) => {
          setComposerOpen(false);
          setTickets((prev) => [ticket, ...prev]);
          router.push({ pathname: '/(vendor)/support-ticket', params: { id: ticket.id } } as never);
        }}
      />
    </SafeAreaView>
  );
}
