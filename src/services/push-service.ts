/**
 * OneSignal push notification wrapper.
 *
 * Devices are targeted server-side by "external user id" (OneSignal.login),
 * not by storing player/subscription ids ourselves — see
 * ruxstar-backend-services/utils/onesignal.js.
 *
 * Notification-tap deep-linking is resolved from the CURRENT session's role,
 * never from the tapped notification's payload — a stale notification tapped
 * after a different user has logged in on the same device must only ever
 * navigate within that new user's own role, never the original recipient's.
 * See AuthGuard's cross-group correction in app/_layout.tsx for the second
 * layer of the same guarantee, and every API call's JWT scoping for the third.
 */

import { router } from 'expo-router';
import { ONESIGNAL_APP_ID } from '@/constants/config';
import { useAuthStore, setPendingLoginRoute } from '@/stores/auth-store';

// OneSignal is a native-only module — not available in Expo Go or web.
// Lazy-require so a missing native binary degrades to no-ops instead of
// crashing the entire app at startup.
let OneSignal: typeof import('react-native-onesignal').OneSignal | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  OneSignal = require('react-native-onesignal').OneSignal;
} catch {
  // Native module unavailable — push notifications silently disabled.
}

let initialized = false;

// Flips true once expo-router's navigator is mounted (AuthGuard sets this the
// same moment it sets its own isNavReady state). Cold-start notification taps
// fire the click listener before this is true, so we must not call
// router.push() yet — queue via the same pendingLoginRoute mechanism AuthGuard
// already consumes once ready.
let navReady = false;
export function setPushNavReady(ready: boolean) {
  navReady = ready;
}

type NotificationData = { kind?: string; orderId?: string } & Record<string, unknown>;

// Maps a notification's `data.kind` to a destination *within the current
// user's own role*. Unknown kinds resolve to null — falling back to whatever
// screen the user is already on rather than a broken/mismatched route.
function resolveDeepLinkRoute(data: NotificationData, role: string | null): string | null {
  switch (data?.kind) {
    case 'pod':
      return role === 'vendor' ? '/(vendor)/orders' : '/(user)/orders';
    default:
      return null;
  }
}

function handleNotificationOpened(data: NotificationData) {
  const { isAuthenticated, role } = useAuthStore.getState();
  // No session yet (app opened cold, not logged in) — nothing to deep-link
  // into; AuthGuard's normal welcome/login flow takes over.
  if (!isAuthenticated) return;

  const route = resolveDeepLinkRoute(data, role);
  if (!route) return;

  if (navReady) {
    router.push(route as never);
  } else {
    setPendingLoginRoute(route);
  }
}

/** Call once at app start, before login/logout are used. */
export function initPushService() {
  if (initialized || !ONESIGNAL_APP_ID || !OneSignal) return;
  initialized = true;

  OneSignal.initialize(ONESIGNAL_APP_ID);

  // Registered immediately after initialize() so a cold-start tap (app was
  // killed, user tapped the OS notification) is still delivered — the SDK
  // buffers it until a listener exists.
  OneSignal.Notifications.addEventListener('click', (event) => {
    const data = (event?.notification?.additionalData ?? {}) as NotificationData;
    handleNotificationOpened(data);
  });

  OneSignal.Notifications.requestPermission(true);
}

/** Link this device to the logged-in user so the backend can target it. */
export function pushLogin(userId: string) {
  if (!initialized || !userId || !OneSignal) return;
  OneSignal.login(String(userId));
}

/** Unlink the device on logout so the next user on this device doesn't inherit it. */
export function pushLogout() {
  if (!initialized || !OneSignal) return;
  OneSignal.logout();
  // Best-effort: clears this user's delivered notifications from the OS tray
  // so a later session on the same device can't tap a stale one. iOS limits
  // programmatic clearing, so this is a courtesy, not a guarantee — the role-
  // scoped route resolution above is the real safety net.
  try {
    OneSignal.Notifications.clearAll();
  } catch {
    // no-op — best effort only
  }
}
