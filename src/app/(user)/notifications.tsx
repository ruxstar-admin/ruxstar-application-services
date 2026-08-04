/**
 * Customer Notifications Screen — theme-aware
 */
import { useCallback, useState } from 'react';
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
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/auth-store';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/print-service';
import type { AppNotification } from '@/types/print';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    router.push({ pathname: '/(user)/print-order', params: { orderId } } as never);
  }
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function NotifRow({ item, onRead }: { item: AppNotification; onRead: (id: string) => void }) {
  const { brand } = useTheme();

  function handlePress() {
    if (!item.read) onRead(item.id);
    navigateFromNotif(item.data);
  }

  return (
    <Pressable
      style={({ pressed }) => [
        s.row,
        {
          backgroundColor: item.read ? brand.surface1 : brand.primaryGlow,
          borderColor:     item.read ? brand.border1  : 'rgba(124,58,237,0.20)',
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      onPress={handlePress}
    >
      <View style={[s.iconWrap, { backgroundColor: brand.surface2 }]}>
        <Ionicons name={notifIcon(item.type)} size={18} color={brand.primary} />
      </View>

      <View style={s.rowContent}>
        <View style={s.rowTop}>
          <Text
            style={[s.rowTitle, { color: brand.cream, fontWeight: item.read ? '600' : '700' }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {!item.read && (
            <View style={[s.unreadDot, { backgroundColor: brand.primary }]} />
          )}
        </View>
        <Text style={[s.rowBody, { color: brand.creamSub }]} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={[s.rowTime, { color: brand.creamMuted }]}>
          {relativeTime(item.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { brand } = useTheme();
  const token = useAuthStore((s) => s.token);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    try {
      const result = await listNotifications(token);
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function handleRead(id: string) {
    if (!token) return;
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    try { await markNotificationRead(token, id); } catch { /* silent */ }
  }

  async function handleMarkAll() {
    if (!token || unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try { await markAllNotificationsRead(token); } catch { /* silent */ }
  }

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: brand.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: brand.border1 }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={brand.cream} />
        </Pressable>
        <Text style={[s.headerTitle, { color: brand.cream }]}>Notifications</Text>
        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAll} hitSlop={8}>
            <Text style={[s.markAllText, { color: brand.primary }]}>Mark all read</Text>
          </Pressable>
        )}
      </View>

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
              <View style={[s.emptyIcon, { backgroundColor: brand.surface2, borderColor: brand.border1 }]}>
                <Ionicons name="notifications-off-outline" size={32} color={brand.creamMuted} />
              </View>
              <Text style={[s.emptyTitle, { color: brand.cream }]}>You're all caught up</Text>
              <Text style={[s.emptySub, { color: brand.creamSub }]}>No notifications yet</Text>
            </View>
          }
          renderItem={({ item }) => <NotifRow item={item} onRead={handleRead} />}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.one + 2 }} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles (layout only — no color tokens) ───────────────────────────────────

const s = StyleSheet.create({
  screen:   { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop:        Spacing.three,
    paddingBottom:     Spacing.two,
    borderBottomWidth: 1,
  },
  backBtn:     { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800' },
  markAllText: { fontSize: 12, fontWeight: '600' },

  listContent: { padding: Spacing.three, paddingBottom: 60 },

  row: {
    flexDirection:     'row',
    gap:               Spacing.two,
    paddingVertical:   Spacing.two + 2,
    paddingHorizontal: Spacing.two,
    borderRadius:      Radius.lg,
    borderWidth:       1,
  },

  iconWrap: {
    width:           40,
    height:          40,
    borderRadius:    20,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },

  rowContent: { flex: 1, gap: 2 },
  rowTop:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle:   { flex: 1, fontSize: 13 },
  unreadDot:  { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  rowBody:    { fontSize: 12, lineHeight: 17 },
  rowTime:    { fontSize: 10, marginTop: 2 },

  empty:     { alignItems: 'center', paddingTop: Spacing.six, gap: Spacing.two },
  emptyIcon: {
    width: 68, height: 68, borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.one,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub:   { fontSize: 13 },
});
