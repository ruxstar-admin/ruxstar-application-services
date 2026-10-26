import { ApiError } from '@/lib/api-error';
import type { BlockedUser, NotificationPrefs, Profile, Session } from '@/types/profile';
import { defineMocks } from './registry';

const me: Profile = {
  id: 'me',
  name: '',
  username: 'you.ster',
  bio: 'Learning pottery on weekends. Printing assignments on weekdays.',
  link: '',
  posts: 11,
  engagements: 4,
  rating: null,
  memberSince: 'Sep 2026',
  badges: ['user'],
  email: '',
};

const others: Record<string, Profile> = {
  'priya-nair': {
    id: 'priya-nair',
    name: 'Priya Nair',
    username: 'priya.star',
    bio: 'Teaching pottery since 2019. Batch 4 is running now.',
    link: '',
    posts: 38,
    engagements: 112,
    rating: 4.8,
    memberSince: 'Mar 2025',
    badges: ['user', 'vendor', 'trainer'],
    email: '',
  },
};

let sessions: Session[] = [
  { id: 's1', device: 'This phone', location: 'Hyderabad, IN', lastActive: 'Active now', current: true },
  { id: 's2', device: 'Chrome on Windows', location: 'Hyderabad, IN', lastActive: '2 days ago', current: false },
  { id: 's3', device: 'iPad', location: 'Bengaluru, IN', lastActive: '12 days ago', current: false },
];

let prefs: NotificationPrefs = { orders: true, messages: true, social: false, work: true, digest: false };

let blocked: BlockedUser[] = [
  { id: 'u-rahul', name: 'Rahul Verma', username: 'rahul.v' },
  { id: 'u-meera', name: 'Meera Joshi', username: 'meera.j' },
];

/** Called by other mocks when an approval grants a role (e.g. KYC approval). */
export const addProfileBadge = (badge: Profile['badges'][number]) => {
  if (!me.badges.includes(badge)) me.badges = [...me.badges, badge];
};

const field = (body: Record<string, unknown> | undefined, key: string) => String(body?.[key] ?? '');

defineMocks({
  'GET /profile/me': { mocked: true, latencyMs: 300, handle: () => ({ ...me }) },

  'POST /profile/update': {
    mocked: true,
    handle: ({ body }) => {
      Object.assign(me, body);
      return { ...me };
    },
  },

  'POST /users/profile': {
    mocked: true,
    handle: ({ body }) => {
      const found = others[field(body, 'userId')];
      if (!found) throw new ApiError(404, 'User not found');
      return { ...found };
    },
  },

  'GET /profile/sessions': { mocked: true, handle: () => sessions.map((s) => ({ ...s })) },

  'POST /profile/sessions/revoke': {
    mocked: true,
    handle: ({ body }) => {
      sessions = sessions.filter((s) => s.id !== field(body, 'id') || s.current);
      return { message: 'Session ended' };
    },
  },

  'GET /settings/notifications': { mocked: true, handle: () => ({ ...prefs }) },

  'POST /settings/notifications': {
    mocked: true,
    latencyMs: 150,
    handle: ({ body }) => {
      prefs = { ...prefs, ...body };
      return { ...prefs };
    },
  },

  'GET /settings/blocked': { mocked: true, handle: () => blocked.map((b) => ({ ...b })) },

  'POST /users/unblock': {
    mocked: true,
    handle: ({ body }) => {
      blocked = blocked.filter((b) => b.id !== field(body, 'userId'));
      return { message: 'Unblocked' };
    },
  },

  'POST /users/block': {
    mocked: true,
    handle: ({ body }) => {
      const userId = field(body, 'userId');
      if (!blocked.some((b) => b.id === userId)) {
        blocked = [...blocked, { id: userId, name: field(body, 'name'), username: field(body, 'username') }];
      }
      return { message: 'Blocked' };
    },
  },

  'POST /users/report': { mocked: true, handle: () => ({ message: 'Report received' }) },

  'POST /account/export': { mocked: true, latencyMs: 600, handle: () => ({ message: 'We will email your data within 24 hours.' }) },

  'POST /account/pause': { mocked: true, handle: () => ({ message: 'Account paused' }) },

  'POST /account/delete': { mocked: true, latencyMs: 600, handle: () => ({ message: 'Deletion scheduled' }) },
});
