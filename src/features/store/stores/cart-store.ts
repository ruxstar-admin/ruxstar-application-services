import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from '@/stores/auth-store';
import type { Cart } from '../lib/cart';

interface CartState {
  /** One cart per account on this phone, so signing in as someone else never shows theirs. */
  carts: Record<string, Cart>;
  setCart: (userId: string, cart: Cart | null) => void;
}

/** The local shop cart, kept on the phone; the API has no cart. */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      carts: {},
      setCart: (userId, cart) =>
        set((state) => {
          const carts = { ...state.carts };
          if (cart) carts[userId] = cart;
          else delete carts[userId];
          return { carts };
        }),
    }),
    { name: 'ruxstar_store_cart', storage: createJSONStorage(() => AsyncStorage), partialize: (state) => ({ carts: state.carts }) },
  ),
);

/** The signed-in person's cart and a setter for it. */
export function useCart(): { cart: Cart | null; setCart: (cart: Cart | null) => void } {
  const userId = useAuthStore((s) => s.userId) ?? '';
  const cart = useCartStore((s) => s.carts[userId] ?? null);
  const save = useCartStore((s) => s.setCart);
  return { cart, setCart: (next) => save(userId, next) };
}
