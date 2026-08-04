/**
 * Vendor Notifications Screen
 */
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/print-service';
import type { AppNotification } from '@/types/print';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';
import VendorHeader from '@/components/vendor/VendorHeader';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function notifIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type === 'pod')     return 'print-outline';
  if (type === 'booking') return 'calendar-outline';
  if (type === 'payment') return 'card-outline';
  return 'notifications-outline';
}

function navigateFromNotif(data: Record<string, unknown>) {
  const kind    = data?.kind as string | undefined;
  const orderId = data?.orderId as string | undefined;
  if (kind === 'pod' && orderId) {
    router.push({ pathname: '/(vendor)/print-order-detail', params: { orderId } } as never);
  }
}

// ─── Style factory ────────────────────────────────────────────────────────────

const createStyles = (brand: BrandTokens) => StyleSheet.create({
  screen:   { flex: 1, backgroundColor: brand.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  markAllRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one + 2,
    borderBottomWidth: 1,
    borderBottomColor: brand.border1,
  },
  markAllText: { fontSize: 12, fontWeight: '600', color: brand.primary },

  listContent: { padding: Spacing.three, paddingBottom: 60 },

  row: {
    flexDirection:     'row',
    gap:               Spacing.two,
    paddingVertical:   Spacing.two + 2,
    paddingHorizontal: Spacing.two,
    borderRadius:      Radius.lg,
    backgroundColor:   brand.surface1,
    borderWidth:       1,
    borderColor:       brand.border1,
  },
  rowUnread: { backgroundColor: brand.primaryGlow, borderColor: 'rgba(124,58,237,0.20)' },

  iconWrap: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: brand.surface2,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },

  rowContent:     { flex: 1, gap: 2 },
  rowTop:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle:       { flex: 1, fontSize: 13, fontWeight: '600', color: brand.cream },
  rowTitleUnread: { fontWeight: '700' },
  unreadDot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: brand.primary, flexShrink: 0 },
  rowBody:        { fontSize: 12, color: brand.creamSub, lineHeight: 17 },
  rowTime:        { fontSize: 10, color: brand.creamMuted, marginTop: 2 },

  empty:     { alignItems: 'center', paddingTop: Spacing.six, gap: Spacing.two },
  emptyIcon: {
    width: 68, height: 68, borderRadius: Radius.xl,
    backgroundColor: brand.surface2, borderWidth: 1, borderColor: brand.border1,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.one,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: brand.cream },
  emptySub:   { fontSize: 13, color: brand.creamSub },
});

// ─── Row ─────────────────────────────────────────────────────────────────────

function NotifRow({ item, onRead }: { item: AppNotification; onRead: (id: string) => void }) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  function handlePress() {
    if (!item.read) onRead(item.id);
    navigateFromNotif(item.data);
  }

  return (
    <Pressable style={[s.row, !item.read && s.rowUnread]} onPress={handlePress}>
      <View style={s.iconWrap}>
        <Ionicons name={notifIcon(item.type)} size={18} color={brand.primary} />
      </View>
      <View style={s.rowContent}>
        <View style={s.rowTop}>
          <Text style={[s.rowTitle, !item.read && s.rowTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.read && <View style={s.unreadDot} />}
        </View>
        <Text style={s.rowBody} numberOfLines={2}>{item.body}</Text>
        <Text style={s.rowTime}>{relativeTime(item.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function VendorNotificationsScreen() {
  const token = useAuthStore((s) => s.token);

  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount   = useNotificationStore((s) => s.unreadCount);
  const setResult     = useNotificationStore((s) => s.setResult);
  const markOneRead   = useNotificationStore((s) => s.markOneRead);
  const markAllRead   = useNotificationStore((s) => s.markAllRead);

  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const [loading,    setLoading]    = useState(notifications.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    try {
      const result = await listNotifications(token);
      setResult(result.notifications, result.unreadCount);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, setResult]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function handleRead(id: string) {
    if (!token) return;
    markOneRead(id);
    try { await markNotificationRead(token, id); } catch { /* silent */ }
  }

  async function handleMarkAll() {
    if (!token || unreadCount === 0) return;
    markAllRead();
    try { await markAllNotificationsRead(token); } catch { /* silent */ }
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <VendorHeader />

      {unreadCount > 0 && (
        <View style={s.markAllRow}>
          <Pressable onPress={handleMarkAll} hitSlop={8}>
            <Text style={s.markAllText}>Mark all read</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={brand.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="notifications-off-outline" size={32} color={brand.creamMuted} />
              </View>
              <Text style={s.emptyTitle}>You're all caught up</Text>
              <Text style={s.emptySub}>No notifications yet</Text>
            </View>
          }
          renderItem={({ item }) => <NotifRow item={item} onRead={handleRead} />}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.one + 2 }} />}
        />
      )}
    </SafeAreaView>
  );
}
