import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const usePortfolioStore = create(
  persist(
    (set, get) => ({
      positions: [],
      watchlist: [],
      selectedTicker: null,

      addPosition: (position) =>
        set((state) => ({
          positions: [
            ...state.positions,
            {
              id: crypto.randomUUID(),
              ...position,
              addedAt: new Date().toISOString(),
            },
          ],
        })),

      updatePosition: (id, updates) =>
        set((state) => ({
          positions: state.positions.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      removePosition: (id) =>
        set((state) => ({
          positions: state.positions.filter((p) => p.id !== id),
        })),

      addToWatchlist: (ticker) =>
        set((state) => ({
          watchlist: state.watchlist.includes(ticker)
            ? state.watchlist
            : [...state.watchlist, ticker],
        })),

      removeFromWatchlist: (ticker) =>
        set((state) => ({
          watchlist: state.watchlist.filter((t) => t !== ticker),
        })),

      setSelectedTicker: (ticker) => set({ selectedTicker: ticker }),

      getPosition: (id) => get().positions.find((p) => p.id === id),
    }),
    {
      name: 'portfolio-storage',
    }
  )
)

export default usePortfolioStore
