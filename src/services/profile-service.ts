import { apiGet, apiPost } from '@/lib/api-client';
import type {
  BlockedUser,
  NotificationPrefs,
  Profile,
  ProfileUpdate,
  ReportReason,
  Session,
} from '@/types/profile';

type Message = { message: string };

/** Profile, settings and user-moderation endpoints. None exist in the backend yet — all mocked (profile.mocks.ts). */
export const ProfileService = {
  getMe: (token: string) => apiGet<Profile>('/profile/me', token),
  update: (token: string, changes: ProfileUpdate) => apiPost<Profile>('/profile/update', changes, token),
  getUser: (token: string, userId: string) => apiPost<Profile>('/users/profile', { userId }, token),

  getSessions: (token: string) => apiGet<Session[]>('/profile/sessions', token),
  endSession: (token: string, id: string) => apiPost<Message>('/profile/sessions/revoke', { id }, token),

  getNotificationPrefs: (token: string) => apiGet<NotificationPrefs>('/settings/notifications', token),
  setNotificationPrefs: (token: string, prefs: Partial<NotificationPrefs>) =>
    apiPost<NotificationPrefs>('/settings/notifications', prefs, token),

  getBlocked: (token: string) => apiGet<BlockedUser[]>('/settings/blocked', token),
  unblock: (token: string, userId: string) => apiPost<Message>('/users/unblock', { userId }, token),
  block: (token: string, user: { userId: string; name: string; username: string }) =>
    apiPost<Message>('/users/block', user, token),
  report: (token: string, userId: string, reason: ReportReason) =>
    apiPost<Message>('/users/report', { userId, reason }, token),

  exportData: (token: string) => apiPost<Message>('/account/export', undefined, token),
  pauseAccount: (token: string) => apiPost<Message>('/account/pause', undefined, token),
  deleteAccount: (token: string) => apiPost<Message>('/account/delete', undefined, token),
};
