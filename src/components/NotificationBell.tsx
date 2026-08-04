/**
 * NotificationBell — bell icon with unread badge, used in shell headers.
 * Reads shared state from notification-store; fetches on every focus so
 * the count stays in sync without a throttle.
 */

import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';
import { useNotificationStore } from '@/stores/notification-store';
import { listNotifications } from '@/services/print-service';

interface Props {
  token:    string;
  pageHref: string;
}

const createStyles = (brand: BrandTokens) => StyleSheet.create({
  btn: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: brand.surface1,
    borderWidth:     1,
    borderColor:     brand.border1,
    alignItems:      'center',
    justifyContent:  'center',
  },
  btnPressed: { opacity: 0.7 },

  badge: {
    position:          'absolute',
    top:               -2,
    right:             -2,
    minWidth:          16,
    height:            16,
    borderRadius:      Radius.pill,
    backgroundColor:   brand.success,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize:   9,
    fontWeight: '800',
    color:      '#fff',
    lineHeight: 11,
  },
});

export function NotificationBell({ token, pageHref }: Props) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const setResult   = useNotificationStore((s) => s.setResult);

  const fetchCount = useCallback(async () => {
    try {
      const result = await listNotifications(token);
      setResult(result.notifications, result.unreadCount);
    } catch {
      // silent — bell is non-critical
    }
  }, [token, setResult]);

  useFocusEffect(useCallback(() => { void fetchCount(); }, [fetchCount]));

  return (
    <Pressable
      style={({ pressed }) => [s.btn, pressed && s.btnPressed]}
      onPress={() => router.push(pageHref as never)}
      accessibilityLabel="Notifications"
      accessibilityRole="button"
    >
      <Ionicons
        name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
        size={19}
        color={brand.cream}
      />
      {unreadCount > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
        </View>
      )}
    </Pressable>
  );
}
