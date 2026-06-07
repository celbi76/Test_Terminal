import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_INDICES = [
  { ticker: 'SPY', label: 'S&P 500' },
  { ticker: 'QQQ', label: 'Nasdaq' },
  { ticker: 'GLD', label: 'Gold' },
  { ticker: 'BTC-USD', label: 'Bitcoin' },
]

const usePortfolioStore = create(
  persist(
    (set, get) => ({
      positions: [],
      watchlist: [],
      selectedTicker: null,
      marketIndices: DEFAULT_INDICES,

      addPosition: (position) =>
        set((state) => ({
          positions: [
            ...state.positions,
            { id: crypto.randomUUID(), assetType: 'stock', ...position, addedAt: new Date().toISOString() },
          ],
        })),

      updatePosition: (id, updates) =>
        set((state) => ({
          positions: state.positions.map((p) => p.id === id ? { ...p, ...updates } : p),
        })),

      removePosition: (id) =>
        set((state) => ({ positions: state.positions.filter((p) => p.id !== id) })),

      addToWatchlist: (ticker) =>
        set((state) => ({
          watchlist: state.watchlist.includes(ticker) ? state.watchlist : [...state.watchlist, ticker],
        })),

      removeFromWatchlist: (ticker) =>
        set((state) => ({ watchlist: state.watchlist.filter((t) => t !== ticker) })),

      setSelectedTicker: (ticker) => set({ selectedTicker: ticker }),
      getPosition: (id) => get().positions.find((p) => p.id === id),

      addMarketIndex: (ticker, label) =>
        set((state) => ({
          marketIndices: state.marketIndices.some((i) => i.ticker === ticker)
            ? state.marketIndices
            : [...state.marketIndices, { ticker, label: label || ticker }],
        })),

      removeMarketIndex: (ticker) =>
        set((state) => ({ marketIndices: state.marketIndices.filter((i) => i.ticker !== ticker) })),
    }),
    { name: 'portfolio-storage' }
  )
)

export default usePortfolioStore
