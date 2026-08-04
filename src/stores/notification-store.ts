import { create } from 'zustand';
import type { AppNotification } from '@/types/print';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount:   number;
  lastFetched:   number;

  setResult:   (notifications: AppNotification[], unreadCount: number) => void;
  markOneRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount:   0,
  lastFetched:   0,

  setResult: (notifications, unreadCount) =>
    set({ notifications, unreadCount, lastFetched: Date.now() }),

  markOneRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
      unreadCount:   Math.max(0, s.unreadCount - 1),
    })),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount:   0,
    })),
}));
