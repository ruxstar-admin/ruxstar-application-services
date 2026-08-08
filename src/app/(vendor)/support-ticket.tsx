/**
 * Vendor Support Ticket Thread
 * Messages + reply box for a single ticket. Mirrors TicketThread in the
 * web's components/support-portal.tsx.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';
import { VendorSupportService, type SupportTicket, type TicketStatus } from '@/services/vendor-support-service';

function statusColor(status: TicketStatus, brand: BrandTokens) {
  if (status === 'open')     return brand.success;
  if (status === 'pending')  return brand.warning;
  if (status === 'resolved') return brand.primary;
  return brand.creamMuted;
}

function timeLabel(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

const createStyles = (brand: BrandTokens) => StyleSheet.create({
  screen:   { flex: 1, backgroundColor: brand.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1, borderBottomColor: brand.border1,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, gap: 2 },
  headerSubject: { fontSize: 16, fontWeight: '700', color: brand.cream },
  headerMeta: { fontSize: 10, color: brand.creamMuted, textTransform: 'uppercase', letterSpacing: 0.4 },

  pill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.four },

  bubbleRow: { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: Radius.lg, paddingHorizontal: Spacing.three, paddingVertical: 10 },
  bubbleMine: { backgroundColor: brand.primary },
  bubbleTheirs: { backgroundColor: brand.surface1, borderWidth: 1, borderColor: brand.border1 },
  bubbleText: { fontSize: 14, lineHeight: 19 },
  bubbleTextMine: { color: '#fff' },
  bubbleTextTheirs: { color: brand.cream },
  bubbleMeta: { fontSize: 10, marginTop: 4 },
  bubbleMetaMine: { color: 'rgba(255,255,255,0.75)' },
  bubbleMetaTheirs: { color: brand.creamMuted },

  closedNotice: {
    borderWidth: 1, borderColor: brand.border1, borderRadius: Radius.lg,
    paddingVertical: 12, paddingHorizontal: Spacing.three, marginHorizontal: Spacing.three, marginBottom: Spacing.three,
  },
  closedText: { fontSize: 12, color: brand.creamMuted, textAlign: 'center' },

  replyRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two,
    padding: Spacing.three, borderTopWidth: 1, borderTopColor: brand.border1,
  },
  replyInput: {
    flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: brand.surface1, borderRadius: Radius.md,
    borderWidth: 1, borderColor: brand.border2, paddingHorizontal: Spacing.three, paddingVertical: 10,
    color: brand.cream, fontSize: 14,
  },
  sendBtn: {
    backgroundColor: brand.primary, borderRadius: Radius.pill, paddingHorizontal: Spacing.four,
    height: 44, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  errorText: { fontSize: 12, color: brand.error, paddingHorizontal: Spacing.three, paddingBottom: 6 },
});

export default function VendorSupportTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      setLoadError(null);
      setTicket(await VendorSupportService.getTicket(id, token));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load this ticket.');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function send() {
    const text = body.trim();
    if (!text || sending || !token || !id) return;
    setSending(true);
    setSendError(null);
    try {
      const updated = await VendorSupportService.replyToTicket(id, text, token);
      setTicket(updated);
      setBody('');
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Could not send reply.');
    } finally {
      setSending(false);
    }
  }

  const closed = ticket?.status === 'closed';

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={brand.cream} />
        </Pressable>
        <View style={s.headerInfo}>
          <Text style={s.headerSubject} numberOfLines={1}>{ticket?.subject ?? 'Ticket'}</Text>
          {ticket && <Text style={s.headerMeta}>{ticket.ticketRef} · {ticket.category}</Text>}
        </View>
        {ticket && (
          <View style={[s.pill, { backgroundColor: `${statusColor(ticket.status, brand)}22`, borderWidth: 1, borderColor: `${statusColor(ticket.status, brand)}44` }]}>
            <Text style={[s.pillText, { color: statusColor(ticket.status, brand) }]}>{ticket.status}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : !ticket ? (
        <View style={s.centered}>
          <Text style={s.errorText}>{loadError ?? 'Could not load this ticket.'}</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={12}>
          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            {ticket.messages.map((m, i) => {
              const mine = m.authorRole === 'user';
              return (
                <View key={i} style={[s.bubbleRow, mine ? s.bubbleRowMine : s.bubbleRowTheirs]}>
                  <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
                    <Text style={[s.bubbleText, mine ? s.bubbleTextMine : s.bubbleTextTheirs]}>{m.body}</Text>
                    <Text style={[s.bubbleMeta, mine ? s.bubbleMetaMine : s.bubbleMetaTheirs]}>
                      {m.authorRole === 'admin' ? (m.authorName || 'Support') : 'You'} · {timeLabel(m.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {closed ? (
            <View style={s.closedNotice}>
              <Text style={s.closedText}>This ticket is closed. Raise a new ticket if you still need help.</Text>
            </View>
          ) : (
            <>
              {sendError && <Text style={s.errorText}>{sendError}</Text>}
              <View style={s.replyRow}>
                <TextInput
                  style={s.replyInput}
                  placeholder="Write a reply…"
                  placeholderTextColor={brand.creamMuted}
                  value={body}
                  onChangeText={setBody}
                  multiline
                  editable={!sending}
                />
                <Pressable
                  style={[s.sendBtn, (sending || !body.trim()) && s.sendBtnDisabled]}
                  onPress={send}
                  disabled={sending || !body.trim()}
                >
                  {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.sendBtnText}>Send</Text>}
                </Pressable>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
