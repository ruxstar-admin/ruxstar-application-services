import type { BlockedUser, NotificationPrefs } from '@/types/profile';
import { defineMocks } from './registry';

let prefs: NotificationPrefs = { orders: true, messages: true, social: false, work: true, digest: false };

let blocked: BlockedUser[] = [
  { id: 'u-rahul', name: 'Rahul Verma', username: 'rahul.v' },
  { id: 'u-meera', name: 'Meera Joshi', username: 'meera.j' },
];

const field = (body: Record<string, unknown> | undefined, key: string) => String(body?.[key] ?? '');

defineMocks({
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
});
