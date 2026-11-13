import { useEffect } from 'react';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Brand } from '@/constants/theme';
import { notificationHref } from '@/features/social/lib/notification-target';
import { createLogger } from '@/lib/logger';
import { openChat } from '@/lib/open-chat';
import { ProfileService } from '@/services/profile-service';
import { notificationLink, SocialService } from '@/services/social-service';
import { useAuthStore } from '@/stores/auth-store';

const log = createLogger('push');

/** Expo Go on Android can't receive remote notifications since SDK 53, and the web has none. */
const canReceive = Platform.OS !== 'web' && !(Platform.OS === 'android' && isRunningInExpoGo());

/** New messages show even with the app open, except those for the chat on screen. */
export function initPushNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const { chatId } = notification.request.content.data ?? {};
      const show = !(typeof chatId === 'string' && chatId === openChat());
      return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
    },
  });
}

/** The channel ids must match what the API sends; people can silence each one in Android's settings. */
async function createChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: Brand.primary,
  });
  await Notifications.setNotificationChannelAsync('activity', {
    name: 'Likes, follows and orders',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: Brand.primary,
  });
}

/** Asks once, then sends this install's token to the API. Says nothing if the person said no. */
async function register() {
  await createChannels();
  let { granted, canAskAgain } = await Notifications.getPermissionsAsync();
  if (!granted && canAskAgain) ({ granted } = await Notifications.requestPermissionsAsync());
  if (!granted) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = useAuthStore.getState().token;
  if (token) await ProfileService.registerDevice(token, pushToken);
}

/** Registers for phone notifications once signed in, and opens what a tapped one is about. `ready` once navigation can run. */
export function usePushNotifications(ready: boolean) {
  const router = useRouter();
  const userId = useAuthStore((s) => (s.isAuthenticated ? s.userId : null));
  const tapped = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!canReceive || !ready || !userId) return;
    register().catch((err: unknown) => log.warn('Push registration failed', { message: (err as Error).message }));
  }, [ready, userId]);

  useEffect(() => {
    if (!ready || !userId || !tapped || tapped.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    Notifications.clearLastNotificationResponse();
    const data = tapped.notification.request.content.data ?? {};
    const text = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : undefined);

    const chatId = text('chatId');
    if (chatId) {
      if (chatId !== openChat()) router.push({ pathname: '/(customer)/chat/[id]', params: { id: chatId } });
      return;
    }
    const notificationId = text('notificationId');
    const screen = text('screen');
    const id = text('id');
    const token = useAuthStore.getState().token;
    if (notificationId && token) SocialService.markRead(token, notificationId).catch(() => undefined);
    const href = screen && id ? notificationHref(notificationLink(screen, id)) : undefined;
    router.push(href ?? '/(customer)/notifications');
  }, [ready, userId, tapped, router]);
}
