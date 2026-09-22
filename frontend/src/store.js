import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set) => ({
      user: null,
      boxes: [],
      setUser: (user) => set({ user }),
      setBoxes: (boxes) => set({ boxes }),
      updateCoins: (amount) => set((state) => ({
        user: state.user ? { ...state.user, coins: state.user.coins + amount } : null
      })),
      logout: () => set({ user: null }),
    }),
    {
      name: 'luka-user', // localStorage key
      partialize: (state) => ({ user: state.user }), // 只持久化 user，不持久化 boxes
    }
  )
);
