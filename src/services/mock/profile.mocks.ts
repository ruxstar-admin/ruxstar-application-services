import type { NotificationPrefs } from '@/types/profile';
import { defineMocks } from './registry';

let prefs: NotificationPrefs = { orders: true, messages: true, social: false, work: true, digest: false };

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

  'POST /account/export': { mocked: true, latencyMs: 600, handle: () => ({ message: 'We will email your data within 24 hours.' }) },

  'POST /account/pause': { mocked: true, handle: () => ({ message: 'Account paused' }) },
});
