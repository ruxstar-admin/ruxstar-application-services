import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Linking, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter } from 'expo-router';
import type { NotificationClickEvent, NotificationWillDisplayEvent } from 'react-native-onesignal';
import { notificationHref } from '@/features/social/lib/notification-target';
import { createLogger } from '@/lib/logger';
import { openChat } from '@/lib/open-chat';
import { ProfileService } from '@/services/profile-service';
import { notificationLink, SocialService } from '@/services/social-service';
import { useAuthStore } from '@/stores/auth-store';

type OneSignalModule = typeof import('react-native-onesignal');
type OneSignal = OneSignalModule['OneSignal'];
type Data = Record<string, unknown>;

const APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;
const log = createLogger('push');

let oneSignal: OneSignal | null | undefined;

/**
 * OneSignal has a native module, which Expo Go doesn't ship, and the web gets no phone notifications. It is
 * therefore loaded lazily, never in Expo Go, and any failure leaves notifications off rather than breaking the app.
 */
const getOneSignal = (): OneSignal | null => {
  if (oneSignal !== undefined) return oneSignal;
  oneSignal = null;
  if (!APP_ID || Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    oneSignal = (require('react-native-onesignal') as OneSignalModule).OneSignal;
  } catch {
    oneSignal = null;
  }
  return oneSignal;
};

/** A tapped notification waits here until navigation is ready and someone is signed in. */
let tapped: Data | null = null;
const tapListeners = new Set<() => void>();
const setTapped = (data: Data | null) => {
  tapped = data;
  tapListeners.forEach((listener) => listener());
};
const subscribeToTaps = (listener: () => void) => {
  tapListeners.add(listener);
  return () => tapListeners.delete(listener);
};

/** The install id last sent to the API, per account, so it is sent once. */
let sent: string | null = null;

const sendDevice = async (subscriptionId: string) => {
  const { token, userId } = useAuthStore.getState();
  if (!token || !userId || sent === `${userId}:${subscriptionId}`) return;
  await ProfileService.registerDevice(token, subscriptionId);
  sent = `${userId}:${subscriptionId}`;
};

/** Starts OneSignal. New messages show even with the app open, except those for the chat on screen. */
export function initPushNotifications() {
  const os = getOneSignal();
  if (!os) return;
  try {
    if (__DEV__) os.Debug.setLogLevel(5);
    os.initialize(APP_ID!);
    os.Notifications.addEventListener('foregroundWillDisplay', (event: NotificationWillDisplayEvent) => {
      const { chatId } = (event.getNotification().additionalData ?? {}) as Data;
      if (typeof chatId === 'string' && chatId === openChat()) event.preventDefault();
    });
    os.Notifications.addEventListener('click', (event: NotificationClickEvent) =>
      setTapped((event.notification.additionalData ?? {}) as Data),
    );
    os.User.pushSubscription.addEventListener('change', ({ current }) => {
      log.info('Push subscription changed', { hasId: !!current.id, optedIn: current.optedIn });
      if (current.id) sendDevice(current.id).catch((err: unknown) => log.warn('Push registration failed', { message: (err as Error).message }));
    });
    // Allowed later, from the Settings switch or the phone's own settings: opt this install in and send its id.
    os.Notifications.addEventListener('permissionChange', (granted: boolean) => {
      if (granted) syncDevice(os).catch((err: unknown) => log.warn('Push registration failed', { message: (err as Error).message }));
    });
  } catch (err) {
    oneSignal = null;
    log.warn('OneSignal did not start', { message: (err as Error).message });
  }
}

/**
 * Opts this install in once the phone allows notifications (an install that was denied earlier stays opted out
 * until told otherwise), then tells the API its id. The id can still be null here: the change listener sends it later.
 */
async function syncDevice(os: OneSignal) {
  const allowed = await os.Notifications.getPermissionAsync();
  if (allowed && !(await os.User.pushSubscription.getOptedInAsync())) os.User.pushSubscription.optIn();
  const id = await os.User.pushSubscription.getIdAsync();
  log.info('Push status', { allowed, hasId: !!id });
  if (id) await sendDevice(id);
}

/** Asks once, then tells the API which install this is. Says nothing if the person said no. */
async function register(os: OneSignal, userId: string) {
  os.login(userId);
  if (!(await os.Notifications.getPermissionAsync()) && (await os.Notifications.canRequestPermission())) {
    await os.Notifications.requestPermission(false);
  }
  await syncDevice(os);
}

/** Whether the phone lets this app show notifications; null where push isn't available (Expo Go, web, no OneSignal id). */
export async function pushAllowed(): Promise<boolean | null> {
  const os = getOneSignal();
  if (!os) return null;
  try {
    return await os.Notifications.getPermissionAsync();
  } catch {
    return null;
  }
}

/**
 * The Settings switch. The system dialog can only be shown until it has been answered once, so after a "Don't allow"
 * (or to turn them off) the person is sent to the phone's notification settings for this app instead.
 */
export async function changePushPermission(): Promise<void> {
  const os = getOneSignal();
  if (os && !(await os.Notifications.getPermissionAsync()) && (await os.Notifications.canRequestPermission())) {
    await os.Notifications.requestPermission(false);
    return;
  }
  await Linking.openSettings();
}

/** Registers for phone notifications once signed in, and opens what a tapped one is about. `ready` once navigation can run. */
export function usePushNotifications(ready: boolean) {
  const router = useRouter();
  const userId = useAuthStore((s) => (s.isAuthenticated ? s.userId : null));
  const tap = useSyncExternalStore(subscribeToTaps, () => tapped);
  const signedIn = useRef(false);

  useEffect(() => {
    const os = getOneSignal();
    if (!os || !ready) return;
    if (!userId) {
      if (signedIn.current) os.logout();
      signedIn.current = false;
      sent = null;
      return;
    }
    signedIn.current = true;
    register(os, userId).catch((err: unknown) => log.warn('Push registration failed', { message: (err as Error).message }));
  }, [ready, userId]);

  useEffect(() => {
    if (!ready || !userId || !tap) return;
    setTapped(null);
    const text = (key: string) => (typeof tap[key] === 'string' ? (tap[key] as string) : undefined);

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
  }, [ready, userId, tap, router]);
}
