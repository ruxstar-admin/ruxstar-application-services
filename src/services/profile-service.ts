import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { timeAgo } from '@/lib/time';
import type { AuthUser } from '@/types/auth';
import type {
  BlockedUser,
  NotificationPrefs,
  Profile,
  ProfileBadge,
  ProfileUpdate,
  ReportReason,
  Session,
} from '@/types/profile';

type Message = { message: string };

interface ApiSession {
  id: string;
  client: 'web' | 'app' | 'delivery';
  label: string;
  current: boolean;
  lastSeenAt: string;
  createdAt: string;
}

/** Posts, engagements and rating arrive with the social module; until then they read as zero. */
const toProfile = (user: AuthUser): Profile => ({
  id: user.id,
  name: user.name,
  username: user.username,
  bio: user.bio ?? '',
  link: user.link ?? '',
  email: user.email ?? '',
  gender: user.gender ?? undefined,
  posts: 0,
  engagements: 0,
  rating: null,
  memberSince: new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
  badges: ['user', ...(user.roles.vendor ? ['vendor' as ProfileBadge] : []), ...(user.roles.delivery ? ['delivery' as ProfileBadge] : [])],
});

/** Empty strings clear a field, which the API takes as null. */
const toPatch = ({ email, bio, link, ...rest }: ProfileUpdate) => ({
  ...rest,
  ...(email !== undefined ? { email: email || null } : {}),
  ...(bio !== undefined ? { bio: bio || null } : {}),
  ...(link !== undefined ? { link: link || null } : {}),
});

const lastActive = (session: ApiSession) => {
  if (session.current) return 'Active now';
  const ago = timeAgo(session.lastSeenAt);
  if (ago === 'now') return 'Active now';
  return /\d[mhd]$/.test(ago) ? `Active ${ago} ago` : `Active ${ago}`;
};

/**
 * Your own profile and devices are `/v1/account`. Other people's profiles, settings and moderation
 * have no backend yet and are mocked (profile.mocks.ts).
 */
export const ProfileService = {
  getMe: async (token: string) => toProfile(await apiGet<AuthUser>('/v1/account/me', token)),
  update: async (token: string, changes: ProfileUpdate) => toProfile(await apiPatch<AuthUser>('/v1/account/me', toPatch(changes), token)),
  getUser: (token: string, userId: string) => apiPost<Profile>('/users/profile', { userId }, token),

  getSessions: async (token: string): Promise<Session[]> =>
    (await apiGet<ApiSession[]>('/v1/account/sessions', token)).map((s) => ({
      id: s.id,
      device: s.client === 'web' ? `${s.label} (website)` : s.label,
      lastActive: lastActive(s),
      current: s.current,
    })),
  endSession: (token: string, id: string) => apiDelete<{ done: true }>(`/v1/account/sessions/${encodeURIComponent(id)}`, token),

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
