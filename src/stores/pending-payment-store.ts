/**
 * pending-payment-store — caches a Cashfree session on-device right after it's
 * issued, so the customer can resume that exact payment later from Orders.
 *
 * Bookings, event registrations, and creator bookings have no backend
 * "resume payment" endpoint (unlike commerce/POD orders, which do — those
 * just call their own /pay endpoint again). This store is the mobile-only
 * substitute: the paymentSessionId Cashfree already issued at booking time
 * is still usable for a while, so we just remember it on-device and let the
 * customer re-open the same session instead of losing it if the SDK call
 * fails, is cancelled, or the app is killed mid-payment.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PendingPaymentKind = 'booking' | 'event' | 'creator';

export type PendingPayment = {
  /** bookingId / registrationId / creator bookingId — matches the Orders list item. */
  id:               string;
  kind:             PendingPaymentKind;
  paymentSessionId: string;
  cashfreeOrderId?: string;
  mode?:            string;
  savedAt:          number;
};

interface PendingPaymentState {
  byId: Record<string, PendingPayment>;
  save:  (p: Omit<PendingPayment, 'savedAt'>) => void;
  clear: (id: string) => void;
}

export const usePendingPaymentStore = create<PendingPaymentState>()(
  persist(
    (set) => ({
      byId: {},

      save: (p) =>
        set((s) => ({ byId: { ...s.byId, [p.id]: { ...p, savedAt: Date.now() } } })),

      clear: (id) =>
        set((s) => {
          if (!(id in s.byId)) return s;
          const next = { ...s.byId };
          delete next[id];
          return { byId: next };
        }),
    }),
    {
      name:    'ruxstar_pending_payments',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
