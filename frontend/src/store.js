import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set) => ({
      user: null,
      boxes: [],
      // 平台币 + 多法币
      currency: {
        // 平台币
        name: '钻石',
        symbol: '💎',
        shortName: 'DIAMOND',
        enabled: true,
        // 多法币列表
        fiats: [],
        // 系统默认币种代码
        defaultCode: 'USD',
      },
      setUser: (user) => set({ user }),
      setBoxes: (boxes) => set({ boxes }),
      setCurrency: (currency) => set({
        currency: {
          // 保留平台币字段
          name: currency.name ?? currency.platform?.name ?? '钻石',
          symbol: currency.symbol ?? currency.platform?.symbol ?? '💎',
          shortName: currency.shortName ?? currency.platform?.shortName ?? 'DIAMOND',
          enabled: currency.enabled ?? currency.platform?.enabled ?? true,
          // 多法币
          fiats: currency.fiats || [],
          defaultCode: currency.defaultCode || 'USD',
        },
      }),
      updateCoins: (amount) => set((state) => ({
        user: state.user ? { ...state.user, coins: state.user.coins + amount } : null
      })),
      logout: () => set({ user: null }),
    }),
    {
      name: 'luka-user',
      partialize: (state) => ({ user: state.user }), // 只持久化 user
    }
  )
);
