import { create } from 'zustand';

export const useStore = create((set) => ({
  user: null,
  boxes: [],
  setUser: (user) => set({ user }),
  setBoxes: (boxes) => set({ boxes }),
  updateCoins: (amount) => set((state) => ({
    user: state.user ? { ...state.user, coins: state.user.coins + amount } : null
  })),
}));
