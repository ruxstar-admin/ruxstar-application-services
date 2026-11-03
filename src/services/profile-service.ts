import { apiDelete, apiGet, apiPatch, apiPost, apiPutBytes } from '@/lib/api-client';
import { timeAgo } from '@/lib/time';
import type { AuthUser } from '@/types/auth';
import type {
  BlockedUser,
  NotificationPrefs,
  Profile,
  ProfileBadge,
  ProfileUpdate,
  PublicProfileResponse,
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

const monthYear = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
const badgesOf = ({ vendor, delivery }: { vendor: boolean; delivery: boolean }): ProfileBadge[] => [
  'user',
  ...(vendor ? ['vendor' as const] : []),
  ...(delivery ? ['delivery' as const] : []),
];

/** Rating arrives with reviews; until then it is null. */
const toProfile = (user: AuthUser): Profile => ({
  id: user.id,
  name: user.name,
  username: user.username,
  avatarUrl: user.avatarUrl ?? undefined,
  bio: user.bio ?? '',
  email: user.email ?? '',
  emailVerified: user.emailVerified,
  city: user.city ?? '',
  gender: user.gender ?? undefined,
  posts: user.stats?.posts ?? 0,
  engagements: user.stats?.engagements ?? 0,
  rating: null,
  memberSince: monthYear(user.createdAt),
  badges: badgesOf(user.roles),
});

const fromPublic = (p: PublicProfileResponse): Profile => ({
  id: p.id,
  name: p.name,
  username: p.username,
  avatarUrl: p.avatarUrl ?? undefined,
  bio: p.bio ?? '',
  email: '',
  emailVerified: false,
  city: p.city ?? '',
  posts: p.stats?.posts ?? 0,
  engagements: p.stats?.engagements ?? 0,
  rating: null,
  memberSince: monthYear(p.memberSince),
  badges: badgesOf(p.badges),
});

/** Empty strings clear a field, which the API takes as null. */
const toPatch = ({ email, bio, city, ...rest }: ProfileUpdate) => ({
  ...rest,
  ...(email !== undefined ? { email: email || null } : {}),
  ...(bio !== undefined ? { bio: bio || null } : {}),
  ...(city !== undefined ? { city: city || null } : {}),
});

const lastActive = (session: ApiSession) => {
  if (session.current) return 'Active now';
  const ago = timeAgo(session.lastSeenAt);
  if (ago === 'now') return 'Active now';
  return /\d[mhd]$/.test(ago) ? `Active ${ago} ago` : `Active ${ago}`;
};

/**
 * Profiles, photos and devices are `/v1/account`. Settings and moderation have no backend yet and
 * are mocked (profile.mocks.ts).
 */
export const ProfileService = {
  getMe: async (token: string) => toProfile(await apiGet<AuthUser>('/v1/account/me', token)),
  update: async (token: string, changes: ProfileUpdate) => toProfile(await apiPatch<AuthUser>('/v1/account/me', toPatch(changes), token)),
  /** Someone's public profile, by username or user id. */
  getUser: async (token: string, ref: string) =>
    fromPublic(await apiGet<PublicProfileResponse>(`/v1/account/profiles/${encodeURIComponent(ref)}`, token)),
  /** People whose username, or a word of whose name, starts with `q`; the newest members without `q`. Never includes you. */
  search: async (token: string, q?: string) =>
    (await apiGet<PublicProfileResponse[]>('/v1/account/profiles', token, { q })).map(fromPublic),
  /** A JPEG the app has already shrunk. The API crops it square and stores a WebP. */
  setPhoto: async (token: string, jpeg: Uint8Array<ArrayBuffer>) =>
    toProfile(await apiPutBytes<AuthUser>('/v1/account/me/photo', { data: jpeg, type: 'image/jpeg' }, token)),
  removePhoto: async (token: string) => toProfile(await apiDelete<AuthUser>('/v1/account/me/photo', token)),

  sendEmailCode: (token: string) =>
    apiPost<{ sentTo: string; expiresInSeconds: number; resendInSeconds: number }>('/v1/account/email/code', undefined, token),
  verifyEmail: async (token: string, code: string) => toProfile(await apiPost<AuthUser>('/v1/account/email/verify', { code }, token)),
  /** `attribution` must be shown wherever a looked-up city is shown. */
  cityAt: (token: string, lat: number, lng: number) =>
    apiGet<{ city: string | null; attribution: string }>('/v1/account/city', token, { lat, lng }),
  /** Signs out every other device. */
  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    apiPost<{ done: true }>('/v1/account/password', { currentPassword, newPassword }, token),

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
  deleteAccount: (token: string, password: string) => apiDelete<{ done: true }>('/v1/account/me', token, { password }),
};
